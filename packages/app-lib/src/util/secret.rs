//! Authenticated encryption of sign-in secrets before they reach SQLite.
//! DPAPI protects Windows values. On macOS and Linux the AES-GCM key is
//! stored in the system credential store, never in the launcher directory.
//! The old Unix key file is read only to migrate existing ciphertext.

use base64::Engine;
use base64::engine::general_purpose::STANDARD;

const LEGACY_PREFIX: &str = "mksealed1:";
const PREFIX: &str = "mksealed2:";

pub async fn init(dir: &std::path::Path, app_id: &str) {
    platform::init(dir, app_id).await;
}

pub fn sealing_available() -> bool {
    platform::available()
}

fn is_sealed(stored: &str) -> bool {
    stored.starts_with(PREFIX) || stored.starts_with(LEGACY_PREFIX)
}

/// Fails instead of ever returning plaintext for persistence.
pub fn seal(plain: &str) -> crate::Result<String> {
    if plain.is_empty() {
        return Ok(String::new());
    }
    encode(plain, platform::protect).ok_or_else(storage_error)
}

pub(crate) fn require_available() -> crate::Result<()> {
    if sealing_available() {
        Ok(())
    } else {
        Err(storage_error())
    }
}

fn storage_error() -> crate::Error {
    crate::ErrorKind::InputError(
        "Could not save the sign-in securely. Unlock or enable your system credential store, restart the launcher, and try again.".to_owned(),
    )
    .into()
}

fn encode(
    plain: &str,
    protect: impl FnOnce(&[u8]) -> Option<Vec<u8>>,
) -> Option<String> {
    protect(plain.as_bytes())
        .map(|value| format!("{PREFIX}{}", STANDARD.encode(value)))
}

pub fn open(stored: &str) -> String {
    decode(stored).unwrap_or_default()
}

fn decode(stored: &str) -> Option<String> {
    let (encoded, legacy) = if let Some(encoded) = stored.strip_prefix(PREFIX) {
        (encoded, false)
    } else {
        (stored.strip_prefix(LEGACY_PREFIX)?, true)
    };
    let bytes = STANDARD.decode(encoded).ok()?;
    String::from_utf8(platform::unprotect(&bytes, legacy)?).ok()
}

/// Keep encrypted values recoverable when the OS store is temporarily locked.
/// Plaintext from old versions is re-sealed or removed, never copied as-is.
pub(crate) fn migrate_value(stored: &str) -> Option<String> {
    if stored.is_empty() || stored.starts_with(PREFIX) {
        None
    } else if is_sealed(stored) {
        decode(stored).and_then(|plain| seal(&plain).ok())
    } else {
        Some(seal(stored).unwrap_or_default())
    }
}

#[cfg(windows)]
mod platform {
    use std::ffi::c_void;

    /// Stable domain separation, not a boundary against same-user software.
    const ENTROPY: &[u8] = b"MinekubeLauncher/sign-in-secrets/v1";
    const CRYPTPROTECT_UI_FORBIDDEN: u32 = 0x1;

    #[repr(C)]
    struct DataBlob {
        cb_data: u32,
        pb_data: *mut u8,
    }

