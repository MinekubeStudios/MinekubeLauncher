use crate::api::Result;
use tauri::Runtime;
use theseus::prelude::*;

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("settings")
        .invoke_handler(tauri::generate_handler![
            settings_get,
            settings_set,
            store_usage,
            store_cleanup,
            store_set_cache_limit,
            store_verify,
            cancel_directory_change,
            shield_check,
            shield_scan_mods,
            shield_clean_logs
        ])
        .build()
}

#[tauri::command]
pub async fn store_usage() -> Result<settings::StoreUsage> {
    Ok(settings::store_usage().await?)
}

#[tauri::command]
pub async fn store_cleanup() -> Result<u64> {
    Ok(settings::store_cleanup().await?)
}

#[tauri::command]
pub async fn store_set_cache_limit(bytes: u64) -> Result<()> {
    Ok(settings::store_set_cache_limit(bytes).await?)
}

#[tauri::command]
pub async fn store_verify(
    repair: bool,
    on_progress: tauri::ipc::Channel<(u64, u64)>,
) -> Result<settings::StoreVerification> {
    let last_sent = std::sync::Mutex::new(
        std::time::Instant::now() - std::time::Duration::from_secs(1),
    );
    Ok(
        settings::store_verify_with_progress(repair, &|current, total| {
            let mut last = last_sent.lock().unwrap();
            if current == 0
                || current >= total
                || last.elapsed() >= std::time::Duration::from_millis(200)
            {
                let _ = on_progress.send((current, total));
                *last = std::time::Instant::now();
            }
        })
        .await?,
    )
}

// Get full settings
// invoke('plugin:settings|settings_get')
#[tauri::command]
pub async fn settings_get() -> Result<Settings> {
    let res = settings::get().await?;
    Ok(res)
}

// Set full settings
// invoke('plugin:settings|settings_set', settings)
#[tauri::command]
pub async fn settings_set(settings: Settings) -> Result<()> {
    settings::set(settings).await?;
    Ok(())
}

#[tauri::command]
pub async fn cancel_directory_change<R: Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<()> {
    let identifier = &app.config().identifier;
    settings::cancel_directory_change(identifier).await?;
    Ok(())
}

/// Minekube Shield: verdict for a request the interface is about to make.
/// Returns `true` when it may go ahead.
#[tauri::command]
pub fn shield_check(url: String) -> bool {
    theseus::shield::check_url(&url)
}

/// Minekube Shield: scans an instance's mods for known malware.
#[tauri::command]
pub async fn shield_scan_mods(
    instance_id: String,
) -> Result<Vec<theseus::mod_scan::ScanFinding>> {
    Ok(theseus::mod_scan::scan_instance(&instance_id).await?)
}

/// Minekube Shield: deletes game logs and crash reports. With `older_than_days`
/// only files older than that are removed; without it, all of them.
#[tauri::command]
pub async fn shield_clean_logs(
    older_than_days: Option<u32>,
) -> Result<theseus::log_cleanup::CleanupReport> {
    Ok(theseus::log_cleanup::clean_logs(older_than_days).await?)
}
