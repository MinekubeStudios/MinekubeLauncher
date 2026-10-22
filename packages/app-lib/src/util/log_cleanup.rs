//! Clean-up of game logs and crash reports.
//!
//! Minecraft logs keep server addresses, chat, player names and paths for as
//! long as they sit on disk. Minekube Shield removes old ones automatically
//! and lets the player clear all of them at once.

use serde::Serialize;
use std::path::Path;
use std::time::{Duration, SystemTime};

#[derive(Serialize, Debug, Default, Clone, Copy)]
pub struct CleanupReport {
    pub files_removed: u64,
    pub bytes_freed: u64,
}

const LOG_FOLDERS: &[&str] = &["logs", "crash-reports"];

fn clean_folder(
    folder: &Path,
    cutoff: Option<SystemTime>,
    report: &mut CleanupReport,
) {
    let Ok(entries) = std::fs::read_dir(folder) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        if metadata.is_dir() {
            // e.g. logs/telemetry, logs/blobs
            clean_folder(&path, cutoff, report);
            continue;
        }
        if let Some(cutoff) = cutoff {
            let modified =
                metadata.modified().unwrap_or_else(|_| SystemTime::now());
            if modified > cutoff {
                continue;
            }
        }
        // A log the running game still holds open cannot be removed on
        // Windows; that is fine, it goes next time.
        if std::fs::remove_file(&path).is_ok() {
            report.files_removed += 1;
            report.bytes_freed += metadata.len();
        }
    }
}

/// Removes logs and crash reports of every instance. With `older_than_days`
/// only files last changed before then are removed.
pub async fn clean_logs(
    older_than_days: Option<u32>,
) -> crate::Result<CleanupReport> {
    let state = crate::State::get().await?;
    let instances_dir = state.directories.instances_dir();
    let cutoff = older_than_days.map(|days| {
        SystemTime::now()
            .checked_sub(Duration::from_secs(u64::from(days) * 24 * 60 * 60))
            .unwrap_or(SystemTime::UNIX_EPOCH)
    });

    let report = tokio::task::spawn_blocking(move || {
        let mut report = CleanupReport::default();
        let Ok(instances) = std::fs::read_dir(&instances_dir) else {
            return report;
        };
        for instance in instances.flatten() {
            if !instance.path().is_dir() {
                continue;
            }
            for folder in LOG_FOLDERS {
                clean_folder(
                    &instance.path().join(folder),
                    cutoff,
                    &mut report,
                );
            }
        }
        report
    })
    .await
    .unwrap_or_default();

    if report.files_removed > 0 {
        tracing::info!(
            "Removed {} log file(s), {} bytes",
            report.files_removed,
            report.bytes_freed
        );
    }
    Ok(report)
}
