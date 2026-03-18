/// Hide the WebView2 "sharing your screen" infobar.
///
/// WebView2 renders the infobar as a child window of class
/// "Chrome_WidgetWin_1" or "Chrome_RenderWidgetHostHWND".
/// We find the child whose title contains sharing-related text and hide it.
///
/// This runs in a background thread that polls every 500ms while screen
/// sharing is active.

use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    EnumChildWindows, EnumWindows, GetClassNameW, GetWindowTextW,
    ShowWindow, SW_HIDE, IsWindowVisible,
};

static HIDING_ACTIVE: AtomicBool = AtomicBool::new(false);

pub fn start_hide_infobar() {
    if HIDING_ACTIVE.swap(true, Ordering::SeqCst) {
        return; // already running
    }
    std::thread::spawn(|| {
        while HIDING_ACTIVE.load(Ordering::SeqCst) {
            #[cfg(target_os = "windows")]
            hide_webview2_infobar();
            std::thread::sleep(std::time::Duration::from_millis(300));
        }
    });
}

pub fn stop_hide_infobar() {
    HIDING_ACTIVE.store(false, Ordering::SeqCst);
}

#[cfg(target_os = "windows")]
fn hide_webview2_infobar() {
    unsafe {
        // Enumerate all top-level windows, look for WebView2 host
        extern "system" fn enum_top(hwnd: HWND, _: LPARAM) -> BOOL {
            unsafe {
                let mut class = [0u16; 256];
                GetClassNameW(hwnd, &mut class);
                let class_str = String::from_utf16_lossy(&class);
                if class_str.contains("Chrome_WidgetWin") {
                    // Enumerate children to find infobar
                    extern "system" fn enum_child(child: HWND, _: LPARAM) -> BOOL {
                        unsafe {
                            let mut title = [0u16; 512];
                            let len = GetWindowTextW(child, &mut title);
                            if len > 0 {
                                let text = String::from_utf16_lossy(&title[..len as usize]).to_lowercase();
                                if text.contains("sharing") || text.contains("screen") {
                                    if IsWindowVisible(child).as_bool() {
                                        let _ = ShowWindow(child, SW_HIDE);
                                    }
                                }
                            }
                            // Also check class name for infobar containers
                            let mut class = [0u16; 256];
                            GetClassNameW(child, &mut class);
                            let class_str = String::from_utf16_lossy(&class).to_lowercase();
                            if class_str.contains("infobar") || class_str.contains("notification") {
                                if IsWindowVisible(child).as_bool() {
                                    let _ = ShowWindow(child, SW_HIDE);
                                }
                            }
                            BOOL(1)
                        }
                    }
                    let _ = EnumChildWindows(hwnd, Some(enum_child), LPARAM(0));
                }
                BOOL(1)
            }
        }
        let _ = EnumWindows(Some(enum_top), LPARAM(0));
    }
}

#[tauri::command]
pub fn set_screen_share_active(active: bool) {
    if active {
        start_hide_infobar();
    } else {
        stop_hide_infobar();
    }
}
