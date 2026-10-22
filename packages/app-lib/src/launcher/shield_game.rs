//! Minekube Shield — protection inside the game.
//!
//! Two layers, both prepared on the way into a launch:
//!
//! 1. **JVM hardening** for every instance, vanilla included: Log4j message
//!    lookups are switched off (the Log4Shell class of exploits through chat
//!    messages or server names), and the JVM stops writing its performance
//!    data file, which exposes the running process to other programs.
//! 2. **Privacy mods** for modded instances, when the player turns them on:
//!    *No Telemetry* stops Minecraft's own telemetry to Microsoft, and
//!    *No Chat Reports* strips the signatures that make chat messages
//!    reportable. Both are open source; the launcher fetches the build that
//!    matches the instance's loader and game version once, keeps it in its
//!    cache, and takes it out of the instance again when the option is off.
//!    A copy the player installed themselves is always left alone.
//!
//! Nothing in here may ever stop a launch: failures are logged and the player
//! still gets their game.

use crate::state::{ModLoader, State};
use reqwest::Method;
use serde::Deserialize;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tracing::{info, warn};

/// JVM arguments added to every launch (unless the player already set them).
const HARDENING_JVM_ARGS: &[&str] =
    &["-Dlog4j2.formatMsgNoLookups=true", "-XX:-UsePerfData"];

const FILE_PREFIX: &str = "minekube-shield-";
const DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(20);
const RETRY_AFTER: Duration = Duration::from_secs(24 * 60 * 60);

struct PrivacyMod {
    /// Modrinth project slug.
    slug: &'static str,
    /// Lower-case fragments that identify a copy the player installed.
    known_names: &'static [&'static str],
}

const PRIVACY_MODS: &[PrivacyMod] = &[
    PrivacyMod {
        slug: "no-telemetry",
        known_names: &["no-telemetry", "notelemetry", "no_telemetry"],
    },
    PrivacyMod {
        slug: "no-chat-reports",
        known_names: &["nochatreports", "no-chat-reports", "no_chat_reports"],
    },
];

/// Removes the jar of the retired Minekube nickname-badge mod that older
/// versions put into instances (`minekube-companion*.jar`).
pub async fn remove_retired_companion(mods_dir: &Path) {
    let Ok(mut entries) = tokio::fs::read_dir(mods_dir).await else {
        return;
    };
    while let Ok(Some(entry)) = entries.next_entry().await {
        let is_companion = entry.file_name().to_str().is_some_and(|name| {
            name.starts_with("minekube-companion") && name.ends_with(".jar")
        });
        if is_companion
            && let Err(error) = tokio::fs::remove_file(entry.path()).await
        {
            warn!(
                "Could not remove the retired companion mod {}: {error}",
                entry.path().display()
            );
        }
    }
}

/// Appends the hardening arguments the player has not set themselves.
pub fn harden_jvm_args(java_args: &mut Vec<String>) {
    for arg in HARDENING_JVM_ARGS {
        let key = arg.split('=').next().unwrap_or(arg);
        let key = key.trim_start_matches("-XX:-").trim_start_matches("-XX:+");
        if !java_args.iter().any(|existing| existing.contains(key)) {
            java_args.push((*arg).to_string());
        }
    }
}

/// Adds or removes the privacy mods for one instance.
pub async fn sync_privacy_mods(
    instance_path: &Path,
    loader: ModLoader,
    game_version: &str,
    enabled: bool,
) -> crate::Result<()> {
    let mods_dir = instance_path.join("mods");
    let loader_name = match loader {
        ModLoader::Vanilla => None,
        other => Some(other.as_str()),
    };

    for privacy_mod in PRIVACY_MODS {
        let Some(loader) = loader_name.filter(|_| enabled) else {
            remove_ours(&mods_dir, privacy_mod).await;
            continue;
        };
        let target_name = format!(
            "{FILE_PREFIX}{}-{loader}-{}.jar",
            privacy_mod.slug,
            sanitize(game_version)
        );
        if cleanup(&mods_dir, privacy_mod, &target_name).await {
            // The player installed the mod themselves: never add a second copy.
            remove_ours(&mods_dir, privacy_mod).await;
            continue;
        }

        let target = mods_dir.join(&target_name);
        if tokio::fs::try_exists(&target).await.unwrap_or(false) {
            continue;
        }

        let Some(source) =
            cached_jar(privacy_mod, loader, game_version, &target_name).await
        else {
            continue;
        };
        crate::util::io::create_dir_all(&mods_dir).await?;
        crate::util::io::copy(&source, &target).await?;
        info!(
            "Minekube Shield installed {} into {}",
            privacy_mod.slug,
            mods_dir.display()
        );
    }

    Ok(())
}

