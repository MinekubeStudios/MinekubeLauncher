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
    let mut directories = vec![folder.to_path_buf()];
    while let Some(folder) = directories.pop() {
        if !std::fs::symlink_metadata(&folder).is_ok_and(|m| m.is_dir()) {
            continue;
        }
        let Ok(entries) = std::fs::read_dir(folder) else {
            continue;
        };
        for entry in entries.flatten() {
            let Ok(metadata) = entry.metadata() else {
                continue;
            };
            if metadata.is_dir() {
                directories.push(entry.path());
                continue;
            }
            if !metadata.is_file()
                || cutoff.is_some_and(|cutoff| {
                    metadata
                        .modified()
                        .map_or(true, |modified| modified > cutoff)
                })
            {
                continue;
            }
            if std::fs::remove_file(entry.path()).is_ok() {
                report.files_removed += 1;
                report.bytes_freed += metadata.len();
            }
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
            if !instance.file_type().is_ok_and(|ty| ty.is_dir()) {
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
    .await?;

    if report.files_removed > 0 {
        tracing::info!(
            "Removed {} log file(s), {} bytes",
            report.files_removed,
            report.bytes_freed
        );
    }
    Ok(report)
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use std::os::unix::fs::symlink;

    #[test]
    fn cleanup_does_not_follow_symlinked_log_directories() {
        let temp = tempfile::tempdir().unwrap();
        let outside = temp.path().join("outside");
        let log_file = outside.join("keep.txt");
        std::fs::create_dir(&outside).unwrap();
        std::fs::write(&log_file, b"keep").unwrap();
        let logs = temp.path().join("logs");
        symlink(&outside, &logs).unwrap();
        let mut report = CleanupReport::default();
        clean_folder(&logs, None, &mut report);
        assert_eq!(report.files_removed, 0);
        assert!(log_file.is_file());
    }
}
