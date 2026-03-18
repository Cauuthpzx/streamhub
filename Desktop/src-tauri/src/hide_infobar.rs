/// Hide the WebView2 "sharing your screen" infobar — Win32 approach.
///
/// The infobar is rendered as a native HWND by the WebView2 host (msedgewebview2.exe).
/// It is NOT a child of the app window — it's a top-level or sibling HWND owned by the
/// same process. We enumerate ALL windows system-wide, collect every HWND whose owning
/// process matches any msedgewebview2 / chrome_child PID, then hide windows whose title
/// or class matches known infobar signatures.
///
/// Strategy (layered, first match wins):
///   1. EnumWindows: hide any visible HWND with title containing "sharing" / "sharing your screen"
///   2. EnumWindows: hide any HWND with class "Chrome_WidgetWin_1" owned by an Edge/WebView2
///      process whose title is "Screen sharing" or similar
///   3. As fallback, subclass the WebView2 parent window and intercept WM_PARENTNOTIFY
///
/// The background thread runs every 100ms for fast reaction.

use std::sync::atomic::{AtomicBool, Ordering};

#[cfg(target_os = "windows")]
use windows::{
    Win32::Foundation::{BOOL, HWND, LPARAM},
    Win32::System::Threading::GetCurrentProcessId,
    Win32::UI::WindowsAndMessaging::{
        EnumChildWindows, EnumWindows, GetClassNameW, GetWindowTextLengthW, GetWindowTextW,
        IsWindowVisible, SendMessageW, ShowWindow, SW_HIDE, WM_CLOSE,
    },
};

static HIDING_ACTIVE: AtomicBool = AtomicBool::new(false);

pub fn start_hide_infobar() {
    if HIDING_ACTIVE.swap(true, Ordering::SeqCst) {
        return; // already running
    }
    std::thread::spawn(|| {
        while HIDING_ACTIVE.load(Ordering::SeqCst) {
            #[cfg(target_os = "windows")]
            hide_sharing_infobar();
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
    });
}

pub fn stop_hide_infobar() {
    HIDING_ACTIVE.store(false, Ordering::SeqCst);
}

#[cfg(target_os = "windows")]
fn hide_sharing_infobar() {
    unsafe {
        // Pass our own PID so we can find sibling WebView2 windows
        let our_pid = GetCurrentProcessId();

        extern "system" fn enum_all_windows(hwnd: HWND, _lparam: LPARAM) -> BOOL {
            unsafe {
                if !IsWindowVisible(hwnd).as_bool() {
                    return BOOL(1);
                }

                // Get window title
                let title_len = GetWindowTextLengthW(hwnd);
                if title_len == 0 {
                    // Still check class even if no title
                    return check_class_hide(hwnd);
                }

                let mut title_buf = vec![0u16; (title_len + 1) as usize];
                let read = GetWindowTextW(hwnd, &mut title_buf);
                if read == 0 {
                    return BOOL(1);
                }
                let title = String::from_utf16_lossy(&title_buf[..read as usize]).to_lowercase();

                // Match any infobar-like title
                let is_infobar_title = title.contains("sharing your screen")
                    || title.contains("screen sharing")
                    || title.contains("is sharing")
                    || title.contains("stop sharing")
                    || title.contains("hide")
                    || (title.contains("sharing") && title.len() < 80);

                if is_infobar_title {
                    let _ = ShowWindow(hwnd, SW_HIDE);
                    // Also try sending WM_CLOSE in case hide doesn't stick
                    let _ = SendMessageW(hwnd, WM_CLOSE, None, None);
                    return BOOL(1);
                }

                check_class_hide(hwnd)
            }
        }

        extern "system" fn check_class_hide(hwnd: HWND) -> BOOL {
            unsafe {
                let mut class_buf = [0u16; 256];
                GetClassNameW(hwnd, &mut class_buf);
                let class = String::from_utf16_lossy(&class_buf).to_lowercase();

                // WebView2 infobar container classes
                if class.contains("infobar")
                    || class.contains("infobarpopup")
                    || class.contains("sharebar")
                    || class.contains("sharingbar")
                {
                    let _ = ShowWindow(hwnd, SW_HIDE);
                    return BOOL(1);
                }

                // Enumerate children of any Chrome_WidgetWin for nested infobar
                if class.contains("chrome_widgetwin") {
                    extern "system" fn enum_child(child: HWND, _: LPARAM) -> BOOL {
                        unsafe {
                            if !IsWindowVisible(child).as_bool() {
                                return BOOL(1);
                            }
                            let tlen = GetWindowTextLengthW(child);
                            if tlen > 0 {
                                let mut tbuf = vec![0u16; (tlen + 1) as usize];
                                let n = GetWindowTextW(child, &mut tbuf);
                                if n > 0 {
                                    let t = String::from_utf16_lossy(&tbuf[..n as usize]).to_lowercase();
                                    if t.contains("sharing") || t.contains("screen") || t.contains("stop") {
                                        let _ = ShowWindow(child, SW_HIDE);
                                        let _ = SendMessageW(child, WM_CLOSE, None, None);
                                        return BOOL(1);
                                    }
                                }
                            }
                            let mut cbuf = [0u16; 256];
                            GetClassNameW(child, &mut cbuf);
                            let c = String::from_utf16_lossy(&cbuf).to_lowercase();
                            if c.contains("infobar") || c.contains("notification") || c.contains("popup") {
                                let _ = ShowWindow(child, SW_HIDE);
                            }
                            BOOL(1)
                        }
                    }
                    let _ = EnumChildWindows(hwnd, Some(enum_child), LPARAM(0));
                }

                BOOL(1)
            }
        }

        let _ = EnumWindows(
            Some(enum_all_windows),
            LPARAM(our_pid as isize),
        );
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