    #[link(name = "crypt32")]
    unsafe extern "system" {
        fn CryptProtectData(
            data_in: *const DataBlob,
            description: *const u16,
            entropy: *const DataBlob,
            reserved: *mut c_void,
            prompt: *mut c_void,
            flags: u32,
            data_out: *mut DataBlob,
        ) -> i32;

        fn CryptUnprotectData(
            data_in: *const DataBlob,
            description: *mut *mut u16,
            entropy: *const DataBlob,
            reserved: *mut c_void,
            prompt: *mut c_void,
            flags: u32,
            data_out: *mut DataBlob,
        ) -> i32;
    }

    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn LocalFree(memory: *mut c_void) -> *mut c_void;
    }

    fn run(
        input: &[u8],
        call: impl FnOnce(&DataBlob, &DataBlob, &mut DataBlob) -> i32,
    ) -> Option<Vec<u8>> {
        let input_blob = DataBlob {
            cb_data: u32::try_from(input.len()).ok()?,
            pb_data: input.as_ptr().cast_mut(),
        };
        let entropy_blob = DataBlob {
            cb_data: ENTROPY.len() as u32,
            pb_data: ENTROPY.as_ptr().cast_mut(),
        };
        let mut output = DataBlob {
            cb_data: 0,
            pb_data: std::ptr::null_mut(),
        };
        if call(&input_blob, &entropy_blob, &mut output) == 0
            || output.pb_data.is_null()
        {
            return None;
        }
        // SAFETY: on success Windows hands back a LocalAlloc'd buffer of
        // `cb_data` bytes, which is copied out and then released exactly once.
        let bytes = unsafe {
            let bytes = std::slice::from_raw_parts(
                output.pb_data,
                output.cb_data as usize,
            )
            .to_vec();
            LocalFree(output.pb_data.cast());
            bytes
        };
        Some(bytes)
    }

    pub async fn init(_dir: &std::path::Path, _app_id: &str) {}

    pub fn available() -> bool {
        true
    }

    pub fn protect(plain: &[u8]) -> Option<Vec<u8>> {
        run(plain, |input, entropy, output| {
            // SAFETY: all pointers come from live blobs owned by `run`.
            unsafe {
                CryptProtectData(
                    input,
                    std::ptr::null(),
                    entropy,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    CRYPTPROTECT_UI_FORBIDDEN,
                    output,
                )
            }
        })
    }

    pub fn unprotect(sealed: &[u8], _legacy: bool) -> Option<Vec<u8>> {
        run(sealed, |input, entropy, output| {
            // SAFETY: all pointers come from live blobs owned by `run`.
            unsafe {
                CryptUnprotectData(
                    input,
                    std::ptr::null_mut(),
                    entropy,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    CRYPTPROTECT_UI_FORBIDDEN,
                    output,
                )
            }
        })
    }
}

#[cfg(not(windows))]
mod platform {
    use base64::Engine;
    use base64::engine::general_purpose::STANDARD;
    use ring::aead::{
        AES_256_GCM, Aad, LessSafeKey, NONCE_LEN, Nonce, UnboundKey,
    };
    use ring::rand::{SecureRandom, SystemRandom};
    use std::path::Path;
    use std::sync::OnceLock;

    const SERVICE: &str = "Minekube Launcher sign-in vault";
    const KEY_LEN: usize = 32;
    static KEY: OnceLock<LessSafeKey> = OnceLock::new();
    static LEGACY_KEY: OnceLock<LessSafeKey> = OnceLock::new();

    fn random_key() -> Option<[u8; KEY_LEN]> {
        let mut key = [0u8; KEY_LEN];
        SystemRandom::new().fill(&mut key).ok()?;
        Some(key)
    }

    fn parse_key(encoded: &[u8]) -> Option<[u8; KEY_LEN]> {
        let encoded = std::str::from_utf8(encoded).ok()?.trim();
        STANDARD.decode(encoded).ok()?.try_into().ok()
    }

    #[cfg(target_os = "macos")]
    async fn system_key(app_id: &str) -> Option<[u8; KEY_LEN]> {
        use security_framework::passwords::{
            get_generic_password, set_generic_password,
        };
        let app_id = app_id.to_owned();
        tokio::task::spawn_blocking(move || {
            match get_generic_password(SERVICE, &app_id) {
                Ok(value) => parse_key(&value),
                // errSecItemNotFound; never replace a locked or unreadable key.
                Err(error) if error.code() == -25300 => {
                    let key = random_key()?;
                    set_generic_password(
                        SERVICE,
                        &app_id,
                        STANDARD.encode(key).as_bytes(),
                    )
                    .ok()?;
                    Some(key)
                }
                Err(_) => None,
            }
        })
        .await
        .ok()
        .flatten()
    }

