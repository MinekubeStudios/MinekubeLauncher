use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize, de};

use crate::{
    State,
    install::{InstallPhaseDetails, InstallProgressReporter},
    pack::{
        import::{self, finish_import},
        install_from::{self, CreatePackDescription, PackDependency},
    },
    util::io,
};

// instance.cfg
// https://github.com/PrismLauncher/PrismLauncher/blob/develop/launcher/minecraft/MinecraftInstance.cpp
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "PascalCase")]
#[serde(untagged)]
enum MMCInstanceEnum {
    General(MMCInstanceGeneral),
    Instance(MMCInstance),
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "PascalCase")]
struct MMCInstanceGeneral {
    pub general: MMCInstance,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "PascalCase")]
pub struct MMCInstance {
    pub java_path: Option<String>,
    pub jvm_args: Option<String>,

    #[serde(default)]
    #[serde(deserialize_with = "deserialize_optional_bool")]
    pub managed_pack: Option<bool>,

    #[serde(rename = "ManagedPackID")]
    pub managed_pack_id: Option<String>,
    pub managed_pack_type: Option<MMCManagedPackType>,
    #[serde(rename = "ManagedPackVersionID")]
    pub managed_pack_version_id: Option<String>,
    pub managed_pack_version_name: Option<String>,

    #[serde(rename = "iconKey")]
    pub icon_key: Option<String>,
    #[serde(rename = "name")]
    pub name: Option<String>,
}

// serde_ini reads 'true' and 'false' as strings, so we need to convert them to booleans
fn deserialize_optional_bool<'de, D>(
    deserializer: D,
) -> Result<Option<bool>, D::Error>
where
    D: de::Deserializer<'de>,
{
    let s = Option::<String>::deserialize(deserializer)?;
    match s {
        Some(string) => match string.as_str() {
            "true" => Ok(Some(true)),
            "false" => Ok(Some(false)),
            _ => Err(de::Error::custom("expected 'true' or 'false'")),
        },
        None => Ok(None),
    }
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum MMCManagedPackType {
    Modrinth,
    Flame,
    ATLauncher,
    #[serde(other)]
    Unknown,
}

// mmc-pack.json
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MMCPack {
    components: Vec<MMCComponent>,
    format_version: u32,
}

// https://github.com/PrismLauncher/PrismLauncher/blob/develop/launcher/minecraft/Component.h
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MMCComponent {
    pub uid: String,

    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub dependency_only: bool,

    #[serde(default)]
    pub important: bool,
    #[serde(default)]
    pub disabled: bool,

    pub cached_name: Option<String>,
    pub cached_version: Option<String>,

    #[serde(default)]
    pub cached_requires: Vec<MMCComponentRequirement>,
    #[serde(default)]
    pub cached_conflicts: Vec<MMCComponentRequirement>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MMCComponentRequirement {
    pub uid: String,
    pub equals_version: Option<String>,
    pub suggests: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "PascalCase")]
#[serde(untagged)]
enum MMCLauncherEnum {
    General(MMCLauncherGeneral),
    Instance(MMCLauncher),
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "PascalCase")]
struct MMCLauncherGeneral {
    pub general: MMCLauncher,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "PascalCase")]
pub struct MMCLauncher {
    instance_dir: String,
}

// Checks if if its a folder, and the folder contains instance.cfg and mmc-pack.json, and they both parse
#[tracing::instrument]
pub async fn is_valid_mmc(instance_folder: PathBuf) -> bool {
    let instance_cfg = instance_folder.join("instance.cfg");
    let mmc_pack = instance_folder.join("mmc-pack.json");

    let Ok((mmc_pack, _)) = io::read_any_encoding_to_string(&mmc_pack).await
    else {
        return false;
    };

    load_instance_cfg(&instance_cfg).await.is_ok()
        && serde_json::from_str::<MMCPack>(&mmc_pack).is_ok()
}

