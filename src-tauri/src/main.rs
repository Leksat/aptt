#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod clipboard_hotkey;

use crate::clipboard_hotkey::ClipboardHotkey;
use rdev::listen_non_blocking;
use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, WindowEvent};

fn main() {
    tauri::Builder::default()
        .system_tray(
            SystemTray::new().with_menu(
                SystemTrayMenu::new()
                    .add_item(CustomMenuItem::new("settings".to_string(), "Settings"))
                    .add_item(CustomMenuItem::new("quit".to_string(), "Quit")),
            ),
        )
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "settings" => {
                    app.emit_all("display-settings", ()).unwrap();
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            let app_handle = app.handle();
            let mut clipboard_hotkey = ClipboardHotkey::new();
            listen_non_blocking(move |event| {
                clipboard_hotkey.callback(
                    event,
                    || {
                        app_handle
                            .emit_all("clipboard-hotkey", ())
                            .expect("Cannot emit clipboard-hotkey event");
                    },
                    || {
                        app_handle
                            .emit_all("focus", ())
                            .expect("Cannot emit focus event");
                    },
                );
            })
            .expect("Cannot listen to keyboard events");

            let tray_handle = app.tray_handle();
            app.listen_global("set-text", move |event| {
                tray_handle
                    .set_title(event.payload().unwrap().trim_matches('"'))
                    .unwrap();
            });

            Ok(())
        })
        .on_window_event(|event| {
            match event.event() {
                WindowEvent::CloseRequested { api, .. } => {
                    event
                        .window()
                        .emit("show-egg", ())
                        .expect("Cannot emit show-egg event");
                    // TODO: Once https://github.com/tauri-apps/tauri/issues/3084 is solved:
                    //  - hide the window here
                    //  - restore the window on dock-click/option+tab ("activate" macos event).
                    api.prevent_close();
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
