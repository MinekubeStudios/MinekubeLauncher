//! Mod scanner — checks an instance's mods for known malware before launch.
//!
//! Every `.jar` in `mods` is opened and its classes are searched for the
//! fingerprints of malware that has hit the Minecraft community (the
//! Fractureiser / "nekoclient" campaign, account and Discord token stealers):
//! command-and-control addresses, injected package names, and the combination
//! of a data-exfiltration channel with the files those stealers read.
//!
//! The scan only warns — the player decides whether to launch. Results are
//! cached per file (path, size and modification time), so only new or changed
//! mods are read again and a launch is not slowed down.
//!
//! A scanner like this catches known and unsophisticated threats; heavily
//! obfuscated malware can still get through, so mods should come from sources
//! you trust.

use aho_corasick::AhoCorasick;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;
use std::time::UNIX_EPOCH;
use tokio::sync::Mutex;

/// How bad a finding is.
#[derive(
    Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord,
)]
#[serde(rename_all = "snake_case")]
pub enum ScanSeverity {
    Suspicious,
    Danger,
}

/// Why a mod was flagged. The interface turns these into readable text.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ScanReason {
    /// Code or addresses of the Fractureiser / nekoclient malware.
    KnownMalware,
    /// Sends data to a webhook or bot and reads stored logins or tokens.
    CredentialTheft,
    /// Reads stored logins, browser data or launcher accounts.
    ReadsCredentials,
    /// Sends data to a Discord webhook or Telegram bot.
    ExfiltrationChannel,
    /// Runs hidden PowerShell or command-line scripts.
    HiddenCommands,
    /// Carries a Windows program or script inside the mod.
    EmbeddedExecutable,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScanFinding {
    pub file_name: String,
    pub severity: ScanSeverity,
    pub reasons: Vec<ScanReason>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Signal {
    Malware,
    Exfiltration,
    Credentials,
    HiddenCommand,
}

const PATTERNS: &[(&str, Signal)] = &[
    // Fractureiser / nekoclient (June 2023)
    ("dev/neko/nekoclient", Signal::Malware),
    ("dev/neko/nekoinjector", Signal::Malware),
    ("dev/neko/nekoclient/Client", Signal::Malware),
    ("85.217.144.130", Signal::Malware),
    ("107.189.3.101", Signal::Malware),
    ("files-8ie.pages.dev", Signal::Malware),
    ("skyrage", Signal::Malware),
    // Channels stealers send their loot through
    ("discord.com/api/webhooks", Signal::Exfiltration),
    ("discordapp.com/api/webhooks", Signal::Exfiltration),
    ("canary.discord.com/api/webhooks", Signal::Exfiltration),
    ("ptb.discord.com/api/webhooks", Signal::Exfiltration),
    ("api.telegram.org/bot", Signal::Exfiltration),
    // Files and APIs token stealers read
    ("Local Storage\\\\leveldb", Signal::Credentials),
    ("Local Storage/leveldb", Signal::Credentials),
    ("Local Storage\\leveldb", Signal::Credentials),
    ("\\Login Data", Signal::Credentials),
    ("/Login Data", Signal::Credentials),
    ("Crypt32Util", Signal::Credentials),
    ("CryptUnprotectData", Signal::Credentials),
    ("launcher_accounts.json", Signal::Credentials),
    (
        "launcher_accounts_microsoft_store.json",
        Signal::Credentials,
    ),
    ("microsoft_accounts.json", Signal::Credentials),
    (
        "lunarclient/settings/game/accounts.json",
        Signal::Credentials,
    ),
    (
        ".lunarclient/settings/game/accounts.json",
        Signal::Credentials,
    ),
    ("feather/accounts.json", Signal::Credentials),
    ("PrismLauncher/accounts.json", Signal::Credentials),
    ("ModrinthApp/app.db", Signal::Credentials),
    ("Exodus/exodus.wallet", Signal::Credentials),
    // Hidden script execution
    ("-EncodedCommand", Signal::HiddenCommand),
    ("-WindowStyle Hidden", Signal::HiddenCommand),
    ("-windowstyle hidden", Signal::HiddenCommand),
];

const EXECUTABLE_EXTENSIONS: &[&str] =
    &[".exe", ".bat", ".cmd", ".ps1", ".vbs", ".scr"];
/// Classes larger than this are skipped (generated tables, not logic).
const MAX_CLASS_BYTES: u64 = 4 * 1024 * 1024;

static MATCHER: LazyLock<AhoCorasick> = LazyLock::new(|| {
    AhoCorasick::new(PATTERNS.iter().map(|(pattern, _)| *pattern))
        .expect("scanner patterns are valid")
});

#[derive(Serialize, Deserialize, Clone)]
struct CacheEntry {
    size: u64,
    modified: u64,
    finding: Option<ScanFinding>,
}

const CACHE_VERSION: u32 = 1;

#[derive(Serialize, Deserialize, Default)]
struct ScanCache {
    version: u32,
    entries: HashMap<String, CacheEntry>,
}

static CACHE_LOCK: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

fn scan_jar(path: &Path, file_name: &str) -> Option<ScanFinding> {
    let file = std::fs::File::open(path).ok()?;
    let mut archive =
        zip::ZipArchive::new(std::io::BufReader::new(file)).ok()?;
    let mut signals: Vec<Signal> = Vec::new();
    let mut embedded_executable = false;
    let mut buffer = Vec::new();

    for index in 0..archive.len() {
        let Ok(mut entry) = archive.by_index(index) else {
            continue;
        };
        let name = entry.name().to_ascii_lowercase();
        if EXECUTABLE_EXTENSIONS.iter().any(|ext| name.ends_with(ext)) {
            embedded_executable = true;
            continue;
        }
        if name.contains("dev/neko/") {
            signals.push(Signal::Malware);
        }
        if !name.ends_with(".class") || entry.size() > MAX_CLASS_BYTES {
            continue;
        }
        // Bundled copies of JNA mention the Windows crypto API by design;
        // what matters is code outside the library that calls it.
        if name.starts_with("com/sun/jna/") {
            continue;
        }
        buffer.clear();
        if entry.read_to_end(&mut buffer).is_err() {
            continue;
        }
        for found in MATCHER.find_overlapping_iter(&buffer) {
            let signal = PATTERNS[found.pattern().as_usize()].1;
            if !signals.contains(&signal) {
                signals.push(signal);
            }
        }
        if signals.contains(&Signal::Malware) {
            break;
        }
    }

    let has = |signal| signals.contains(&signal);
    let mut reasons = Vec::new();
    let mut severity = ScanSeverity::Suspicious;
    if has(Signal::Malware) {
        reasons.push(ScanReason::KnownMalware);
        severity = ScanSeverity::Danger;
    }
    if has(Signal::Exfiltration) && has(Signal::Credentials) {
        reasons.push(ScanReason::CredentialTheft);
        severity = ScanSeverity::Danger;
    } else if has(Signal::Credentials) {
        reasons.push(ScanReason::ReadsCredentials);
    } else if has(Signal::Exfiltration) {
        reasons.push(ScanReason::ExfiltrationChannel);
    }
    if has(Signal::HiddenCommand) {
        reasons.push(ScanReason::HiddenCommands);
    }
    if embedded_executable {
        reasons.push(ScanReason::EmbeddedExecutable);
    }

    (!reasons.is_empty()).then(|| ScanFinding {
        file_name: file_name.to_string(),
        severity,
        reasons,
    })
}

fn modified_secs(metadata: &std::fs::Metadata) -> u64 {
    metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map_or(0, |duration| duration.as_secs())
}

fn scan_dir(mods_dir: &Path, cache: &mut ScanCache) -> Vec<ScanFinding> {
    let Ok(entries) = std::fs::read_dir(mods_dir) else {
        return Vec::new();
    };
    let mut findings = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        let Some(file_name) = path.file_name().and_then(|name| name.to_str())
        else {
            continue;
        };
        if !file_name.to_ascii_lowercase().ends_with(".jar") {
            continue;
        }
        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        let key = path.to_string_lossy().into_owned();
        let size = metadata.len();
        let modified = modified_secs(&metadata);
        let finding = match cache.entries.get(&key) {
            Some(cached)
                if cached.size == size && cached.modified == modified =>
            {
                cached.finding.clone()
            }
            _ => {
                let finding = scan_jar(&path, file_name);
                cache.entries.insert(
                    key,
                    CacheEntry {
                        size,
                        modified,
                        finding: finding.clone(),
                    },
                );
                finding
            }
        };
        if let Some(finding) = finding {
            findings.push(finding);
        }
    }
    findings.sort_by(|a, b| {
        b.severity
            .cmp(&a.severity)
            .then_with(|| a.file_name.cmp(&b.file_name))
    });
    findings
}

