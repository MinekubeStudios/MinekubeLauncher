use crate::ErrorKind;
use std::ffi::OsStr;
use std::process::Stdio;
use std::time::Duration;
use tokio::process::Command;

/// An opt-in OS restriction for direct IP traffic of the game and its child processes.
/// It is not filesystem isolation or a sandbox for untrusted mods.
pub(crate) struct NetworkIsolation {
    program: &'static str,
    arguments: &'static [&'static str],
}

impl NetworkIsolation {
    #[cfg(target_os = "linux")]
    fn backend() -> crate::Result<Self> {
        Ok(Self {
            program: "/usr/bin/unshare",
            arguments: &["--user", "--map-current-user", "--net", "--"],
        })
    }

    #[cfg(target_os = "macos")]
    fn backend() -> crate::Result<Self> {
        Ok(Self {
            program: "/usr/bin/sandbox-exec",
            arguments: &["-p", "(version 1) (allow default) (deny network*)"],
        })
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    fn backend() -> crate::Result<Self> {
        Err(ErrorKind::LauncherError(
            "Game network isolation is not supported on this system. Change it in Privacy to launch without isolation.".to_owned(),
        )
        .into())
    }

    pub(crate) async fn prepare() -> crate::Result<Self> {
        let backend = Self::backend()?;
        let result = tokio::time::timeout(
            Duration::from_secs(5),
            backend
                .command(OsStr::new("/usr/bin/true"))
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::piped())
                .kill_on_drop(true)
                .output(),
        )
        .await;
        match result {
            Ok(Ok(output)) if output.status.success() => Ok(backend),
            other => {
                let reason = match other {
                    Ok(Ok(output)) => String::from_utf8_lossy(&output.stderr)
                        .trim()
                        .to_owned(),
                    Ok(Err(error)) => error.to_string(),
                    Err(error) => error.to_string(),
                };
                Err(ErrorKind::LauncherError(format!(
                    "Could not enable game network isolation. The game was not started. Check your system's sandbox support or change the setting in Privacy. {reason}"
                ))
                .into())
            }
        }
    }

    pub(crate) fn command(&self, executable: &OsStr) -> Command {
        let mut command = Command::new(self.program);
        command.args(self.arguments).arg(executable).env_clear();
        command.envs(std::env::vars_os().filter(|(key, _)| {
            let key = key.to_str().unwrap_or_default();
            matches!(
                key,
                "PATH" | "HOME" | "USER" | "LOGNAME" | "SHELL" | "LANG" | "TMPDIR"
                    | "DISPLAY" | "WAYLAND_DISPLAY" | "XAUTHORITY"
                    | "XDG_RUNTIME_DIR" | "XDG_SESSION_TYPE" | "XDG_DATA_DIRS"
            ) || key.starts_with("LC_")
        }));
        command
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    fn java_is_passed_to_the_system_sandbox_without_a_shell() {
        let backend = NetworkIsolation::backend().unwrap();
        let java = OsStr::new("/a path/with spaces/java");
        let command = backend.command(java);
        assert_eq!(command.as_std().get_program(), backend.program);
        assert_eq!(command.as_std().get_args().last(), Some(java));
        assert!(!command.as_std().get_envs().any(|(key, _)| matches!(
            key.to_str(),
            Some("LD_PRELOAD" | "DYLD_INSERT_LIBRARIES" | "JAVA_TOOL_OPTIONS")
        )));
    }

    #[test]
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    fn unsupported_platform_never_builds_an_unprotected_command() {
        assert!(NetworkIsolation::backend().is_err());
    }
}
