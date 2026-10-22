use super::content::get_projects;
use super::get::get;
use super::paths::get_full_path;
use crate::event::LoadingBarType;
use crate::event::emit::{emit_loading, init_loading};
use crate::pack::install_from::{
    EnvType, PackDependency, PackFile, PackFileHash, PackFormat,
};
use crate::state::content_store::{
    FileContent, ReadableContent, content_file_path, input,
    is_managed_content_path,
};
use crate::state::instances::adapters::sqlite::content_rows;
use crate::state::{
    CacheBehaviour, CachedEntry, InstanceMetadata, ModLoader, SideType, State,
    VersionEnvironment,
};
use crate::util::io::{self, IOError};
use futures::{StreamExt, stream};
use path_util::SafeRelativeUtf8UnixPathBuf;
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::io::{Read, Seek, Write};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

const DEFAULT_SELECTED_EXPORT_PATH_PREFIXES: &[&str] = &[
    "mods",
    "datapacks",
    "resourcepacks",
    "shaderpacks",
    "config",
];
const EXPORT_CANDIDATE_METADATA_CONCURRENCY: usize = 32;
const EXPORT_COPY_BUFFER_SIZE: usize = 256 * 1024;
const STANDARD_ZIP_FILE_SIZE_ERROR: &str = "Your modpack cannot be exported as it contains a file over the size limit of 4 GB";

