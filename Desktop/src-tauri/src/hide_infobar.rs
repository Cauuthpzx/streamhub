/// Hide the WebView2 "sharing your screen" infobar.
///
/// From debug dump, the infobar is a TOP-LEVEL window:
///   class: "Chrome_WidgetWin_1"
///   title: "localhost:3000 is sharing your screen."
///
/// We EnumWindows every 100ms and SW_HIDE + WM_CLOSE any visible
/// Chrome_WidgetWin_1 whose title ends with "is sharing your screen."

use std::sync::atomic::{AtomicBool, Ordering};

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetClassNameW, GetWindowTextLengthW, GetWindowTextW,
    IsWindowVisible, PostMessageW, ShowWindow, SW_HIDE, WM_CLOSE,
};

static HIDING_ACTIVE: AtomicBool = AtomicBool::new(false);

pub fn start_hide_infobar() {
    if HIDING_ACTIVE.swap(true, Ordering::SeqCst) {
        return;
    }
    std::thread::spawn(|| {
        while HIDING_ACTIVE.load(Ordering::SeqCst) {
            #[cfg(target_os = "windows")]
            hide_sharing_bar();
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
    });
}

pub fn stop_hide_infobar() {
    HIDING_ACTIVE.store(false, Ordering::SeqCst);
}

#[cfg(target_os = "windows")]
fn hide_sharing_bar() {
    unsafe {
        extern "system" fn enum_cb(hwnd: HWND, _: LPARAM) -> BOOL {
            unsafe {
                if !IsWindowVisible(hwnd).as_bool() {
                    return BOOL(1);
                }

                // Must be Chrome_WidgetWin_1
                let mut cbuf = [0u16; 64];
                GetClassNameW(hwnd, &mut cbuf);
                let class = String::from_utf16_lossy(&cbuf);
                if !class.starts_with("Chrome_WidgetWin") {
                    return BOOL(1);
                }

                // Title must mention "sharing your screen"
                let tlen = GetWindowTextLengthW(hwnd);
                if tlen == 0 {
                    return BOOL(1);
                }
                let mut tbuf = vec![0u16; (tlen + 1) as usize];
                let n = GetWindowTextW(hwnd, &mut tbuf);
                if n == 0 {
                    return BOOL(1);
                }
                let title = String::from_utf16_lossy(&tbuf[..n as usize]).to_lowercase();
                if title.contains("sharing your screen")
                    || title.contains("is sharing")
                    || title.contains("screen sharing")
                {
                    let _ = ShowWindow(hwnd, SW_HIDE);
                    let _ = PostMessageW(hwnd, WM_CLOSE, None, None);
                }

                BOOL(1)
            }
        }
        let _ = EnumWindows(Some(enum_cb), LPARAM(0));
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