fn sanitize(value: &str) -> String {
    value
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

/// Removes our copies that do not match `keep`, and reports whether the
/// player has their own copy of the mod in the instance.
async fn cleanup(
    mods_dir: &Path,
    privacy_mod: &PrivacyMod,
    keep: &str,
) -> bool {
    let ours = format!("{FILE_PREFIX}{}-", privacy_mod.slug);
    let mut players_copy = false;
    let Ok(mut entries) = tokio::fs::read_dir(mods_dir).await else {
        return false;
    };
    while let Ok(Some(entry)) = entries.next_entry().await {
        let Some(name) = entry.file_name().to_str().map(str::to_owned) else {
            continue;
        };
        let lower = name.to_ascii_lowercase();
        if lower.starts_with(&ours) {
            if name != keep {
                let _ = tokio::fs::remove_file(entry.path()).await;
            }
        } else if !lower.starts_with(FILE_PREFIX)
            && privacy_mod
                .known_names
                .iter()
                .any(|known| lower.contains(known))
        {
            players_copy = true;
        }
    }
    players_copy
}

async fn remove_ours(mods_dir: &Path, privacy_mod: &PrivacyMod) {
    let ours = format!("{FILE_PREFIX}{}-", privacy_mod.slug);
    let Ok(mut entries) = tokio::fs::read_dir(mods_dir).await else {
        return;
    };
    while let Ok(Some(entry)) = entries.next_entry().await {
        if entry
            .file_name()
            .to_str()
            .is_some_and(|name| name.to_ascii_lowercase().starts_with(&ours))
        {
            let _ = tokio::fs::remove_file(entry.path()).await;
        }
    }
}

#[derive(Deserialize)]
struct ProjectVersion {
    files: Vec<VersionFile>,
}

#[derive(Deserialize)]
struct VersionFile {
    url: String,
    primary: bool,
    hashes: VersionHashes,
}

#[derive(Deserialize)]
struct VersionHashes {
    sha1: String,
}

/// The cached jar for this mod, loader and game version; downloaded (and
/// checked against its SHA-1) on first use. A failed attempt is remembered
/// for a day so a launch never waits on a download that is not coming.
async fn cached_jar(
    privacy_mod: &PrivacyMod,
    loader: &str,
    game_version: &str,
    file_name: &str,
) -> Option<PathBuf> {
    let state = State::get().await.ok()?;
    let cache_dir = state
        .directories
        .caches_dir()
        .join("minekube")
        .join("shield");
    let cached = cache_dir.join(file_name);
    if tokio::fs::try_exists(&cached).await.unwrap_or(false) {
        return Some(cached);
    }

    let marker = cache_dir.join(format!("{file_name}.unavailable"));
    if recently_failed(&marker).await {
        return None;
    }

    let attempt = tokio::time::timeout(
        DOWNLOAD_TIMEOUT,
        download(&state, privacy_mod.slug, loader, game_version, &cached),
    )
    .await;
    match attempt {
        Ok(Ok(true)) => Some(cached),
        Ok(Ok(false)) => {
            info!(
                "{} has no build for {loader} {game_version}",
                privacy_mod.slug
            );
            mark(&cache_dir, &marker).await;
            None
        }
        Ok(Err(error)) => {
            warn!(
                "Minekube Shield could not fetch {}: {error}",
                privacy_mod.slug
            );
            mark(&cache_dir, &marker).await;
            None
        }
        Err(_) => {
            warn!("Minekube Shield timed out fetching {}", privacy_mod.slug);
            mark(&cache_dir, &marker).await;
            None
        }
    }
}

async fn download(
    state: &State,
    slug: &str,
    loader: &str,
    game_version: &str,
    target: &Path,
) -> crate::Result<bool> {
    // Quilt loads Fabric mods, so a Fabric build is a fine fallback there.
    let loaders = if loader == "quilt" {
        serde_json::json!(["quilt", "fabric"])
    } else {
        serde_json::json!([loader])
    };
    let url = format!(
        "{}project/{slug}/version?loaders={}&game_versions={}",
        env!("MODRINTH_API_URL"),
        urlencoding::encode(&loaders.to_string()),
        urlencoding::encode(&serde_json::json!([game_version]).to_string()),
    );
    let versions: Vec<ProjectVersion> = crate::util::fetch::fetch_json(
        Method::GET,
        &url,
        None,
        None,
        None,
        &state.api_semaphore,
        &state.pool,
    )
    .await?;

    let Some(file) = versions.into_iter().find_map(|version| {
        let mut files = version.files;
        let index = files.iter().position(|file| file.primary).unwrap_or(0);
        (index < files.len()).then(|| files.swap_remove(index))
    }) else {
        return Ok(false);
    };

    let bytes = crate::util::fetch::fetch(
        &file.url,
        Some(&file.hashes.sha1),
        None,
        None,
        &state.fetch_semaphore,
        &state.pool,
    )
    .await?;
    if let Some(parent) = target.parent() {
        crate::util::io::create_dir_all(parent).await?;
    }
    crate::util::io::write(target, &bytes).await?;
    Ok(true)
}

async fn recently_failed(marker: &Path) -> bool {
    let Ok(metadata) = crate::util::io::metadata(marker).await else {
        return false;
    };
    metadata
        .modified()
        .ok()
        .and_then(|modified| {
            std::time::SystemTime::now().duration_since(modified).ok()
        })
        .is_some_and(|elapsed| elapsed < RETRY_AFTER)
}

async fn mark(cache_dir: &Path, marker: &Path) {
    let _ = crate::util::io::create_dir_all(cache_dir).await;
    let _ = crate::util::io::write(marker, b"").await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hardening_respects_player_args() {
        let mut args =
            vec!["-Xmx4G".to_string(), "-XX:+UsePerfData".to_string()];
        harden_jvm_args(&mut args);
        assert!(args.contains(&"-Dlog4j2.formatMsgNoLookups=true".to_string()));
        assert!(!args.contains(&"-XX:-UsePerfData".to_string()));
    }
}