#[tracing::instrument]
pub async fn get_instances_subpath(config: PathBuf) -> Option<String> {
    let launcher = io::read_any_encoding_to_string(&config).await.ok()?.0;
    let launcher: MMCLauncherEnum = serde_ini::from_str(&launcher).ok()?;
    match launcher {
        MMCLauncherEnum::General(p) => Some(p.general.instance_dir),
        MMCLauncherEnum::Instance(p) => Some(p.instance_dir),
    }
}

// Loading the INI (instance.cfg) file
async fn load_instance_cfg(file_path: &Path) -> crate::Result<MMCInstance> {
    match serde_ini::from_str::<MMCInstanceEnum>(
        &io::read_any_encoding_to_string(file_path).await?.0,
    )? {
        MMCInstanceEnum::General(instance_cfg) => Ok(instance_cfg.general),
        MMCInstanceEnum::Instance(instance_cfg) => Ok(instance_cfg),
    }
}

// #[tracing::instrument]
pub async fn import_mmc(
    mmc_base_path: PathBuf,  // path to base mmc folder
    instance_folder: String, // instance folder in mmc_base_path
    instance_id: &str,
    reporter: InstallProgressReporter,
    details: InstallPhaseDetails,
) -> crate::Result<()> {
    let mmc_instance_path =
        mmc_base_path.join("instances").join(instance_folder);
    let icons_dir = mmc_base_path.join("icons");

    import_mmc_instance(
        &mmc_instance_path,
        &icons_dir,
        instance_id,
        reporter,
        details,
    )
    .await
}

/// Imports a single Prism Launcher / MultiMC instance folder (the one holding
/// `instance.cfg` and `mmc-pack.json`). The icon is looked up in `icons_dir`
/// first (the launcher's icon library) and then in the instance folder itself,
/// which is where Prism puts a custom icon when it exports an instance.
async fn import_mmc_instance(
    mmc_instance_path: &Path,
    icons_dir: &Path,
    instance_id: &str,
    reporter: InstallProgressReporter,
    details: InstallPhaseDetails,
) -> crate::Result<()> {
    let mmc_pack = serde_json::from_str::<MMCPack>(
        &io::read_any_encoding_to_string(
            &mmc_instance_path.join("mmc-pack.json"),
        )
        .await?
        .0,
    )?;

    let instance_cfg =
        load_instance_cfg(&mmc_instance_path.join("instance.cfg")).await?;

    // Re-cache icon
    let icon = match instance_cfg.icon_key.as_deref().and_then(|icon_key| {
        find_mmc_icon(icons_dir, icon_key)
            .or_else(|| find_mmc_icon(mmc_instance_path, icon_key))
    }) {
        // A broken or unsupported icon (Prism allows SVG) must not fail the
        // whole import; the instance just gets the default icon.
        Some(icon_path) => match import::recache_icon(icon_path).await {
            Ok(icon) => icon,
            Err(error) => {
                tracing::warn!("Skipping the imported instance icon: {error}");
                None
            }
        },
        None => None,
    };

    // Create description from instance.cfg
    let mut description = CreatePackDescription {
        icon,
        override_title: instance_cfg.name,
        project_id: None,
        version_id: None,
        instance_id: instance_id.to_string(),
        source_filename: None,
    };

    let mut minecraft_folder = mmc_instance_path.join("minecraft");
    if !minecraft_folder.is_dir() {
        minecraft_folder = mmc_instance_path.join(".minecraft");
        if !minecraft_folder.is_dir() {
            return Err(crate::ErrorKind::InputError(
                "Instance is missing Minecraft directory".to_string(),
            )
            .into());
        }
    }

    // Managed pack
    if instance_cfg.managed_pack.unwrap_or(false) {
        match instance_cfg.managed_pack_type {
            Some(MMCManagedPackType::Modrinth) => {
                description.project_id = instance_cfg.managed_pack_id;
                description.version_id = instance_cfg.managed_pack_version_id;

                // Modrinth Managed Pack
                // Kept separate as we may in the future want to add special handling for modrinth managed packs
                import_mmc_unmanaged(instance_id, minecraft_folder, "Imported Modpack".to_string(), description, mmc_pack, reporter, details).await?;
            }
            Some(MMCManagedPackType::Flame | MMCManagedPackType::ATLauncher) => {
                // For flame/atlauncher managed packs
                // Treat as unmanaged, but with 'minecraft' folder instead of '.minecraft'
                import_mmc_unmanaged(instance_id, minecraft_folder, "Imported Modpack".to_string(), description, mmc_pack, reporter, details).await?;
            },
            Some(_) => {
                // For managed packs that aren't modrinth, flame, atlauncher
                // Treat as unmanaged
                import_mmc_unmanaged(instance_id, minecraft_folder, "ImportedModpack".to_string(), description, mmc_pack, reporter, details).await?;
            },
            _ => return Err(crate::ErrorKind::InputError("Instance is managed, but managed pack type not specified in instance.cfg".to_string()).into())
        }
    } else {
        // Directly import unmanaged pack
        import_mmc_unmanaged(
            instance_id,
            minecraft_folder,
            "Imported Modpack".to_string(),
            description,
            mmc_pack,
            reporter,
            details,
        )
        .await?;
    }
    Ok(())
}

