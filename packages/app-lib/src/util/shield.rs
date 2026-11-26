//! Minekube Shield — the launcher's built-in tracker and telemetry blocker.
//!
//! The launcher’s shared Rust HTTP clients resolve host names through
//! [`ShieldResolver`]. Before a connection is opened, the host is checked
//! against a small in-memory blocklist:
//!
//! - **always blocked**: analytics, error reporting, ad, survey and chat-widget
//!   services, plus known Microsoft telemetry endpoints. The launcher has no
//!   reason to ever talk to them.
//! - **blocked in strict mode**: Modrinth's API (browsing, search, update
//!   checks) and third-party image CDNs. Microsoft sign-in and Mojang game
//!   files always stay reachable, so the game keeps working.
//!
//! A blocked host never gets a DNS lookup, so not a single packet leaves the
//! computer for it through this resolver. Initial URL and redirect checks
//! additionally protect the shared fetch path, including requests using proxies.
//! This is not a system firewall or a filter for the Minecraft process.

use std::sync::atomic::{AtomicBool, Ordering};

use reqwest::dns::{Addrs, Name, Resolve, Resolving};

/// Hosts (and all their subdomains) that are blocked no matter what.
const ALWAYS_BLOCKED: &[&str] = &[
    // Product analytics and session recording
    "posthog.com",
    "posthog.modrinth.com",
    "analytics.modrinth.com",
    "google-analytics.com",
    "analytics.google.com",
    "googletagmanager.com",
    "segment.io",
    "segment.com",
    "mixpanel.com",
    "amplitude.com",
    "hotjar.com",
    "hotjar.io",
    "plausible.io",
    "clarity.ms",
    "fullstory.com",
    // Error and crash reporting
    "sentry.io",
    "getsentry.com",
    "bugsnag.com",
    // Advertising
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "adnxs.com",
    "ads.modrinth.com",
    // Surveys, chat widgets and payment trackers
    "surveys.modrinth.com",
    "tally.so",
    "intercom.io",
    "intercomcdn.com",
    "intercom-reporting.com",
    "stripe.com",
    "stripe.network",
    // Microsoft telemetry (never needed for sign-in or the game files)
    "vortex.data.microsoft.com",
    "events.data.microsoft.com",
    "telemetry.microsoft.com",
    "watson.telemetry.microsoft.com",
    "browser.events.data.msn.com",
];

/// Additionally blocked while strict mode is on.
const STRICT_BLOCKED: &[&str] = &[
    "api.modrinth.com",
    "staging-api.modrinth.com",
    "launcher-files.modrinth.com",
    "mc-heads.net",
    "crafatar.com",
    "minotar.net",
    "flagcdn.com",
    "avatars.githubusercontent.com",
    "api.mclo.gs",
];

static STRICT: AtomicBool = AtomicBool::new(false);

fn matches(host: &str, list: &[&str]) -> bool {
    list.iter().any(|entry| {
        host == *entry
            || (host.len() > entry.len()
                && host.ends_with(entry)
                && host.as_bytes()[host.len() - entry.len() - 1] == b'.')
    })
}

fn normalize(host: &str) -> String {
    host.trim().trim_end_matches('.').to_ascii_lowercase()
}

/// Whether the shield blocks connections to `host` right now.
pub fn is_blocked(host: &str) -> bool {
    let host = normalize(host);
    matches(&host, ALWAYS_BLOCKED)
        || (STRICT.load(Ordering::Relaxed) && matches(&host, STRICT_BLOCKED))
}

/// Turns strict mode on or off. Takes effect for the next connection.
pub fn set_strict(strict: bool) {
    STRICT.store(strict, Ordering::Relaxed);
}

pub fn strict() -> bool {
    STRICT.load(Ordering::Relaxed)
}

/// Checks `url` for a request the interface is about to make.
/// Returns `true` when the request may go ahead.
pub fn check_url(url: &str) -> bool {
    url::Url::parse(url).is_ok_and(|url| allows_url(&url))
}

pub(crate) fn allows_url(url: &url::Url) -> bool {
    matches!(url.scheme(), "http" | "https")
        && url.host_str().is_some_and(|host| !is_blocked(host))
}

/// DNS resolver used by the shared Rust HTTP clients. Blocked hosts fail before
/// any lookup happens; allowed hosts resolve through the system resolver.
#[derive(Clone, Copy, Default)]
pub struct ShieldResolver;

impl Resolve for ShieldResolver {
    fn resolve(&self, name: Name) -> Resolving {
        let host = name.as_str().to_owned();
        Box::pin(async move {
            if is_blocked(&host) {
                return Err(Box::new(std::io::Error::new(
                    std::io::ErrorKind::PermissionDenied,
                    format!("{host} is blocked by Minekube Shield"),
                ))
                    as Box<dyn std::error::Error + Send + Sync>);
            }
            let addrs = tokio::net::lookup_host((host, 0)).await?;
            Ok(Box::new(addrs) as Addrs)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_domain_and_subdomains_only() {
        assert!(matches("sentry.io", ALWAYS_BLOCKED));
        assert!(matches("o123.ingest.sentry.io", ALWAYS_BLOCKED));
        assert!(!matches("notsentry.io", ALWAYS_BLOCKED));
        assert!(!matches("login.live.com", ALWAYS_BLOCKED));
        assert!(!matches("api.minecraftservices.com", ALWAYS_BLOCKED));
        assert!(!matches("cdn.modrinth.com", ALWAYS_BLOCKED));
    }

    #[test]
    fn strict_mode_extends_the_list() {
        set_strict(false);
        assert!(!is_blocked("api.modrinth.com"));
        set_strict(true);
        assert!(is_blocked("API.Modrinth.com."));
        assert!(!is_blocked("resources.download.minecraft.net"));
        set_strict(false);
    }
}