const NEVER_EXPORTABLE_PATH_PREFIXES: &[&str] = &[
    "profile.json",
    "modrinth_logs",
    "mods/.connector",
    ".sable/natives",
    "local/crash_assistant",
    "mods/mcef-libraries",
    "mods/mcef-cache",
    "config/super_resolution/libraries",
    "config/Veinminer/update",
    "config/epicfight/native",
    "essential",
    ".mixin.out",
    ".fabric",
    "__MACOSX",
];
const NEVER_EXPORTABLE_PATH_SUFFIXES: &[&str] = &[".DS_Store"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackExportCandidate {
    pub path: SafeRelativeUtf8UnixPathBuf,
    #[serde(rename = "type")]
    pub kind: PackExportCandidateType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub count: Option<usize>,
    pub disabled: bool,
    pub default_selected: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PackExportCandidateType {
    Directory,
    File,
}

#[derive(Default)]
struct ExportSelectionNode {
    selected: Option<bool>,
    has_included_rule: bool,
    children: HashMap<String, ExportSelectionNode>,
}

#[derive(Default)]
struct ExportSelection {
    root: ExportSelectionNode,
}

impl ExportSelection {
    fn new(included_paths: Vec<String>, excluded_paths: Vec<String>) -> Self {
        let mut rules = HashMap::new();

        for (paths, selected) in
            [(included_paths, true), (excluded_paths, false)]
        {
            for path in paths {
                let Ok(path) = SafeRelativeUtf8UnixPathBuf::try_from(path)
                else {
                    continue;
                };
                if path.as_str().is_empty() || !is_path_exportable(&path) {
                    continue;
                }
                rules.insert(path.as_str().to_string(), selected);
            }
        }

        let mut selection = Self::default();
        for (path, selected) in rules {
            selection.root.insert(&path, selected);
        }
        selection
    }

    fn is_included(&self, path: &SafeRelativeUtf8UnixPathBuf) -> bool {
        self.resolve(path).0
    }

    fn should_visit_directory(
        &self,
        path: &SafeRelativeUtf8UnixPathBuf,
    ) -> bool {
        let (selected, node) = self.resolve(path);
        selected || node.is_some_and(|node| node.has_included_rule)
    }

    fn resolve(
        &self,
        path: &SafeRelativeUtf8UnixPathBuf,
    ) -> (bool, Option<&ExportSelectionNode>) {
        let mut node = &self.root;
        let mut selected = node.selected.unwrap_or(false);

        for segment in path.as_str().split('/') {
            let Some(child) = node.children.get(segment) else {
                return (selected, None);
            };
            node = child;
            selected = node.selected.unwrap_or(selected);
        }

        (selected, Some(node))
    }
}

impl ExportSelectionNode {
    fn insert(&mut self, path: &str, selected: bool) {
        if selected {
            self.has_included_rule = true;
        }

        let mut node = self;
        for segment in path.split('/') {
            node = node.children.entry(segment.to_string()).or_default();
            if selected {
                node.has_included_rule = true;
            }
        }
        node.selected = Some(selected);
    }
}

async fn validate_export_destination(
    state: &State,
    export_path: &Path,
) -> crate::Result<()> {
    let parent = export_path.parent().ok_or_else(|| {
        crate::state::content_store::input("Invalid export destination")
    })?;
    let parent = tokio::fs::canonicalize(parent).await?;
    let store = tokio::fs::canonicalize(state.directories.store_dir()).await?;
    let profiles =
        tokio::fs::canonicalize(state.directories.instances_dir()).await?;
    if parent.starts_with(store)
        || parent.starts_with(profiles)
        || tokio::fs::symlink_metadata(export_path)
            .await
            .is_ok_and(|metadata| metadata.file_type().is_symlink())
    {
        return Err(crate::state::content_store::input(
            "Export to a regular file outside the store and instance directories",
        ));
    }

    Ok(())
}

async fn collect_export_files(
    state: &State,
    instance_id: &str,
    instance_base_path: &Path,
    export_selection: &ExportSelection,
    excluded_paths: &HashSet<String>,
) -> crate::Result<Vec<(ReadableContent, SafeRelativeUtf8UnixPathBuf, u64)>> {
    let stored_files =
        content_rows::get_instance_files(instance_id, &state.pool)
            .await?
            .into_iter()
            .map(|file| (content_file_path(&file), file))
            .collect::<HashMap<_, _>>();
    let mut export_files = Vec::new();
    let mut directories = vec![instance_base_path.to_path_buf()];

    while let Some(directory) = directories.pop() {
        let mut read_dir = io::read_dir(&directory).await?;
        while let Some(entry) = read_dir
            .next_entry()
            .await
            .map_err(|error| IOError::with_path(error, &directory))?
        {
            let path = entry.path();
            let relative_path =
                pack_get_relative_path(instance_base_path, &path)?;
            if !is_path_exportable(&relative_path) {
                continue;
            }

            let file_type = entry
                .file_type()
                .await
                .map_err(|error| IOError::with_path(error, &path))?;
            if file_type.is_dir() {
                if export_selection.should_visit_directory(&relative_path) {
                    directories.push(path);
                }
                continue;
            }

            let logical_path = logical_content_path(&relative_path)?;
            if (!file_type.is_file() && !file_type.is_symlink())
                || !export_selection.is_included(&logical_path)
                || excluded_paths.contains(relative_path.as_str())
            {
                continue;
            }
            let Some(content) = export_content(
                state,
                stored_files.get(relative_path.as_str()),
                &path,
                file_type.is_symlink(),
            )
            .await?
            else {
                continue;
            };
            let size = tokio::fs::metadata(content.path()).await?.len();
            export_files.push((content, relative_path, size));
        }
    }

    Ok(export_files)
}

#[tracing::instrument(skip_all)]
pub async fn export_mrpack(
    instance_id: &str,
    export_path: PathBuf,
    included_export_candidates: Vec<String>,
    excluded_export_candidates: Vec<String>,
    version_id: Option<String>,
    description: Option<String>,
    _name: Option<String>,
) -> crate::Result<()> {
    let state = State::get().await?;
    validate_export_destination(&state, &export_path).await?;
    let _permit: tokio::sync::SemaphorePermit =
        state.io_semaphore.0.acquire().await?;
    let metadata = get(instance_id).await?.ok_or_else(|| {
        crate::ErrorKind::OtherError(format!(
            "Tried to export a nonexistent instance {instance_id}!"
        ))
    })?;
    let export_selection = ExportSelection::new(
        included_export_candidates,
        excluded_export_candidates,
    );

    let instance_base_path = get_full_path(instance_id).await?;
    let version_id = version_id.unwrap_or("1.0.0".to_string());
    let mut packfile =
        create_mrpack_json(&metadata, version_id, description).await?;
    packfile.files.retain(|f| {
        let logical = SafeRelativeUtf8UnixPathBuf::try_from(
            f.path.as_str().trim_end_matches(".disabled").to_string(),
        );
        is_path_exportable(&f.path)
            && logical.is_ok_and(|path| export_selection.is_included(&path))
    });
    let packfile_paths = packfile
        .files
        .iter()
        .map(|file| file.path.as_str().to_string())
        .collect::<HashSet<_>>();

    let override_files = collect_export_files(
        &state,
        instance_id,
        &instance_base_path,
        &export_selection,
        &packfile_paths,
    )
    .await?;
    for (_, _, size) in &override_files {
        ensure_standard_zip_file_size(*size)?;
    }

    let total_bytes = override_files
        .iter()
        .fold(1_u64, |total, (_, _, size)| total.saturating_add(*size));
    let loading_bar = init_loading(
        LoadingBarType::PackExport {
            instance_id: metadata.instance.id.clone(),
            instance_name: metadata.instance.name.clone(),
        },
        total_bytes as f64,
        "Exporting instance to .mrpack",
    )
    .await?;
    let data = serde_json::to_vec_pretty(&packfile)?;
    tokio::task::spawn_blocking(move || {
        let file = std::fs::File::create(&export_path)
            .map_err(|error| IOError::with_path(error, &export_path))?;
        write_mrpack_archive(file, override_files, &data, |bytes_written| {
            emit_loading(&loading_bar, bytes_written as f64, None)
        })
    })
    .await??;

    Ok(())
}

#[tracing::instrument(skip_all)]
pub async fn export_zip(
    instance_id: &str,
    export_path: PathBuf,
    included_export_candidates: Vec<String>,
    excluded_export_candidates: Vec<String>,
) -> crate::Result<()> {
    let state = State::get().await?;
    validate_export_destination(&state, &export_path).await?;
    let _permit: tokio::sync::SemaphorePermit =
        state.io_semaphore.0.acquire().await?;
    let metadata = get(instance_id).await?.ok_or_else(|| {
        crate::ErrorKind::OtherError(format!(
            "Tried to export a nonexistent instance {instance_id}!"
        ))
    })?;
    let export_selection = ExportSelection::new(
        included_export_candidates,
        excluded_export_candidates,
    );
    let instance_base_path = get_full_path(instance_id).await?;
    let export_files = collect_export_files(
        &state,
        instance_id,
        &instance_base_path,
        &export_selection,
        &HashSet::new(),
    )
    .await?;
    let total_bytes = export_files
        .iter()
        .fold(1_u64, |total, (_, _, size)| total.saturating_add(*size));
    let loading_bar = init_loading(
        LoadingBarType::PackExport {
            instance_id: metadata.instance.id.clone(),
            instance_name: metadata.instance.name.clone(),
        },
        total_bytes as f64,
        "Exporting instance to .zip",
    )
    .await?;

    tokio::task::spawn_blocking(move || {
        let file = std::fs::File::create(&export_path)
            .map_err(|error| IOError::with_path(error, &export_path))?;
        write_zip_archive(file, export_files, |bytes_written| {
            emit_loading(&loading_bar, bytes_written as f64, None)
        })
    })
    .await??;

    Ok(())
}

/// Export the instance the way Prism Launcher does: one zip containing the
/// whole instance folder as-is, plus the two metadata files Prism keeps in
/// every instance folder (`instance.cfg` and `mmc-pack.json`). Nothing is
/// filtered out and no selection is involved, so the archive is a faithful,
/// re-importable copy — Prism Launcher (and this launcher) can open it as a
/// complete instance.
///
/// With `clean` enabled the same archive is written, minus every trace of the
/// player who built the instance (see [`is_clean_export_excluded`]), so a
/// modpack can be handed to other players ready to play. Instance settings,
/// keybinds, mods and mod configs are kept untouched either way.
#[tracing::instrument(skip_all)]
pub async fn export_prism_instance_zip(
    instance_id: &str,
    export_path: PathBuf,
    clean: bool,
) -> crate::Result<()> {
    let state = State::get().await?;
    validate_export_destination(&state, &export_path).await?;
    let _permit: tokio::sync::SemaphorePermit =
        state.io_semaphore.0.acquire().await?;
    let metadata = get(instance_id).await?.ok_or_else(|| {
        crate::ErrorKind::OtherError(format!(
            "Tried to export a nonexistent instance {instance_id}!"
        ))
    })?;
    let instance_base_path = get_full_path(instance_id).await?;

    let icon = prism_icon_file(
        &metadata.instance.id,
        metadata.instance.icon_path.as_deref(),
    )
    .await;
    let icon_key = icon
        .as_ref()
        .map_or(PRISM_DEFAULT_ICON_KEY, |icon| icon.key.as_str());
    let instance_cfg = prism_instance_cfg(&metadata.instance.name, icon_key);
    let mmc_pack = prism_mmc_pack(&metadata.applied_content_set)?;
    let mut metadata_files = vec![
        (PRISM_INSTANCE_CFG.to_string(), instance_cfg.into_bytes()),
        (PRISM_MMC_PACK.to_string(), mmc_pack.into_bytes()),
    ];
    if let Some(icon) = icon {
        metadata_files.push((icon.file_name, icon.bytes));
    }

    let mut export_files = Vec::new();
    let mut directories = vec![instance_base_path.clone()];
    while let Some(directory) = directories.pop() {
        let mut read_dir = io::read_dir(&directory).await?;
        while let Some(entry) = read_dir
            .next_entry()
            .await
            .map_err(|error| IOError::with_path(error, &directory))?
        {
            let path = entry.path();
            let file_type = entry
                .file_type()
                .await
                .map_err(|error| IOError::with_path(error, &path))?;
            // Symlinks are skipped rather than followed: an exported instance
            // must never reach outside its own folder.
            if file_type.is_symlink() {
                continue;
            }
            if file_type.is_dir() {
                if clean {
                    let relative_path =
                        pack_get_relative_path(&instance_base_path, &path)?;
                    if is_clean_export_excluded(relative_path.as_str()) {
                        continue;
                    }
                }
                directories.push(path);
                continue;
            }
            let relative_path =
                pack_get_relative_path(&instance_base_path, &path)?;
            if relative_path.as_str() == PRISM_INSTANCE_CFG
                || relative_path.as_str() == PRISM_MMC_PACK
                || (clean && is_clean_export_excluded(relative_path.as_str()))
            {
                continue;
            }
            let size = entry
                .metadata()
                .await
                .map_err(|error| IOError::with_path(error, &path))?
                .len();
            ensure_standard_zip_file_size(size)?;
            // Prism Launcher and MultiMC keep the game files in a `.minecraft`
            // folder next to `instance.cfg`; an archive with the files at its
            // root imports as an empty instance there (and is rejected by this
            // launcher's own Prism importer with "missing Minecraft directory").
            export_files.push((
                path,
                format!("{PRISM_GAME_DIRECTORY}/{}", relative_path.as_str()),
                size,
            ));
        }
    }
    export_files.sort_by(|a, b| a.1.cmp(&b.1));

    let total_bytes = export_files
        .iter()
        .fold(1_u64, |total, (_, _, size)| total.saturating_add(*size));
    let loading_bar = init_loading(
        LoadingBarType::PackExport {
            instance_id: metadata.instance.id.clone(),
            instance_name: metadata.instance.name.clone(),
        },
        total_bytes as f64,
        "Exporting Prism instance to .zip",
    )
    .await?;

    tokio::task::spawn_blocking(move || {
        let file = std::fs::File::create(&export_path)
            .map_err(|error| IOError::with_path(error, &export_path))?;
        write_prism_zip_archive(
            file,
            export_files,
            metadata_files,
            |bytes_written| {
                emit_loading(&loading_bar, bytes_written as f64, None)
            },
        )
    })
    .await??;

    Ok(())
}

const PRISM_INSTANCE_CFG: &str = "instance.cfg";
const PRISM_MMC_PACK: &str = "mmc-pack.json";
/// Game directory inside a Prism/MultiMC instance. `.minecraft` is read by
/// MultiMC, every Prism Launcher release and this launcher's importer alike.
const PRISM_GAME_DIRECTORY: &str = ".minecraft";

/// Entries a "clean" Prism export drops from the instance root. These are all
/// traces of the player rather than parts of the modpack: launcher logs,
/// session caches, worlds, screenshots, saved server lists, local account
/// caches and minimap data. Each entry matches either the exact path or the
/// directory it names, so `logs` covers `logs/2024-01-01-1.log.gz` as well.
const CLEAN_EXPORT_ROOT_ENTRIES: &[&str] = &[
    "logs",
    "crash-reports",
    "modrinth_logs",
    ".mcsessions",
    "saves",
    "backups",
    "screenshots",
    "journeymap",
    "xaerowaypoints",
    "xaeroworldmap",
    "voxelmap",
    "mapwriter",
    "essential",
    "local/crash_assistant",
    "launcher_accounts.json",
    "launcher_profiles.json",
    "servers.dat",
    "servers.dat_old",
    "usercache.json",
    "usernamecache.json",
    "realms_persistence.json",
];

/// Directory names that are dropped at any depth: a mod that keeps its own
/// `logs` folder must not leak those files into a shared modpack either.
const CLEAN_EXPORT_ANY_DEPTH_DIRECTORIES: &[&str] =
    &["logs", "crash-reports", ".mcsessions"];

/// Files the JVM leaves behind when a game crashes. They describe the machine
/// (paths, Java build, memory layout) instead of the modpack.
const CLEAN_EXPORT_FILE_PREFIXES: &[&str] = &["hs_err_pid", "replay_pid"];
const CLEAN_EXPORT_FILE_SUFFIXES: &[&str] = &[".hprof"];

/// Decides whether a path inside an instance is personal state that a clean
/// export has to remove. Matching is case-insensitive because Minecraft keeps
/// folders such as `XaeroWaypoints` capitalised on Windows.
fn is_clean_export_excluded(relative_path: &str) -> bool {
    let normalized = relative_path.to_ascii_lowercase();

    let is_root_entry = CLEAN_EXPORT_ROOT_ENTRIES.iter().any(|entry| {
        normalized == *entry
            || normalized
                .strip_prefix(*entry)
                .is_some_and(|rest| rest.starts_with('/'))
    });
    if is_root_entry {
        return true;
    }

    let file_name =
        normalized.rsplit('/').next().unwrap_or(normalized.as_str());
    if CLEAN_EXPORT_FILE_PREFIXES
        .iter()
        .any(|prefix| file_name.starts_with(*prefix))
        || CLEAN_EXPORT_FILE_SUFFIXES
            .iter()
            .any(|suffix| file_name.ends_with(*suffix))
    {
        return true;
    }

    normalized
        .split('/')
        .any(|segment| CLEAN_EXPORT_ANY_DEPTH_DIRECTORIES.contains(&segment))
}

/// Icon key Prism Launcher falls back to when an instance has no own icon.
const PRISM_DEFAULT_ICON_KEY: &str = "default";

struct PrismIconFile {
    key: String,
    file_name: String,
    bytes: Vec<u8>,
}

/// Prism Launcher exports a custom instance icon as `<iconKey>.<ext>` next to
/// `instance.cfg` and installs it into its icon library on import (see
/// `IconUtils::findBestIconIn`). The key is derived from the instance id, so
/// importing never replaces an unrelated icon already in Prism's library.
async fn prism_icon_file(
    instance_id: &str,
    icon_path: Option<&str>,
) -> Option<PrismIconFile> {
    let icon_path = Path::new(icon_path?);
    let extension = icon_path.extension()?.to_str()?.to_ascii_lowercase();
    if !matches!(
        extension.as_str(),
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "ico"
    ) {
        return None;
    }
    let bytes = match tokio::fs::read(icon_path).await {
        Ok(bytes) => bytes,
        Err(error) => {
            tracing::warn!("Exporting the instance without its icon: {error}");
            return None;
        }
    };
    let id: String = instance_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_'))
        .collect();
    let key = format!("minekube_{id}");
    Some(PrismIconFile {
        file_name: format!("{key}.{extension}"),
        key,
        bytes,
    })
}

/// Writes `instance.cfg` the way Prism does. Values go into an INI file, so
/// line breaks in the name are flattened rather than starting a new key.
fn prism_instance_cfg(name: &str, icon_key: &str) -> String {
    let name = name.replace(['\r', '\n'], " ");
    format!(
        "InstanceType=OneSix\n\
         iconKey={icon_key}\n\
         name={name}\n\
         OverrideCommands=false\n\
         OverrideJavaArgs=false\n\
         OverrideMemory=false\n"
    )
}

/// Mirrors the component list Prism writes into `mmc-pack.json`, using the
/// component ids Prism itself resolves (`net.fabricmc.fabric-loader`,
/// `org.quiltmc.quilt-loader`, `net.minecraftforge`, `net.neoforged`).
fn prism_mmc_pack(
    content_set: &crate::state::ContentSet,
) -> crate::Result<String> {
    let mut components = vec![serde_json::json!({
        "important": true,
        "uid": "net.minecraft",
        "version": content_set.game_version.clone(),
    })];

    let loader_uid = match content_set.loader {
        ModLoader::Vanilla => None,
        ModLoader::Fabric => Some("net.fabricmc.fabric-loader"),
        ModLoader::Quilt => Some("org.quiltmc.quilt-loader"),
        ModLoader::Forge => Some("net.minecraftforge"),
        ModLoader::NeoForge => Some("net.neoforged"),
    };

    if let Some(uid) = loader_uid
        && let Some(loader_version) = content_set.loader_version.as_deref()
    {
        // The launcher metadata names (Neo)Forge builds after the game version
        // (`1.20.1-47.3.0`), Prism only knows the bare build (`47.3.0`).
        let game_version_prefix = format!("{}-", content_set.game_version);
        let version = match content_set.loader {
            ModLoader::Forge | ModLoader::NeoForge => loader_version
                .strip_prefix(&game_version_prefix)
                .unwrap_or(loader_version),
            _ => loader_version,
        };
        components.push(serde_json::json!({
            "uid": uid,
            "version": version,
        }));
    }

    Ok(serde_json::to_string_pretty(&serde_json::json!({
        "formatVersion": 1,
        "components": components,
    }))?)
}

fn write_prism_zip_archive<W, F>(
    writer: W,
    export_files: Vec<(PathBuf, String, u64)>,
    metadata_files: Vec<(String, Vec<u8>)>,
    mut emit_progress: F,
) -> crate::Result<()>
where
    W: Write + Seek,
    F: FnMut(u64) -> crate::Result<()>,
{
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated);
    let mut writer = ZipWriter::new(writer);
    let mut buffer = vec![0_u8; EXPORT_COPY_BUFFER_SIZE];

    for (path, relative_path, _) in export_files {
        writer
            .start_file(relative_path, options)
            .map_err(std::io::Error::from)?;
        let mut source = std::fs::File::open(&path)
            .map_err(|error| IOError::with_path(error, &path))?;
        loop {
            let bytes_read = source
                .read(&mut buffer)
                .map_err(|error| IOError::with_path(error, &path))?;
            if bytes_read == 0 {
                break;
            }
            writer.write_all(&buffer[..bytes_read])?;
            emit_progress(bytes_read as u64)?;
        }
    }

    for (relative_path, data) in metadata_files {
        writer
            .start_file(relative_path, options)
            .map_err(std::io::Error::from)?;
        writer.write_all(&data)?;
        emit_progress(data.len() as u64)?;
    }

    writer.finish().map_err(std::io::Error::from)?;
    emit_progress(1)?;

    Ok(())
}

fn ensure_standard_zip_file_size(size: u64) -> crate::Result<()> {
    if size > zip::ZIP64_BYTES_THR {
        return Err(crate::ErrorKind::OtherError(
            STANDARD_ZIP_FILE_SIZE_ERROR.to_string(),
        )
        .into());
    }

    Ok(())
}

fn write_mrpack_archive<W, F>(
    writer: W,
    override_files: Vec<(ReadableContent, SafeRelativeUtf8UnixPathBuf, u64)>,
    packfile_data: &[u8],
    mut emit_progress: F,
) -> crate::Result<()>
where
    W: Write + Seek,
    F: FnMut(u64) -> crate::Result<()>,
{
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated);
    let mut writer = ZipWriter::new(writer);
    let mut buffer = vec![0_u8; EXPORT_COPY_BUFFER_SIZE];

    for (content, relative_path, _) in override_files {
        let path = content.path();
        writer
            .start_file(format!("overrides/{relative_path}"), options)
            .map_err(std::io::Error::from)?;
        let mut source = std::fs::File::open(path)
            .map_err(|error| IOError::with_path(error, path))?;
        loop {
            let bytes_read = source
                .read(&mut buffer)
                .map_err(|error| IOError::with_path(error, path))?;
            if bytes_read == 0 {
                break;
            }
            writer.write_all(&buffer[..bytes_read])?;
            emit_progress(bytes_read as u64)?;
        }
    }

    writer
        .start_file("modrinth.index.json", options)
        .map_err(std::io::Error::from)?;
    writer.write_all(packfile_data)?;
    writer.finish().map_err(std::io::Error::from)?;
    emit_progress(1)?;

    Ok(())
}

