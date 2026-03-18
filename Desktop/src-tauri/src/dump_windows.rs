/// Debug command: dump all visible windows with class + title + PID.
/// Call from devtools console: __TAURI_INTERNALS__.invoke('dump_windows')

use serde::Serialize;

#[derive(Serialize)]
pub struct WinInfo {
    pub hwnd: usize,
    pub pid: u32,
    pub class: String,
    pub title: String,
    pub visible: bool,
}

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    EnumChildWindows, EnumWindows, GetClassNameW, GetWindowTextLengthW,
    GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible,
};

#[cfg(target_os = "windows")]
struct Ctx {
    items: Vec<WinInfo>,
    include_invisible: bool,
}

#[tauri::command]
pub fn dump_windows() -> Vec<WinInfo> {
    #[cfg(target_os = "windows")]
    {
        let mut ctx = Ctx {
            items: Vec::new(),
            include_invisible: true,
        };

        extern "system" fn enum_top(hwnd: HWND, lparam: LPARAM) -> BOOL {
            unsafe {
                let ctx = &mut *(lparam.0 as *mut Ctx);
                let visible = IsWindowVisible(hwnd).as_bool();
                if !visible && !ctx.include_invisible {
                    return BOOL(1);
                }

                let mut pid = 0u32;
                GetWindowThreadProcessId(hwnd, Some(&mut pid));

                let mut cbuf = [0u16; 256];
                GetClassNameW(hwnd, &mut cbuf);
                let class = String::from_utf16_lossy(&cbuf)
                    .trim_end_matches('\0')
                    .to_string();

                let tlen = GetWindowTextLengthW(hwnd);
                let title = if tlen > 0 {
                    let mut tbuf = vec![0u16; (tlen + 1) as usize];
                    let n = GetWindowTextW(hwnd, &mut tbuf);
                    String::from_utf16_lossy(&tbuf[..n as usize]).to_string()
                } else {
                    String::new()
                };

                ctx.items.push(WinInfo {
                    hwnd: hwnd.0 as usize,
                    pid,
                    class: class.clone(),
                    title: title.clone(),
                    visible,
                });

                // Enumerate children for Chrome_WidgetWin windows
                if class.contains("Chrome_WidgetWin") || class.contains("msedge") {
                    extern "system" fn enum_child(child: HWND, lparam: LPARAM) -> BOOL {
                        unsafe {
                            let ctx = &mut *(lparam.0 as *mut Ctx);
                            let visible = IsWindowVisible(child).as_bool();

                            let mut pid = 0u32;
                            GetWindowThreadProcessId(child, Some(&mut pid));

                            let mut cbuf = [0u16; 256];
                            GetClassNameW(child, &mut cbuf);
                            let class = String::from_utf16_lossy(&cbuf)
                                .trim_end_matches('\0')
                                .to_string();

                            let tlen = GetWindowTextLengthW(child);
                            let title = if tlen > 0 {
                                let mut tbuf = vec![0u16; (tlen + 1) as usize];
                                let n = GetWindowTextW(child, &mut tbuf);
                                String::from_utf16_lossy(&tbuf[..n as usize]).to_string()
                            } else {
                                String::new()
                            };

                            ctx.items.push(WinInfo {
                                hwnd: child.0 as usize,
                                pid,
                                class,
                                title,
                                visible,
                            });
                            BOOL(1)
                        }
                    }
                    let _ = EnumChildWindows(
                        hwnd,
                        Some(enum_child),
                        LPARAM(&mut *ctx as *mut Ctx as isize),
                    );
                }

                BOOL(1)
            }
        }

        unsafe {
            let _ = EnumWindows(
                Some(enum_top),
                LPARAM(&mut ctx as *mut Ctx as isize),
            );
        }

        return ctx.items;
    }

    #[cfg(not(target_os = "windows"))]
    vec![]
}
