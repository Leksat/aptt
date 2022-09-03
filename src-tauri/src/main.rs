#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod clipboard_hotkey;

use crate::clipboard_hotkey::ClipboardHotkey;
use rdev::listen_non_blocking;
use tauri::{Manager, RunEvent, WindowEvent};

fn main() {
    let app = tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            let mut clipboard_hotkey = ClipboardHotkey::new();
            listen_non_blocking(move |event| {
                clipboard_hotkey.callback(event, || {
                    app_handle
                        .emit_all("clipboard-hotkey", ())
                        .expect("Cannot emit main-hotkey event");
                });
            })
            .expect("Cannot listen to keyboard events");
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|_, e| match e {
        RunEvent::WindowEvent {
            event: WindowEvent::CloseRequested { api, .. },
            ..
        } => {
            // TODO: Once https://github.com/tauri-apps/tauri/issues/3084 is solved:
            //  - hide the window here
            //  - restore the window on dock-click/option+tab ("activate" macos event).
            api.prevent_close();
        }
        _ => {}
    });
}
