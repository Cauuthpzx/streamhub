/// Hide the WebView2 screen-share infobar via WebView2 COM API.
///
/// `install_infobar_hider` is called once at app startup via `with_webview`.
/// It uses `AddScriptToExecuteOnDocumentCreated` to permanently inject a
/// MutationObserver that removes the infobar <div> the instant it appears.
///
/// `set_screen_share_active` is a Tauri command also triggering `ExecuteScript`
/// to run the hider immediately on demand.

use tauri::{AppHandle, Manager};

const HIDE_SCRIPT: &str = r#"
(function() {
  'use strict';
  function killNode(node) {
    if (!node || node.nodeType !== 1) return;
    var style = node.getAttribute ? (node.getAttribute('style') || '') : '';
    var text  = (node.innerText || node.textContent || '').toLowerCase();
    if ((text.includes('sharing') || text.includes('stop sharing')) &&
        (style.includes('fixed') || style.includes('absolute') ||
         style.includes('z-index') || style.includes('position'))) {
      node.remove();
      return;
    }
    try {
      var cs = window.getComputedStyle(node);
      if (cs.position === 'fixed' && parseInt(cs.top) === 0 &&
          parseInt(cs.height) < 64 && text.includes('shar')) {
        node.remove();
      }
    } catch(_) {}
  }
  // Kill any existing infobar nodes
  if (document.body) {
    Array.from(document.body.children).forEach(killNode);
  }
  // Watch for future insertions
  var ob = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(killNode);
    });
  });
  function observe() {
    ob.observe(document.body, { childList: true });
  }
  if (document.body) observe();
  else document.addEventListener('DOMContentLoaded', observe);
})();
"#;

/// Called once during app setup. Installs the MutationObserver on every page load.
pub fn install_infobar_hider(app: &AppHandle) {
    if let Some(wv_window) = app.get_webview_window("main") {
        let _ = wv_window.with_webview(|wv| {
            #[cfg(windows)]
            {
                use webview2_com::{
                    AddScriptToExecuteOnDocumentCreatedCompletedHandler,
                    CoTaskMemPWSTR,
                    Microsoft::Web::WebView2::Win32::ICoreWebView2,
                };
                use windows::core::Interface;

                let controller = wv.controller();
                let webview: ICoreWebView2 = unsafe {
                    controller.CoreWebView2().expect("CoreWebView2")
                };
                let js = HIDE_SCRIPT.to_string();
                let _ = AddScriptToExecuteOnDocumentCreatedCompletedHandler::wait_for_async_operation(
                    Box::new(move |handler| unsafe {
                        let js_pwstr = CoTaskMemPWSTR::from(js.as_str());
                        webview
                            .AddScriptToExecuteOnDocumentCreated(*js_pwstr.as_ref().as_pcwstr(), &handler)
                            .map_err(webview2_com::Error::WindowsError)
                    }),
                    Box::new(|err, _id| err),
                );
            }
        });
    }
}

/// Tauri command — execute the hider script immediately when screen share starts.
#[tauri::command]
pub fn set_screen_share_active(app: AppHandle, active: bool) {
    if !active {
        return;
    }
    if let Some(wv_window) = app.get_webview_window("main") {
        let _ = wv_window.with_webview(|wv| {
            #[cfg(windows)]
            {
                use webview2_com::{
                    ExecuteScriptCompletedHandler,
                    CoTaskMemPWSTR,
                    Microsoft::Web::WebView2::Win32::ICoreWebView2,
                };
                use windows::core::Interface;

                let controller = wv.controller();
                let webview: ICoreWebView2 = unsafe {
                    controller.CoreWebView2().expect("CoreWebView2")
                };
                let js = HIDE_SCRIPT.to_string();
                let _ = ExecuteScriptCompletedHandler::wait_for_async_operation(
                    Box::new(move |handler| unsafe {
                        let js_pwstr = CoTaskMemPWSTR::from(js.as_str());
                        webview
                            .ExecuteScript(*js_pwstr.as_ref().as_pcwstr(), &handler)
                            .map_err(webview2_com::Error::WindowsError)
                    }),
                    Box::new(|err, _result| err),
                );
            }
        });
    }
}