fn write_zip_archive<W, F>(
    writer: W,
    export_files: Vec<(ReadableContent, SafeRelativeUtf8UnixPathBuf, u64)>,
    mut emit_progress: F,
) -> crate::Result<()>
where
    W: Write + Seek,
    F: FnMut(u64) -> crate::Result<()>,
{
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated);
    let mut writer = ZipWriter::new(writer);
    let mut buffer = vec![0_u8; EXPORT_COPY_BUFFER_SIZE];

    for (content, relative_path, _) in export_files {
        let path = content.path();
        writer
            .start_file(relative_path.as_str(), options)
            .map_err(std::io::Error::from)?;
        let mut source = std::fs::File::open(path)
            .map_err(|error| IOError::with_path(error, path))?;
        loop {
            let bytes_read = source
                .read(&mut buffer)
                .map_err(|error| IOError::with_path(error, path))?;
            if bytes_read == 0 {
                break;
            }
            writer.write_all(&buffer[..bytes_read])?;
            emit_progress(bytes_read as u64)?;
        }
    }

    writer.finish().map_err(std::io::Error::from)?;
    emit_progress(1)?;

    Ok(())
}

fn is_path_exportable(relative_path: &SafeRelativeUtf8UnixPathBuf) -> bool {
    let path = relative_path.as_str();

    !NEVER_EXPORTABLE_PATH_PREFIXES.iter().any(|prefix| {
        path == *prefix
            || path
                .strip_prefix(prefix)
                .is_some_and(|suffix| suffix.starts_with('/'))
    }) && !NEVER_EXPORTABLE_PATH_SUFFIXES
        .iter()
        .any(|suffix| path.ends_with(suffix))
}