async fn import_mmc_unmanaged(
    instance_id: &str,
    minecraft_folder: PathBuf,
    backup_name: String,
    description: CreatePackDescription,
    mmc_pack: MMCPack,
    reporter: InstallProgressReporter,
    details: InstallPhaseDetails,
) -> crate::Result<()> {
    // Pack dependencies stored in mmc-pack.json, we convert to .mrpack pack dependencies
    let dependencies = mmc_pack
        .components
        .iter()
        .filter_map(|component| {
            if component.uid.starts_with("net.fabricmc.fabric-loader") {
                return Some((
                    PackDependency::FabricLoader,
                    component.version.clone().unwrap_or_default(),
                ));
            }
            if component.uid.starts_with("net.minecraftforge") {
                return Some((
                    PackDependency::Forge,
                    component.version.clone().unwrap_or_default(),
                ));
            }
            if component.uid.starts_with("net.neoforged") {
                return Some((
                    PackDependency::NeoForge,
                    component.version.clone().unwrap_or_default(),
                ));
            }
            if component.uid.starts_with("org.quiltmc.quilt-loader") {
                return Some((
                    PackDependency::QuiltLoader,
                    component.version.clone().unwrap_or_default(),
                ));
            }
            if component.uid.starts_with("net.minecraft") {
                return Some((
                    PackDependency::Minecraft,
                    component.version.clone().unwrap_or_default(),
                ));
            }

            None
        })
        .collect();

    install_from::set_instance_information(
        instance_id.to_string(),
        &description,
        &backup_name,
        None,
        &dependencies,
        false,
    )
    .await?;

    // Moves .minecraft folder over (ie: overrides such as resourcepacks, mods, etc)
    let state = State::get().await?;
    finish_import(
        instance_id,
        minecraft_folder,
        &state.io_semaphore,
        reporter,
        details,
    )
    .await?;
    Ok(())
}

/// Image formats Prism Launcher accepts as instance icons.
const MMC_ICON_EXTENSIONS: &[&str] =
    &["png", "jpg", "jpeg", "gif", "ico", "webp", "bmp", "svg"];

/// Finds the icon file for `icon_key` in `dir`, the way Prism's
/// `IconUtils::findBestIconIn` does: a file named exactly like the key, or one
/// whose name without extension is the key. The key comes from an untrusted
/// `instance.cfg`, so anything that could point outside `dir` is ignored.
fn find_mmc_icon(dir: &Path, icon_key: &str) -> Option<PathBuf> {
    if icon_key.is_empty()
        || icon_key == "."
        || icon_key == ".."
        || icon_key.contains(['/', '\\', ':'])
    {
        return None;
    }

    let exact = dir.join(icon_key);
    if exact.is_file() {
        return Some(exact);
    }

    MMC_ICON_EXTENSIONS
        .iter()
        .map(|extension| dir.join(format!("{icon_key}.{extension}")))
        .find(|path| path.is_file())
}

