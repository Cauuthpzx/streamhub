/// Hide the WebView2 "sharing your screen" infobar.
///
/// The infobar is a top-level Win32 window owned by WebView2:
///   class: "Chrome_WidgetWin_1"
///   title: "localhost:3000 is sharing your screen."
///
/// WebView2 re-creates this window every time it is closed/hidden, so we must
/// continuously suppress it. We use three techniques simultaneously:
///   1. SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE) — hides from screen capture
///   2. SetWindowPos with SWP_HIDEWINDOW  — removes from taskbar/view
///   3. MoveWindow to (-32000, -32000)    — moves off-screen as last resort
///
/// A background thread polls every 80ms while screen sharing is active.
/// install_infobar_hider() also registers a WinEvent hook (EVENT_OBJECT_SHOW)
/// so we react instantly when WebView2 shows the window, with no polling delay.

use std::sync::atomic::{AtomicBool, Ordering};

#[cfg(windows)]
use windows::{
    Win32::Foundation::{BOOL, HWND, LPARAM, LRESULT, WPARAM},
    Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetClassNameW, GetWindowTextLengthW, GetWindowTextW,
        IsWindowVisible, SetWindowDisplayAffinity, SetWindowPos,
        ShowWindow, SW_HIDE, SWP_NOACTIVATE, SWP_NOZORDER, HWND_TOP,
        WDA_EXCLUDEFROMCAPTURE,
        EVENT_OBJECT_SHOW, WINEVENT_OUTOFCONTEXT, WINEVENT_SKIPOWNPROCESS,
    },
    Win32::UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK},
    Win32::System::Threading::GetCurrentProcessId,
};

static HIDING_ACTIVE: AtomicBool = AtomicBool::new(false);

#[cfg(windows)]
static mut EVENT_HOOK: Option<HWINEVENTHOOK> = None;

pub fn start_hide_infobar() {
    if HIDING_ACTIVE.swap(true, Ordering::SeqCst) {
        return;
    }
    std::thread::spawn(|| {
        while HIDING_ACTIVE.load(Ordering::SeqCst) {
            #[cfg(windows)]
            suppress_infobar_windows();
            std::thread::sleep(std::time::Duration::from_millis(80));
        }
    });
}

pub fn stop_hide_infobar() {
    HIDING_ACTIVE.store(false, Ordering::SeqCst);
}

#[cfg(windows)]
fn is_infobar(hwnd: HWND) -> bool {
    unsafe {
        if !IsWindowVisible(hwnd).as_bool() {
            return false;
        }
        let mut cbuf = [0u16; 64];
        GetClassNameW(hwnd, &mut cbuf);
        let class = String::from_utf16_lossy(&cbuf);
        if !class.starts_with("Chrome_WidgetWin") {
            return false;
        }
        let tlen = GetWindowTextLengthW(hwnd);
        if tlen == 0 {
            return false;
        }
        let mut tbuf = vec![0u16; (tlen + 1) as usize];
        let n = GetWindowTextW(hwnd, &mut tbuf);
        if n == 0 {
            return false;
        }
        let title = String::from_utf16_lossy(&tbuf[..n as usize]).to_lowercase();
        title.contains("sharing your screen")
            || title.contains("is sharing")
            || title.contains("screen sharing")
    }
}

#[cfg(windows)]
fn suppress_hwnd(hwnd: HWND) {
    unsafe {
        // 1. Exclude from screen capture (also visually hides in WebView2 overlay stack)
        let _ = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
        // 2. Hide the window
        let _ = ShowWindow(hwnd, SW_HIDE);
        // 3. Move off-screen as belt+suspenders
        let _ = SetWindowPos(
            hwnd,
            HWND_TOP,
            -32000, -32000,
            0, 0,
            SWP_NOACTIVATE | SWP_NOZORDER,
        );
    }
}

#[cfg(windows)]
fn suppress_infobar_windows() {
    unsafe {
        extern "system" fn enum_cb(hwnd: HWND, _: LPARAM) -> BOOL {
            if is_infobar(hwnd) {
                suppress_hwnd(hwnd);
            }
            BOOL(1)
        }
        let _ = EnumWindows(Some(enum_cb), LPARAM(0));
    }
}

/// WinEvent hook callback — fires immediately when any window becomes visible.
#[cfg(windows)]
unsafe extern "system" fn winevent_cb(
    _hook: HWINEVENTHOOK,
    _event: u32,
    hwnd: HWND,
    _id_object: i32,
    _id_child: i32,
    _id_event_thread: u32,
    _dwms_event_time: u32,
) {
    if HIDING_ACTIVE.load(Ordering::Relaxed) && is_infobar(hwnd) {
        suppress_hwnd(hwnd);
    }
}

/// Called once at app startup. Installs a WinEvent hook reacting to EVENT_OBJECT_SHOW.
pub fn install_infobar_hider() {
    #[cfg(windows)]
    unsafe {
        let hook = SetWinEventHook(
            EVENT_OBJECT_SHOW,
            EVENT_OBJECT_SHOW,
            None,
            Some(winevent_cb),
            0, // all processes
            0, // all threads
            WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS,
        );
        EVENT_HOOK = Some(hook);
    }
}

/// Tauri command toggling the poller + immediate sweep.
#[tauri::command]
pub fn set_screen_share_active(active: bool) {
    if active {
        start_hide_infobar();
        #[cfg(windows)]
        suppress_infobar_windows();
    } else {
        stop_hide_infobar();
    }
}