#[tracing::instrument]
pub async fn get_pack_export_candidates(
    instance_id: &str,
) -> crate::Result<Vec<PackExportCandidate>> {
    let state = State::get().await?;
    crate::state::instances::commands::sync_content_files(instance_id, &state)
        .await?;
    get_pack_export_candidates_for_parent(instance_id, None).await
}

#[tracing::instrument]
pub async fn get_pack_export_candidates_for_parent(
    instance_id: &str,
    parent: Option<SafeRelativeUtf8UnixPathBuf>,
) -> crate::Result<Vec<PackExportCandidate>> {
    let instance_base_dir = get_full_path(instance_id).await?;
    let parent_dir = if let Some(parent) = parent {
        if parent.as_str().is_empty() || !is_path_exportable(&parent) {
            return Ok(Vec::new());
        }

        instance_base_dir.join(parent.as_str())
    } else {
        instance_base_dir.clone()
    };
    let parent_dir = io::canonicalize(parent_dir)?;
    if !parent_dir.starts_with(&instance_base_dir) {
        return Ok(Vec::new());
    }

    let mut paths = Vec::new();
    let mut read_dir = io::read_dir(&parent_dir).await?;
    while let Some(entry) = read_dir
        .next_entry()
        .await
        .map_err(|e| IOError::with_path(e, &parent_dir))?
    {
        paths.push(entry.path());
    }

    let candidates = stream::iter(paths)
        .map(|path| {
            let instance_base_dir = &instance_base_dir;
            async move {
                build_pack_export_candidate(
                    instance_id,
                    instance_base_dir,
                    &path,
                )
                .await
            }
        })
        .buffer_unordered(EXPORT_CANDIDATE_METADATA_CONCURRENCY)
        .collect::<Vec<_>>()
        .await;
    let mut path_list = Vec::with_capacity(candidates.len());
    for candidate in candidates {
        if let Some(candidate) = candidate? {
            path_list.push(candidate);
        }
    }

    Ok(path_list)
}

