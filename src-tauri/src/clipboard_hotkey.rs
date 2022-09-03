use rdev::{Event, EventType, Key as RdevKey};
use std::collections::HashSet;
use std::hash::{Hash, Hasher};
use std::time::SystemTime;

#[derive(PartialEq, Debug)]
struct Key(RdevKey);

impl Hash for Key {
    fn hash<H: Hasher>(&self, state: &mut H) {
        state.write(format!("{:?}", self.0).as_bytes());
    }
}

impl Eq for Key {}

static MOD_KEYS: &'static [Key] = &[
    Key(RdevKey::ShiftLeft),
    Key(RdevKey::ShiftRight),
    Key(RdevKey::Function),
    Key(RdevKey::ControlLeft),
    Key(RdevKey::ControlRight),
    Key(RdevKey::Alt),
    Key(RdevKey::AltGr),
    Key(RdevKey::MetaLeft),
    Key(RdevKey::MetaRight),
];

const KEY_META_LEFT: Key = Key(RdevKey::MetaLeft);
const KEY_META_RIGHT: Key = Key(RdevKey::MetaRight);
const KEY_C: Key = Key(RdevKey::KeyC);

#[derive(Debug)]
pub struct ClipboardHotkey {
    last_key: Option<Key>,
    last_key_time: Option<SystemTime>,
    current_mod_keys: HashSet<Key>,
}

impl ClipboardHotkey {
    pub fn new() -> ClipboardHotkey {
        ClipboardHotkey {
            last_key: None,
            last_key_time: None,
            current_mod_keys: HashSet::new(),
        }
    }

    pub fn callback<F: Fn() -> ()>(&mut self, event: Event, callback: F) -> () {
        match event.event_type {
            EventType::KeyPress(rdev_key) => {
                let key = Key(rdev_key);
                if MOD_KEYS.contains(&key) {
                    if !self.current_mod_keys.contains(&key) {
                        self.current_mod_keys.insert(key);
                    }
                }
            }
            EventType::KeyRelease(rdev_key) => {
                let current_key = Key(rdev_key);
                if MOD_KEYS.contains(&current_key) {
                    if self.current_mod_keys.contains(&current_key) {
                        self.current_mod_keys.remove(&current_key);
                    }
                }
                if current_key == KEY_C
                    && self.current_mod_keys.len() == 1
                    && (self.current_mod_keys.contains(&KEY_META_LEFT)
                        || self.current_mod_keys.contains(&KEY_META_RIGHT))
                    && self.last_key == Some(KEY_C)
                    && SystemTime::now()
                        .duration_since(self.last_key_time.unwrap())
                        .unwrap()
                        .as_millis()
                        < 500
                {
                    self.last_key = None;
                    self.last_key_time = None;
                    callback();
                } else {
                    self.last_key = Some(current_key);
                    self.last_key_time = Some(SystemTime::now());
                }
            }
            _ => {}
        }
    }
}
