use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct ScreenSource {
    pub id: String,       // "screen:0", "screen:1", "window:<hwnd>"
    pub name: String,     // "Entire Screen 1", "Window: Chrome"
    pub kind: String,     // "screen" | "window"
    pub primary: bool,
}

/// Enumerate all screens and visible top-level windows.
/// Returns sources sorted: primary screen first, then other screens, then windows.
#[tauri::command]
pub fn get_screen_sources() -> Vec<ScreenSource> {
    let mut sources: Vec<ScreenSource> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::{BOOL, HWND, LPARAM, RECT};
        use windows::Win32::Graphics::Gdi::{
            EnumDisplayMonitors, GetMonitorInfoW, HDC, HMONITOR, MONITORINFOEXW,
        };
        use windows::Win32::UI::WindowsAndMessaging::{
            EnumWindows, GetWindowTextW, IsWindowVisible,
            GetWindowLongW, GWL_EXSTYLE, WS_EX_TOOLWINDOW,
        };

        // ── Enumerate monitors ───────────────────────────────────────────

        // We'll collect monitor info via callback
        struct MonitorCtx {
            sources: Vec<ScreenSource>,
            index: i32,
        }

        extern "system" fn monitor_callback(
            hmonitor: HMONITOR,
            _hdc: HDC,
            _lprect: *mut RECT,
            lparam: LPARAM,
        ) -> BOOL {
            unsafe {
                let ctx = &mut *(lparam.0 as *mut MonitorCtx);
                let mut info = MONITORINFOEXW::default();
                info.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
                if GetMonitorInfoW(hmonitor, &mut info.monitorInfo as *mut _ as *mut _).as_bool() {
                    let primary = (info.monitorInfo.dwFlags & 1) != 0; // MONITORINFOF_PRIMARY
                    let name = if primary {
                        format!("Toàn màn hình (chính)")
                    } else {
                        format!("Màn hình {}", ctx.index + 1)
                    };
                    ctx.sources.push(ScreenSource {
                        id: format!("screen:{}", ctx.index),
                        name,
                        kind: "screen".to_string(),
                        primary,
                    });
                    ctx.index += 1;
                }
                BOOL(1)
            }
        }

        let mut ctx = MonitorCtx {
            sources: Vec::new(),
            index: 0,
        };
        unsafe {
            let _ = EnumDisplayMonitors(
                HDC::default(),
                None,
                Some(monitor_callback),
                LPARAM(&mut ctx as *mut MonitorCtx as isize),
            );
        }
        // Sort primary first
        ctx.sources.sort_by(|a, b| b.primary.cmp(&a.primary));
        sources.extend(ctx.sources);

        // ── Enumerate windows ────────────────────────────────────────────
        struct WinCtx {
            sources: Vec<ScreenSource>,
        }

        extern "system" fn enum_windows_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
            unsafe {
                if !IsWindowVisible(hwnd).as_bool() {
                    return BOOL(1);
                }
                // Skip tool windows (taskbar, tooltips, etc.)
                let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
                if ex_style & WS_EX_TOOLWINDOW.0 != 0 {
                    return BOOL(1);
                }
                let mut title = [0u16; 256];
                let len = GetWindowTextW(hwnd, &mut title);
                if len == 0 {
                    return BOOL(1);
                }
                let name = String::from_utf16_lossy(&title[..len as usize]);
                // Skip our own app window
                if name.contains("Stream HUB") {
                    return BOOL(1);
                }
                let ctx = &mut *(lparam.0 as *mut WinCtx);
                ctx.sources.push(ScreenSource {
                    id: format!("window:{}", hwnd.0 as usize),
                    name: format!("Cửa sổ: {}", name),
                    kind: "window".to_string(),
                    primary: false,
                });
                BOOL(1)
            }
        }

        let mut win_ctx = WinCtx {
            sources: Vec::new(),
        };
        unsafe {
            let _ = EnumWindows(
                Some(enum_windows_callback),
                LPARAM(&mut win_ctx as *mut WinCtx as isize),
            );
        }
        sources.extend(win_ctx.sources);
    }

    // Fallback for non-Windows (macOS/Linux) — return single screen entry
    #[cfg(not(target_os = "windows"))]
    {
        sources.push(ScreenSource {
            id: "screen:0".to_string(),
            name: "Toàn màn hình".to_string(),
            kind: "screen".to_string(),
            primary: true,
        });
    }

    sources
}