async fn build_pack_export_candidate(
    instance_id: &str,
    instance_base_dir: &Path,
    path: &Path,
) -> crate::Result<Option<PackExportCandidate>> {
    let relative_path = pack_get_relative_path(instance_base_dir, path)?;
    if !is_path_exportable(&relative_path) {
        return Ok(None);
    }

    let state = State::get().await?;
    let metadata = tokio::fs::symlink_metadata(path)
        .await
        .map_err(|error| IOError::with_path(error, path))?;
    let content = if metadata.is_dir() {
        ReadableContent::Local(path.to_path_buf())
    } else {
        let logical_path = logical_content_path(&relative_path)?;
        let file = content_rows::get_instance_file_by_relative_path(
            instance_id,
            logical_path.as_str(),
            &state.pool,
        )
        .await?;
        let Some(content) = export_content(
            &state,
            file.as_ref(),
            path,
            metadata.file_type().is_symlink(),
        )
        .await?
        else {
            return Ok(None);
        };
        content
    };
    let metadata = tokio::fs::metadata(content.path()).await?;
    let relative_path = if metadata.is_file() {
        logical_content_path(&relative_path)?
    } else {
        relative_path
    };
    if !metadata.is_dir() && !metadata.is_file() {
        return Ok(None);
    }

    let kind = if metadata.is_dir() {
        PackExportCandidateType::Directory
    } else {
        PackExportCandidateType::File
    };
    let size = metadata.is_file().then_some(metadata.len());
    let modified = metadata
        .modified()
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs());
    let default_selected = is_default_selected_export_candidate(&relative_path);

    Ok(Some(PackExportCandidate {
        path: relative_path,
        kind,
        size,
        modified,
        count: None,
        disabled: false,
        default_selected,
    }))
}

