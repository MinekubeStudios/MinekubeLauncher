use crate::api::Result;
use theseus::prelude::*;
use uuid::Uuid;

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("process")
        .invoke_handler(tauri::generate_handler![
            process_get_all,
            process_get_by_instance_id,
            process_has_game_window,
            process_kill,
            process_wait_for,
        ])
        .build()
}

#[tauri::command]
pub async fn process_get_all() -> Result<Vec<ProcessMetadata>> {
    Ok(process::get_all().await?)
}

#[tauri::command]
pub async fn process_get_by_instance_id(
    instance_id: &str,
) -> Result<Vec<ProcessMetadata>> {
    Ok(process::get_by_instance_id(instance_id).await?)
}

#[tauri::command]
pub async fn process_has_game_window(instance_id: &str) -> Result<bool> {
    if process::has_minecraft_window_log(instance_id) {
        return Ok(true);
    }

    let pids = process::get_pids_by_instance_id(instance_id).await?;
    if pids.is_empty() {
        return Ok(false);
    }

    Ok(has_visible_os_game_window(&pids))
}

#[tauri::command]
pub async fn process_kill(uuid: Uuid) -> Result<()> {
    Ok(process::kill(uuid).await?)
}

#[tauri::command]
pub async fn process_wait_for(uuid: Uuid) -> Result<()> {
    Ok(process::wait_for(uuid).await?)
}

#[cfg(target_os = "windows")]
fn has_visible_os_game_window(pids: &[u32]) -> bool {
    use windows::Win32::Foundation::{HWND, RECT};
    use windows::Win32::Graphics::Dwm::{DWMWA_CLOAKED, DwmGetWindowAttribute};
    use windows::Win32::UI::WindowsAndMessaging::{
        GW_HWNDNEXT, GetClassNameW, GetTopWindow, GetWindow, GetWindowRect,
        GetWindowThreadProcessId, IsIconic, IsWindowVisible,
    };

    fn is_cloaked(hwnd: HWND) -> bool {
        let mut cloaked = 0u32;
        unsafe {
            DwmGetWindowAttribute(
                hwnd,
                DWMWA_CLOAKED,
                &mut cloaked as *mut u32 as *mut _,
                std::mem::size_of::<u32>() as u32,
            )
        }
        .is_ok()
            && cloaked != 0
    }

    let mut hwnd = match unsafe { GetTopWindow(None) } {
        Ok(hwnd) => hwnd,
        Err(_) => return false,
    };

    while !hwnd.is_invalid() {
        let mut win_pid = 0u32;
        unsafe {
            GetWindowThreadProcessId(hwnd, Some(&mut win_pid));
        }

        if win_pid != 0
            && pids.contains(&win_pid)
            && unsafe { IsWindowVisible(hwnd).as_bool() }
            && !unsafe { IsIconic(hwnd).as_bool() }
            && !is_cloaked(hwnd)
        {
            let mut rect = RECT::default();
            if unsafe { GetWindowRect(hwnd, &mut rect) }.is_ok() {
                let width = rect.right - rect.left;
                let height = rect.bottom - rect.top;
                if width >= 120 && height >= 80 {
                    let mut class_buf = [0u16; 128];
                    let len =
                        unsafe { GetClassNameW(hwnd, &mut class_buf) } as usize;
                    let class_name = String::from_utf16_lossy(
                        &class_buf[..len.min(class_buf.len())],
                    );
                    if !matches!(
                        class_name.as_str(),
                        "ConsoleWindowClass" | "IME" | "MSCTFIME UI"
                    ) {
                        return true;
                    }
                }
            }
        }

        hwnd = match unsafe { GetWindow(hwnd, GW_HWNDNEXT) } {
            Ok(next) => next,
            Err(_) => break,
        };
    }

    false
}

#[cfg(target_os = "macos")]
fn has_visible_os_game_window(pids: &[u32]) -> bool {
    use core_foundation::array::CFArray;
    use core_foundation::base::{CFType, TCFType};
    use core_foundation::dictionary::CFDictionary;
    use core_foundation::number::CFNumber;
    use core_foundation::string::CFString;
    use core_graphics::display::CGDisplay;
    use core_graphics::geometry::CGRect;
    use core_graphics::window::{
        kCGWindowAlpha, kCGWindowBounds, kCGWindowLayer,
        kCGWindowListExcludeDesktopElements, kCGWindowListOptionOnScreenOnly,
        kCGWindowOwnerPID,
    };

    let Some(window_infos) = CGDisplay::window_list_info(
        kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
        None,
    ) else {
        return false;
    };

    let window_infos = unsafe {
        CFArray::<CFDictionary<CFString, CFType>>::wrap_under_get_rule(
            window_infos.as_concrete_TypeRef(),
        )
    };

    let pid_key = unsafe { CFString::wrap_under_get_rule(kCGWindowOwnerPID) };
    let layer_key = unsafe { CFString::wrap_under_get_rule(kCGWindowLayer) };
    let alpha_key = unsafe { CFString::wrap_under_get_rule(kCGWindowAlpha) };
    let bounds_key = unsafe { CFString::wrap_under_get_rule(kCGWindowBounds) };

    for info in window_infos.iter() {
        let Some(owner_pid) = info
            .find(&pid_key)
            .and_then(|v| v.downcast::<CFNumber>())
            .and_then(|n| n.to_i64())
            .and_then(|n| u32::try_from(n).ok())
        else {
            continue;
        };

        if !pids.contains(&owner_pid) {
            continue;
        }

        let layer = info
            .find(&layer_key)
            .and_then(|v| v.downcast::<CFNumber>())
            .and_then(|n| n.to_i64())
            .unwrap_or(-1);
        if layer != 0 {
            continue;
        }

        let alpha = info
            .find(&alpha_key)
            .and_then(|v| v.downcast::<CFNumber>())
            .and_then(|n| n.to_f64())
            .unwrap_or(1.0);
        if alpha <= 0.0 {
            continue;
        }

        if let Some(bounds) = info
            .find(&bounds_key)
            .and_then(|v| v.downcast::<CFDictionary>())
            && let Some(rect) = CGRect::from_dict_representation(&bounds)
            && rect.size.width >= 120.0
            && rect.size.height >= 80.0
        {
            return true;
        }
    }

    false
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn has_visible_os_game_window(_pids: &[u32]) -> bool {
    false
}