    #[cfg(target_os = "linux")]
    async fn system_key(app_id: &str) -> Option<[u8; KEY_LEN]> {
        use std::process::Stdio;
        use std::time::Duration;
        use tokio::io::AsyncWriteExt;
        use tokio::process::Command;

        tokio::time::timeout(Duration::from_secs(8), async {
            let command = || {
                let mut command = Command::new("/usr/bin/secret-tool");
                command.kill_on_drop(true);
                command
            };
            let output = command()
                .args([
                    "lookup",
                    "application",
                    app_id,
                    "purpose",
                    "minekube-secrets-v2",
                ])
                .stdin(Stdio::null())
                .output()
                .await
                .ok()?;
            if output.status.success() {
                return parse_key(&output.stdout);
            }
            if output.status.code() != Some(1)
                || !output.stderr.is_empty()
                || !output.stdout.is_empty()
            {
                return None;
            }
            let key = random_key()?;
            let mut child = command()
                .args([
                    "store",
                    "--label",
                    SERVICE,
                    "application",
                    app_id,
                    "purpose",
                    "minekube-secrets-v2",
                ])
                .stdin(Stdio::piped())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .ok()?;
            // Secret Tool accepts stdin, so the key never appears in arguments.
            let mut stdin = child.stdin.take()?;
            stdin
                .write_all(STANDARD.encode(key).as_bytes())
                .await
                .ok()?;
            drop(stdin);
            child.wait().await.ok()?.success().then_some(key)
        })
        .await
        .ok()
        .flatten()
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    async fn system_key(_app_id: &str) -> Option<[u8; KEY_LEN]> {
        None
    }

    pub async fn init(dir: &Path, app_id: &str) {
        if KEY.get().is_some() {
            return;
        }
        if let Ok(bytes) = std::fs::read(dir.join("secrets.key"))
            && let Ok(key) = UnboundKey::new(&AES_256_GCM, &bytes)
        {
            let _ = LEGACY_KEY.set(LessSafeKey::new(key));
        }
        if let Some(key) = system_key(app_id).await
            && let Ok(key) = UnboundKey::new(&AES_256_GCM, &key)
        {
            let _ = KEY.set(LessSafeKey::new(key));
        } else {
            tracing::warn!(
                "System credential store unavailable; saving new sign-in secrets is disabled"
            );
        }
    }

    pub fn available() -> bool {
        KEY.get().is_some()
    }

    pub fn protect(plain: &[u8]) -> Option<Vec<u8>> {
        let key = KEY.get()?;
        let mut nonce = [0u8; NONCE_LEN];
        SystemRandom::new().fill(&mut nonce).ok()?;
        let mut buffer = plain.to_vec();
        key.seal_in_place_append_tag(
            Nonce::assume_unique_for_key(nonce),
            Aad::empty(),
            &mut buffer,
        )
        .ok()?;
        let mut out = nonce.to_vec();
        out.extend_from_slice(&buffer);
        Some(out)
    }

    pub fn unprotect(sealed: &[u8], legacy: bool) -> Option<Vec<u8>> {
        let key = if legacy {
            LEGACY_KEY.get()?
        } else {
            KEY.get()?
        };
        let (nonce, ciphertext) = sealed.split_at_checked(NONCE_LEN)?;
        let nonce = Nonce::try_assume_unique_for_key(nonce).ok()?;
        let mut buffer = ciphertext.to_vec();
        let plain = key.open_in_place(nonce, Aad::empty(), &mut buffer).ok()?;
        Some(plain.to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn failed_protection_never_returns_plaintext() {
        assert_eq!(encode("private-token", |_| None), None);
        assert_eq!(open("legacy-plaintext"), "");
        assert_eq!(seal("").unwrap(), "");
    }

    #[cfg(windows)]
    #[test]
    fn windows_dpapi_round_trips() {
        let encrypted = seal("private-token").unwrap();
        assert!(encrypted.starts_with(PREFIX));
        assert!(!encrypted.contains("private-token"));
        assert_eq!(open(&encrypted), "private-token");
    }

    #[test]
    fn encrypted_values_are_not_discarded_when_inaccessible() {
        assert_eq!(migrate_value("mksealed1:unreadable"), None);
        assert_eq!(migrate_value("mksealed2:unreadable"), None);
        assert_eq!(migrate_value(""), None);
    }
}