fn logical_content_path(
    path: &SafeRelativeUtf8UnixPathBuf,
) -> crate::Result<SafeRelativeUtf8UnixPathBuf> {
    if is_managed_content_path(path.as_str()) {
        Ok(SafeRelativeUtf8UnixPathBuf::try_from(
            path.as_str().trim_end_matches(".disabled").to_string(),
        )?)
    } else {
        Ok(path.clone())
    }
}

async fn export_content(
    state: &State,
    file: Option<&crate::state::InstanceFile>,
    path: &Path,
    is_symlink: bool,
) -> crate::Result<Option<ReadableContent>> {
    if let Some(file) = file {
        match state.content_store.file_content(file).await? {
            FileContent::Stored { stored_file, .. } => {
                if file.missing
                    || !state
                        .content_store
                        .instance_file_matches(
                            path,
                            &stored_file.metadata.sha512,
                        )
                        .await?
                {
                    return Err(input(format!(
                        "{} was changed outside the app; resolve it before exporting",
                        file.relative_path
                    )));
                }
                return Ok(Some(ReadableContent::Stored(stored_file)));
            }
            FileContent::Damaged(_) => {
                return Err(input(format!(
                    "Repair {} before exporting this instance",
                    file.relative_path
                )));
            }
            FileContent::Unmanaged => {}
        }
    }
    Ok((!is_symlink).then(|| ReadableContent::Local(path.to_path_buf())))
}

