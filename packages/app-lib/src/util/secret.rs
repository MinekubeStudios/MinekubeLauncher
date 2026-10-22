//! Sealing of sign-in secrets at rest.
//!
//! Microsoft sign-in tokens and the Xbox device key live in the launcher's
//! SQLite database and are sealed before they are written:
//!
//! - **Windows**: DPAPI encrypts them with a key Windows derives from the
//!   signed-in user, so a copy of the database (a backup, malware that grabs
//!   `app.db`, another user of the PC) holds nothing usable.
//! - **macOS and Linux**: AES-256-GCM with a random key kept in a separate
//!   file readable only by the user who runs the launcher (mode 0600).
//!
//! Sealed values carry a short prefix, which keeps reading compatible with
//! databases written by older versions: an unsealed value is returned as is
//! and sealed on the next write (and once at startup, see
//! [`crate::state::Credentials::seal_stored_secrets`]).
//!
//! If a sealed value cannot be opened (the database was moved to another
//! account or computer), an empty string is returned, which simply makes the
//! launcher ask for a fresh sign-in.

use base64::Engine;
use base64::engine::general_purpose::STANDARD;

const PREFIX: &str = "mksealed1:";

/// Prepares sealing; `dir` is the launcher's settings folder (where the key
/// file lives on macOS and Linux). Call once at startup, before secrets are
/// read or written.
pub fn init(dir: &std::path::Path) {
    platform::init(dir);
}

/// Whether secrets can be sealed right now.
pub fn sealing_available() -> bool {
    platform::available()
}

/// Whether `stored` is already sealed.
pub fn is_sealed(stored: &str) -> bool {
    stored.starts_with(PREFIX)
}

/// Seals `plain` for storage. Empty values stay empty. On platforms without
/// sealing (or if sealing fails) the value is stored as before.
pub fn seal(plain: &str) -> String {
    if plain.is_empty() || is_sealed(plain) {
        return plain.to_string();
    }
    match platform::protect(plain.as_bytes()) {
        Some(sealed) => format!("{PREFIX}{}", STANDARD.encode(sealed)),
        None => plain.to_string(),
    }
}

/// Opens a stored value written by [`seal`] (or by an older version).
pub fn open(stored: &str) -> String {
    let Some(encoded) = stored.strip_prefix(PREFIX) else {
        return stored.to_string();
    };
    STANDARD
        .decode(encoded)
        .ok()
        .and_then(|bytes| platform::unprotect(&bytes))
        .and_then(|bytes| String::from_utf8(bytes).ok())
        .unwrap_or_else(|| {
            tracing::warn!(
                "A sealed sign-in secret could not be opened on this Windows account; a new sign-in will be needed"
            );
            String::new()
        })
}

#[cfg(windows)]
mod platform {
    use std::ffi::c_void;

    /// Extra entropy so other programs running as the same Windows user
    /// cannot open the launcher's secrets with a plain DPAPI call.
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

    pub fn init(_dir: &std::path::Path) {}

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

    pub fn unprotect(sealed: &[u8]) -> Option<Vec<u8>> {
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
    use ring::aead::{
        AES_256_GCM, Aad, LessSafeKey, NONCE_LEN, Nonce, UnboundKey,
    };
    use ring::rand::{SecureRandom, SystemRandom};
    use std::path::Path;
    use std::sync::OnceLock;

    const KEY_FILE: &str = "secrets.key";
    const KEY_LEN: usize = 32;

    static KEY: OnceLock<LessSafeKey> = OnceLock::new();

    fn load_or_create_key(dir: &Path) -> Option<[u8; KEY_LEN]> {
        let path = dir.join(KEY_FILE);
        if let Ok(bytes) = std::fs::read(&path) {
            return bytes.try_into().ok();
        }
        let mut key = [0u8; KEY_LEN];
        SystemRandom::new().fill(&mut key).ok()?;
        std::fs::create_dir_all(dir).ok()?;
        write_private(&path, &key).ok()?;
        Some(key)
    }

    #[cfg(unix)]
    fn write_private(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
        use std::io::Write;
        use std::os::unix::fs::OpenOptionsExt;
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(path)?;
        file.write_all(bytes)
    }

    #[cfg(not(unix))]
    fn write_private(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
        std::fs::write(path, bytes)
    }

    pub fn init(dir: &Path) {
        if KEY.get().is_some() {
            return;
        }
        match load_or_create_key(dir)
            .and_then(|bytes| UnboundKey::new(&AES_256_GCM, &bytes).ok())
        {
            Some(key) => {
                let _ = KEY.set(LessSafeKey::new(key));
            }
            None => tracing::warn!(
                "Could not prepare the key for sign-in secrets; they stay unsealed"
            ),
        }
    }

    pub fn available() -> bool {
        KEY.get().is_some()
    }

    /// Output layout: 12-byte random nonce, then ciphertext and tag.
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

    pub fn unprotect(sealed: &[u8]) -> Option<Vec<u8>> {
        let key = KEY.get()?;
        if sealed.len() < NONCE_LEN {
            return None;
        }
        let (nonce, ciphertext) = sealed.split_at(NONCE_LEN);
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
    fn unsealed_values_pass_through() {
        assert_eq!(open("plain-token"), "plain-token");
        assert_eq!(seal(""), "");
    }

    #[test]
    fn seal_round_trip() {
        let dir = tempfile::tempdir().unwrap();
        init(dir.path());
        let sealed = seal("refresh-token-123");
        if sealing_available() {
            assert!(is_sealed(&sealed));
            assert_ne!(sealed, "refresh-token-123");
        }
        assert_eq!(open(&sealed), "refresh-token-123");
    }

    #[test]
    fn broken_sealed_value_opens_empty() {
        assert_eq!(open("mksealed1:not base64!"), "");
    }
}
