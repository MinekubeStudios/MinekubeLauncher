//! Theseus process management interface

use crate::state::ProcessMetadata;
pub use crate::state::has_minecraft_window_log;
pub use crate::{
    State,
    state::{Hooks, MemorySettings, Settings, WindowSize},
};
use std::collections::HashSet;
use uuid::Uuid;

// Gets each running stored process in the state
#[tracing::instrument]
pub async fn get_all() -> crate::Result<Vec<ProcessMetadata>> {
    let state = State::get().await?;
    let processes = state.process_manager.get_all();
    Ok(processes)
}

pub async fn resolve_instance_id(instance: &str) -> crate::Result<String> {
    let state = State::get().await?;
    resolve_instance_id_with_state(instance, &state)
        .await?
        .ok_or_else(|| {
            crate::ErrorKind::InputError(format!(
                "Unknown instance id or path: {instance}"
            ))
            .as_error()
        })
}

async fn resolve_instance_id_with_state(
    instance: &str,
    state: &State,
) -> crate::Result<Option<String>> {
    sqlx::query_scalar!(
        "
		SELECT id
		FROM instances
		WHERE id = ? OR path = ?
		ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END
		LIMIT 1
		",
        instance,
        instance,
        instance,
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(Into::into)
}

// Gets the UUID of each stored process in the state by instance id
#[tracing::instrument]
pub async fn get_by_instance_id(
    instance_id: &str,
) -> crate::Result<Vec<ProcessMetadata>> {
    let state = State::get().await?;
    let processes = state
        .process_manager
        .get_all()
        .into_iter()
        .filter(|x| x.instance_id == instance_id)
        .collect();
    Ok(processes)
}

// Gets all active OS PIDs (including child/descendant processes) for an instance
#[tracing::instrument]
pub async fn get_pids_by_instance_id(
    instance_id: &str,
) -> crate::Result<Vec<u32>> {
    let state = State::get().await?;
    let mut root_pids = HashSet::new();

    for proc in state
        .process_manager
        .get_all()
        .into_iter()
        .filter(|x| x.instance_id == instance_id)
    {
        if let Some(pid) = proc.pid {
            root_pids.insert(pid);
        }
    }

    if let Ok(rows) = sqlx::query!(
        "SELECT pid FROM processes WHERE instance_id = ?",
        instance_id
    )
    .fetch_all(&state.pool)
    .await
    {
        for row in rows {
            if let Ok(pid) = u32::try_from(row.pid) {
                root_pids.insert(pid);
            }
        }
    }

    if root_pids.is_empty() {
        return Ok(Vec::new());
    }

    // Only the process tree is needed. `System::new_all()` also sampled CPU,
    // memory and disks, and this runs every few hundred milliseconds while a
    // game is starting.
    let system = sysinfo::System::new_with_specifics(
        sysinfo::RefreshKind::nothing()
            .with_processes(sysinfo::ProcessRefreshKind::nothing()),
    );
    let mut all_pids = root_pids.clone();

    // Expand descendants (e.g. when a wrapper script spawns java/javaw)
    let mut added = true;
    while added {
        added = false;
        for (pid, process) in system.processes() {
            let pid_u32 = pid.as_u32();
            if all_pids.contains(&pid_u32) {
                continue;
            }
            if let Some(parent_pid) = process.parent()
                && all_pids.contains(&parent_pid.as_u32())
            {
                all_pids.insert(pid_u32);
                added = true;
            }
        }
    }

    Ok(all_pids.into_iter().collect())
}

// Kill a child process stored in the state by UUID, as a string
#[tracing::instrument]
pub async fn kill(uuid: Uuid) -> crate::Result<()> {
    let state = State::get().await?;
    state.process_manager.kill(uuid).await?;

    Ok(())
}

// Wait for a child process stored in the state by UUID
#[tracing::instrument]
pub async fn wait_for(uuid: Uuid) -> crate::Result<()> {
    let state = State::get().await?;
    state.process_manager.wait_for(uuid).await?;

    Ok(())
}