fn is_default_selected_export_candidate(
    relative_path: &SafeRelativeUtf8UnixPathBuf,
) -> bool {
    let path = relative_path.as_str();

    DEFAULT_SELECTED_EXPORT_PATH_PREFIXES.iter().any(|prefix| {
        path == *prefix
            || path
                .strip_prefix(prefix)
                .is_some_and(|suffix| suffix.starts_with('/'))
    })
}

fn pack_get_relative_path(
    instance_path: &Path,
    path: &Path,
) -> crate::Result<SafeRelativeUtf8UnixPathBuf> {
    Ok(SafeRelativeUtf8UnixPathBuf::try_from(
        path.strip_prefix(instance_path)
            .map_err(|_| {
                crate::ErrorKind::FSError(format!(
                    "Path {path:?} does not correspond to an instance"
                ))
            })?
            .components()
            .map(|c| c.as_os_str().to_string_lossy())
            .collect::<Vec<_>>()
            .join("/"),
    )?)
}

fn get_mrpack_environment(
    environment: Option<VersionEnvironment>,
) -> HashMap<EnvType, SideType> {
    let (client, server) =
        match environment.unwrap_or(VersionEnvironment::Unknown) {
            VersionEnvironment::ClientAndServer
            | VersionEnvironment::ClientOnlyServerOptional
            | VersionEnvironment::ServerOnly
            | VersionEnvironment::ServerOnlyClientOptional
            | VersionEnvironment::ClientOrServer
            | VersionEnvironment::ClientOrServerPrefersBoth
            | VersionEnvironment::Unknown => {
                (SideType::Required, SideType::Required)
            }
            VersionEnvironment::ClientOnly
            | VersionEnvironment::SingleplayerOnly => {
                (SideType::Required, SideType::Unsupported)
            }
            VersionEnvironment::DedicatedServerOnly => {
                (SideType::Unsupported, SideType::Required)
            }
        };

    HashMap::from([(EnvType::Client, client), (EnvType::Server, server)])
}