async fn cache_path() -> Option<PathBuf> {
    let state = crate::State::get().await.ok()?;
    Some(
        state
            .directories
            .caches_dir()
            .join("minekube")
            .join("mod-scan.json"),
    )
}

/// Scans the mods of one instance. Never fails: problems reading a file just
/// mean that file is not reported.
pub async fn scan_instance(
    instance_id: &str,
) -> crate::Result<Vec<ScanFinding>> {
    let instance_path =
        crate::api::instance::get_full_path(instance_id).await?;
    let mods_dir = instance_path.join("mods");
    let cache_file = cache_path().await;

    let _guard = CACHE_LOCK.lock().await;
    let findings = tokio::task::spawn_blocking(move || {
        let mut cache: ScanCache = cache_file
            .as_ref()
            .and_then(|file| std::fs::read(file).ok())
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .filter(|cache: &ScanCache| cache.version == CACHE_VERSION)
            .unwrap_or_default();
        cache.version = CACHE_VERSION;
        // Forget files that no longer exist so the cache cannot grow forever.
        cache.entries.retain(|path, _| Path::new(path).exists());

        let findings = scan_dir(&mods_dir, &mut cache);

        if let Some(file) = cache_file {
            if let Some(parent) = file.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            if let Ok(bytes) = serde_json::to_vec(&cache) {
                let _ = std::fs::write(file, bytes);
            }
        }
        findings
    })
    .await
    .unwrap_or_default();

    if !findings.is_empty() {
        tracing::warn!(
            "Mod scanner flagged {} file(s) in instance {instance_id}",
            findings.len()
        );
    }
    Ok(findings)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn jar_with(entries: &[(&str, &[u8])]) -> tempfile::NamedTempFile {
        let file = tempfile::NamedTempFile::new().unwrap();
        let mut zip = zip::ZipWriter::new(file.reopen().unwrap());
        for (name, data) in entries {
            zip.start_file(*name, zip::write::SimpleFileOptions::default())
                .unwrap();
            zip.write_all(data).unwrap();
        }
        zip.finish().unwrap();
        file
    }

    #[test]
    fn clean_mod_passes() {
        let jar = jar_with(&[("com/example/Mod.class", b"just a normal mod")]);
        assert!(scan_jar(jar.path(), "clean.jar").is_none());
    }

    #[test]
    fn fractureiser_is_danger() {
        let jar = jar_with(&[("dev/neko/nekoclient/Client.class", b"x")]);
        let finding = scan_jar(jar.path(), "bad.jar").unwrap();
        assert_eq!(finding.severity, ScanSeverity::Danger);
        assert_eq!(finding.reasons, vec![ScanReason::KnownMalware]);
    }

    #[test]
    fn stealer_combination_is_danger() {
        let jar = jar_with(&[(
            "a/B.class",
            b"https://discord.com/api/webhooks/1/x ... launcher_accounts.json",
        )]);
        let finding = scan_jar(jar.path(), "stealer.jar").unwrap();
        assert_eq!(finding.severity, ScanSeverity::Danger);
        assert!(finding.reasons.contains(&ScanReason::CredentialTheft));
    }

    #[test]
    fn webhook_alone_is_only_suspicious() {
        let jar = jar_with(&[("a/B.class", b"discord.com/api/webhooks/1/x")]);
        let finding = scan_jar(jar.path(), "hook.jar").unwrap();
        assert_eq!(finding.severity, ScanSeverity::Suspicious);
    }
}