/// What kind of instance or modpack a `.zip`/`.mrpack` archive holds.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InstanceArchiveKind {
    /// A Modrinth-format modpack (`modrinth.index.json` at the root).
    Mrpack,
    /// An instance exported from Prism Launcher or MultiMC.
    Mmc,
    Unknown,
}

/// Prism, MultiMC and most archivers put `instance.cfg` at the root of the
/// archive; zipping the instance folder itself nests it one or two levels
/// deeper. Returns the folder prefix (`""` or `"My Pack/"`) holding both
/// `instance.cfg` and `mmc-pack.json`, preferring the shallowest one.
fn mmc_archive_prefix<'a>(
    names: impl Iterator<Item = &'a str> + Clone,
) -> Option<String> {
    const MAX_DEPTH: usize = 2;

    names
        .clone()
        .filter(|name| !name.starts_with("__MACOSX/"))
        .filter_map(|name| name.strip_suffix("instance.cfg"))
        .filter(|prefix| prefix.is_empty() || prefix.ends_with('/'))
        .filter(|prefix| prefix.matches('/').count() <= MAX_DEPTH)
        .filter(|prefix| {
            let mmc_pack = format!("{prefix}mmc-pack.json");
            names.clone().any(|name| name == mmc_pack)
        })
        .min_by_key(|prefix| (prefix.matches('/').count(), prefix.len()))
        .map(str::to_string)
}

fn archive_entry_names(
    archive: &zip::ZipArchive<std::fs::File>,
) -> Vec<String> {
    archive
        .file_names()
        .map(|name| name.replace('\\', "/"))
        .collect()
}

fn open_archive(path: &Path) -> crate::Result<zip::ZipArchive<std::fs::File>> {
    let file = std::fs::File::open(path)
        .map_err(|error| io::IOError::with_path(error, path))?;
    zip::ZipArchive::new(file).map_err(|_| {
        crate::ErrorKind::InputError(
            "The selected file is not a valid .zip archive".to_string(),
        )
        .into()
    })
}

/// Tells which importer can handle the archive at `path`, without extracting it.
pub async fn get_instance_archive_kind(
    path: PathBuf,
) -> crate::Result<InstanceArchiveKind> {
    tokio::task::spawn_blocking(move || {
        let Ok(archive) = open_archive(&path) else {
            return Ok(InstanceArchiveKind::Unknown);
        };
        let names = archive_entry_names(&archive);
        if names.iter().any(|name| name == "modrinth.index.json") {
            return Ok(InstanceArchiveKind::Mrpack);
        }
        if mmc_archive_prefix(names.iter().map(String::as_str)).is_some() {
            return Ok(InstanceArchiveKind::Mmc);
        }
        Ok(InstanceArchiveKind::Unknown)
    })
    .await?
}

/// Whether `path` points at an exported instance archive rather than at a
/// Prism Launcher / MultiMC data folder.
pub(crate) fn is_instance_archive(path: &Path) -> bool {
    path.is_file()
}

