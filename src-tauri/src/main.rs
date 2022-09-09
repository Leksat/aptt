#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod clipboard_hotkey;

use crate::clipboard_hotkey::ClipboardHotkey;
use rdev::listen_non_blocking;
use std::cell::UnsafeCell;
use tauri::{Manager, WindowEvent};
use tray_item::TrayItem;

fn main() {
    tauri::Builder::default()
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

            let mut tray = TrayItem::new("🕒", "").unwrap();
            let inner = tray.inner_mut();
            inner.add_quit_item("Quit");
            inner.display();
            let tray_handle: UnsafeCell<TrayItem> = tray.into();
            app.listen_global("set-text", move |event| unsafe {
                let tray = &mut *tray_handle.get();
                tray.set_label(event.payload().unwrap()).unwrap();
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
