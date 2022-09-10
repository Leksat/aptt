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
    hits_count: u8,
    last_hit_time: SystemTime,
    current_mod_keys: HashSet<Key>,
}

impl ClipboardHotkey {
    pub fn new() -> ClipboardHotkey {
        ClipboardHotkey {
            hits_count: 0,
            last_hit_time: SystemTime::now(),
            current_mod_keys: HashSet::new(),
        }
    }

    pub fn callback<F1: Fn() -> (), F2: Fn() -> ()>(
        &mut self,
        event: Event,
        second_hit_callback: F1,
        third_hit_callback: F2,
    ) -> () {
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
                    // A mod key.
                    if self.current_mod_keys.contains(&current_key) {
                        self.current_mod_keys.remove(&current_key);
                    }
                } else if current_key == KEY_C
                    && self.current_mod_keys.len() == 1
                    && (self.current_mod_keys.contains(&KEY_META_LEFT)
                        || self.current_mod_keys.contains(&KEY_META_RIGHT))
                {
                    // The C key.
                    if self.hits_count > 0
                        && SystemTime::now()
                            .duration_since(self.last_hit_time)
                            .unwrap()
                            .as_millis()
                            < 500
                    {
                        self.hits_count += 1;
                        if self.hits_count == 2 {
                            second_hit_callback();
                        } else if self.hits_count == 3 {
                            third_hit_callback();
                        }
                        self.last_hit_time = SystemTime::now();
                    } else {
                        self.hits_count = 1;
                        self.last_hit_time = SystemTime::now();
                    }
                } else {
                    // Any other key.
                    self.hits_count = 0;
                }
            }
            _ => {}
        }
    }
}