/// Extracts the instance folder of a Prism/MultiMC archive into `destination`.
/// Entries are written only through their sanitised names, so an archive can
/// never place files outside `destination`; symlinks are skipped.
fn extract_mmc_archive(
    archive: &Path,
    destination: &Path,
) -> crate::Result<()> {
    let mut zip = open_archive(archive)?;
    let names = archive_entry_names(&zip);
    let prefix = mmc_archive_prefix(names.iter().map(String::as_str))
        .ok_or_else(|| {
            crate::ErrorKind::InputError(
                "This .zip is not an instance exported from Prism Launcher or MultiMC (instance.cfg and mmc-pack.json are missing)"
                    .to_string(),
            )
        })?;
    let prefix = Path::new(&prefix);

    for index in 0..zip.len() {
        let mut entry = zip.by_index(index).map_err(std::io::Error::from)?;
        if entry.is_symlink() {
            continue;
        }
        let Some(name) = entry.enclosed_name() else {
            continue;
        };
        let Ok(relative) = name.strip_prefix(prefix) else {
            continue;
        };
        if relative.as_os_str().is_empty() {
            continue;
        }
        let target = destination.join(relative);

        if entry.is_dir() {
            std::fs::create_dir_all(&target)
                .map_err(|error| io::IOError::with_path(error, &target))?;
            continue;
        }
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|error| io::IOError::with_path(error, parent))?;
        }
        let mut output = std::fs::File::create(&target)
            .map_err(|error| io::IOError::with_path(error, &target))?;
        std::io::copy(&mut entry, &mut output)
            .map_err(|error| io::IOError::with_path(error, &target))?;
    }

    Ok(())
}

