/*!
# Theseus

Theseus is a library which provides utilities for launching minecraft, creating Modrinth mod packs,
and launching Modrinth mod packs
*/
#![warn(unused_import_braces)]
#![deny(unused_must_use)]

#[macro_use]
mod util;

mod api;
mod error;
mod event;
pub mod install;
mod launcher;
mod state;

pub use api::*;
pub use error::*;
#[cfg(feature = "export-ts")]
pub use event::export_app_event_bindings;
pub use event::{
    AppEvent, EventState, LoadingBar, LoadingBarType, emit::emit_loading,
    emit::init_loading,
};
pub use state::State;
pub use util::fetch::DownloadReason;
pub use util::log_cleanup;
pub use util::shield;

/// Minekube Shield mod scanner.
pub use launcher::mod_scan;

/// The User-Agent sent with every request. Minekube Shield keeps it anonymous:
/// it names the launcher and its version only — no operating system, no
/// e-mail address and nothing that tells one installation from another.
pub fn launcher_user_agent() -> String {
    concat!("MinekubeLauncher/", env!("CARGO_PKG_VERSION")).to_string()
}