#[tracing::instrument(skip_all)]
pub async fn create_mrpack_json(
    metadata: &InstanceMetadata,
    version_id: String,
    description: Option<String>,
) -> crate::Result<PackFormat> {
    let mut dependencies = HashMap::new();
    match (
        metadata.applied_content_set.loader,
        metadata.applied_content_set.loader_version.clone(),
    ) {
        (ModLoader::Forge, Some(v)) => {
            dependencies.insert(PackDependency::Forge, v)
        }
        (ModLoader::NeoForge, Some(v)) => {
            dependencies.insert(PackDependency::NeoForge, v)
        }
        (ModLoader::Fabric, Some(v)) => {
            dependencies.insert(PackDependency::FabricLoader, v)
        }
        (ModLoader::Quilt, Some(v)) => {
            dependencies.insert(PackDependency::QuiltLoader, v)
        }
        (ModLoader::Vanilla, _) => None,
        _ => {
            return Err(crate::ErrorKind::OtherError(
                "Loader version mismatch".to_string(),
            )
            .into());
        }
    };
    dependencies.insert(
        PackDependency::Minecraft,
        metadata.applied_content_set.game_version.clone(),
    );

    let state = State::get().await?;
    let projects = get_projects(
        &metadata.instance.id,
        Some(CacheBehaviour::MustRevalidate),
    )
    .await?
    .into_iter()
    .filter_map(|(path, file)| {
        let path = if file.enabled {
            path
        } else {
            format!("{path}.disabled")
        };
        file.metadata
            .map(|metadata| (path, file.hash, metadata.version_id))
    })
    .collect::<Vec<_>>();
    let version_ids = projects.iter().map(|x| &*x.2).collect::<Vec<_>>();
    let versions = CachedEntry::get_version_v3_many(
        &version_ids,
        Some(CacheBehaviour::MustRevalidate),
        &state.pool,
        &state.api_semaphore,
    )
    .await?;
    let files = projects
        .into_iter()
        .filter_map(|(path, hash, version_id)| {
            let version = versions.iter().find(|x| x.id == version_id)?;
            let env = get_mrpack_environment(version.environment);
            let file = version.files.iter().find(|file| {
                file.hashes
                    .get("sha1")
                    .is_some_and(|file_hash| file_hash == &hash)
            })?;
            let file_size = file.size;
            let downloads = vec![file.url.clone()];
            let hashes = file
                .hashes
                .clone()
                .into_iter()
                .map(|(h1, h2)| (PackFileHash::from(h1), h2))
                .collect();

            Some(Ok(PackFile {
                path: match path.try_into() {
                    Ok(path) => path,
                    Err(_) => {
                        return Some(Err(crate::ErrorKind::OtherError(
                            "Invalid file path in project".into(),
                        )
                        .as_error()));
                    }
                },
                hashes,
                env: Some(env),
                downloads,
                file_size,
            }))
        })
        .collect::<crate::Result<Vec<PackFile>>>()?;

    Ok(PackFormat {
        game: "minecraft".to_string(),
        format_version: 1,
        version_id,
        name: metadata.instance.name.clone(),
        summary: description,
        files,
        dependencies,
    })
}