/// Imports an instance exported from Prism Launcher or MultiMC as a `.zip`
/// ("Export instance" in Prism). The archive is unpacked into a temporary
/// folder, imported exactly like an instance found in a Prism data folder,
/// and the temporary folder is removed again whatever the outcome.
pub async fn import_mmc_archive(
    archive: PathBuf,
    instance_id: &str,
    reporter: InstallProgressReporter,
    details: InstallPhaseDetails,
) -> crate::Result<()> {
    let state = State::get().await?;
    let staging = state
        .directories
        .caches_dir()
        .join("instance-archive-imports")
        .join(instance_id);
    if tokio::fs::try_exists(&staging).await.unwrap_or(false) {
        io::remove_dir_all(&staging).await?;
    }
    io::create_dir_all(&staging).await?;

    let result = async {
        let extract_to = staging.clone();
        tokio::task::spawn_blocking(move || {
            extract_mmc_archive(&archive, &extract_to)
        })
        .await??;

        import_mmc_instance(&staging, &staging, instance_id, reporter, details)
            .await
    }
    .await;

    if let Err(error) = io::remove_dir_all(&staging).await {
        tracing::warn!(
            "Failed to remove the instance import staging folder: {error}"
        );
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    fn prefix(names: &[&str]) -> Option<String> {
        mmc_archive_prefix(names.iter().copied())
    }

    #[test]
    fn finds_instance_at_archive_root() {
        assert_eq!(
            prefix(&["instance.cfg", "mmc-pack.json", ".minecraft/mods/a.jar"]),
            Some(String::new())
        );
    }

    #[test]
    fn finds_instance_in_zipped_folder() {
        assert_eq!(
            prefix(&[
                "My Pack/instance.cfg",
                "My Pack/mmc-pack.json",
                "My Pack/.minecraft/options.txt",
            ]),
            Some("My Pack/".to_string())
        );
    }

    #[test]
    fn prefers_shallowest_instance() {
        assert_eq!(
            prefix(&[
                "a/b/instance.cfg",
                "a/b/mmc-pack.json",
                "instance.cfg",
                "mmc-pack.json",
            ]),
            Some(String::new())
        );
    }

    #[test]
    fn rejects_archives_without_both_files() {
        assert_eq!(prefix(&["instance.cfg", ".minecraft/x"]), None);
        assert_eq!(prefix(&["mmc-pack.json"]), None);
        assert_eq!(prefix(&["myinstance.cfg", "mmc-pack.json"]), None);
        assert_eq!(
            prefix(&["__MACOSX/instance.cfg", "__MACOSX/mmc-pack.json"]),
            None
        );
        assert_eq!(
            prefix(&["a/b/c/instance.cfg", "a/b/c/mmc-pack.json"]),
            None
        );
    }

    fn write_zip(path: &Path, entries: &[(&str, &[u8])]) {
        use std::io::Write;
        let mut writer =
            zip::ZipWriter::new(std::fs::File::create(path).unwrap());
        let options = zip::write::SimpleFileOptions::default();
        for (name, data) in entries {
            writer.start_file(*name, options).unwrap();
            writer.write_all(data).unwrap();
        }
        writer.finish().unwrap();
    }

    #[test]
    fn extracts_only_the_instance_folder_and_stays_inside_destination() {
        let temp = tempfile::tempdir().unwrap();
        let archive = temp.path().join("pack.zip");
        write_zip(
            &archive,
            &[
                ("Pack/instance.cfg", b"name=Pack\n"),
                ("Pack/mmc-pack.json", b"{\"components\":[]}"),
                ("Pack/.minecraft/mods/a.jar", b"jar"),
                ("Pack/../../escape.txt", b"nope"),
                ("__MACOSX/Pack/._instance.cfg", b"junk"),
                ("other.txt", b"outside the instance"),
            ],
        );
        let destination = temp.path().join("out");
        std::fs::create_dir_all(&destination).unwrap();

        extract_mmc_archive(&archive, &destination).unwrap();

        assert!(destination.join("instance.cfg").is_file());
        assert!(destination.join("mmc-pack.json").is_file());
        assert_eq!(
            std::fs::read(destination.join(".minecraft/mods/a.jar")).unwrap(),
            b"jar"
        );
        assert!(!destination.join("other.txt").exists());
        assert!(!destination.join("__MACOSX").exists());
        assert!(!temp.path().join("escape.txt").exists());
        assert!(!temp.path().parent().unwrap().join("escape.txt").exists());
    }

    #[test]
    fn rejects_archive_that_is_not_an_instance() {
        let temp = tempfile::tempdir().unwrap();
        let archive = temp.path().join("mods.zip");
        write_zip(&archive, &[("mods/a.jar", b"jar")]);
        assert!(extract_mmc_archive(&archive, temp.path()).is_err());
    }

    #[test]
    fn finds_icon_exported_next_to_instance_cfg() {
        let temp = tempfile::tempdir().unwrap();
        std::fs::write(temp.path().join("my_icon.png"), b"png").unwrap();
        assert_eq!(
            find_mmc_icon(temp.path(), "my_icon"),
            Some(temp.path().join("my_icon.png"))
        );
        assert_eq!(find_mmc_icon(temp.path(), "missing"), None);
    }

    #[tokio::test]
    async fn reads_instance_cfg_written_by_prism_launcher_9() {
        let temp = tempfile::tempdir().unwrap();
        let cfg = temp.path().join("instance.cfg");
        std::fs::write(
            &cfg,
            "[General]\r\nConfigVersion=1.2\r\nAutomaticJava=true\r\n\
             ExportAuthor=\r\nExportName=\r\nExportOptionalFiles=true\r\n\
             ExportSummary=\r\nExportVersion=1.0.0\r\niconKey=my_icon\r\n\
             InstanceType=OneSix\r\nJoinServerOnLaunch=false\r\n\
             JoinServerOnLaunchAddress=\r\nManagedPack=false\r\n\
             ManagedPackID=\r\nManagedPackName=\r\nManagedPackType=\r\n\
             ManagedPackVersionID=\r\nManagedPackVersionName=\r\n\
             name=Better MC [FABRIC] 1.21\r\nnotes=\r\nOverrideJavaArgs=false\r\n\
             lastLaunchTime=1729000000000\r\ntotalTimePlayed=3600\r\n",
        )
        .unwrap();

        let instance = load_instance_cfg(&cfg).await.unwrap();
        assert_eq!(instance.name.as_deref(), Some("Better MC [FABRIC] 1.21"));
        assert_eq!(instance.icon_key.as_deref(), Some("my_icon"));
        assert_eq!(instance.managed_pack, Some(false));
    }

    #[test]
    fn icon_key_cannot_escape_folder() {
        let dir = std::env::temp_dir();
        assert_eq!(find_mmc_icon(&dir, "../secret"), None);
        assert_eq!(find_mmc_icon(&dir, ".."), None);
        assert_eq!(find_mmc_icon(&dir, "C:evil"), None);
        assert_eq!(find_mmc_icon(&dir, ""), None);
    }
}
