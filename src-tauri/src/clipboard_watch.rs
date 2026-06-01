use std::{thread, time::Duration};

use tauri::{AppHandle, Emitter, Runtime};

const POLL_INTERVAL: Duration = Duration::from_millis(50);
pub const CLIPBOARD_CHANGED_EVENT: &str = "clipboard:changed";

pub fn spawn<R: Runtime>(app: AppHandle<R>) {
    thread::spawn(move || run(app));
}

#[cfg(target_os = "macos")]
fn run<R: Runtime>(app: AppHandle<R>) {
    use objc2_app_kit::NSPasteboard;

    let mut last = NSPasteboard::generalPasteboard().changeCount();
    loop {
        thread::sleep(POLL_INTERVAL);
        let current = NSPasteboard::generalPasteboard().changeCount();
        if current != last {
            last = current;
            let _ = app.emit(CLIPBOARD_CHANGED_EVENT, ());
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn run<R: Runtime>(_app: AppHandle<R>) {}
