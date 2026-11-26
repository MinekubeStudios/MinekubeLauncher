use sqlx::{ConnectOptions, Connection};
use sqlx::sqlite::{SqliteConnectOptions, SqliteConnection};
use std::path::{Path, PathBuf};
use std::time::Duration;

const CURRENT_APP_VERSION: &str = env!("CARGO_PKG_VERSION");

pub(crate) async fn maybe_backup_existing_app_db(
    db_path: &Path,
) -> crate::Result<()> {
    if !db_path.try_exists()? {
        tracing::debug!(
            "Skipping pre-migration app database backup because {} does not exist",
            db_path.display()
        );
        return Ok(());
    }

    tracing::debug!(
        "Inspecting {} for a pre-migration app database backup",
        db_path.display()
    );

    let mut conn = match open_read_only_db(db_path).await {
        Ok(conn) => conn,
        Err(err) => {
            tracing::error!(
                "Failed to open {} read-only before migrations: {err}",
                db_path.display()
            );
            return Err(err);
        }
    };

    let has_user_tables = match has_user_tables(&mut conn).await {
        Ok(has_user_tables) => has_user_tables,
        Err(err) => {
            tracing::error!(
                "Failed to inspect app database tables before migrations: {err}"
            );
            return Err(err);
        }
    };
    if !has_user_tables {
        tracing::debug!(
            "Skipping pre-migration app database backup because {} has no app data tables",
            db_path.display()
        );
        return Ok(());
    }

    let stored_version = match read_stored_app_version(&mut conn).await {
        Ok(version) => version,
        Err(err) => {
            tracing::error!(
                "Failed to read stored app database version before migrations: {err}"
            );
            return Err(err);
        }
    };
    if stored_version.as_deref() == Some(CURRENT_APP_VERSION) {
        tracing::debug!(
            "Skipping pre-migration app database backup because app version is already recorded as {CURRENT_APP_VERSION}"
        );
        return Ok(());
    }

    let stored_version = stored_version.as_deref().unwrap_or("unknown");
    let backup_dir = match app_db_backup_dir() {
        Ok(path) => path,
        Err(err) => {
            tracing::error!(
                "Failed to resolve app database backup directory before migrations: {err}"
            );
            return Err(err);
        }
    };
    let backup_path = match next_backup_path(
        &backup_dir,
        stored_version,
        CURRENT_APP_VERSION,
    )
    .await
    {
        Ok(path) => path,
        Err(err) => {
            tracing::error!(
                "Failed to choose app database backup path in {} before migrations: {err}",
                backup_dir.display()
            );
            return Err(err);
        }
    };

    tracing::info!(
        "Creating pre-migration app database backup from version {stored_version} before opening with version {CURRENT_APP_VERSION} at {}",
        backup_path.display()
    );

    if let Err(err) =
        create_sanitized_snapshot(&mut conn, &backup_dir, &backup_path).await
    {
        tracing::error!(
            "Failed to create pre-migration app database backup at {}: {err}",
            backup_path.display()
        );
        return Err(err);
    }

    tracing::info!(
        "Created pre-migration app database backup at {}",
        backup_path.display()
    );

    Ok(())
}

async fn open_read_only_db(db_path: &Path) -> crate::Result<SqliteConnection> {
    let conn_options = SqliteConnectOptions::new()
        .filename(db_path)
        .busy_timeout(Duration::from_secs(30))
        .read_only(true)
        .create_if_missing(false);

    Ok(conn_options.connect().await?)
}

pub fn app_db_backup_dir() -> crate::Result<PathBuf> {
    if let Some(path) = std::env::var_os("THESEUS_DB_BACKUP_DIR") {
        return Ok(PathBuf::from(path));
    }

    let base = dirs::data_local_dir().or_else(dirs::data_dir).ok_or(
        crate::ErrorKind::FSError(
            "Could not find valid data dir for app database backups"
                .to_string(),
        ),
    )?;

    // Its own folder: the upstream app keeps its backups under "Modrinth" in
    // the same place, and the two must never mix.
    let dir = base
        .join("Minekube Launcher")
        .join("Backups")
        .join("app-db");
    Ok(dir)
}

async fn has_user_tables(conn: &mut SqliteConnection) -> crate::Result<bool> {
    let count = sqlx::query_scalar!(
        "
		SELECT COUNT(*)
		FROM sqlite_master
		WHERE type = 'table'
			AND name NOT LIKE 'sqlite_%'
			AND name NOT IN ('_sqlx_migrations', 'app_metadata')
		",
    )
    .fetch_one(&mut *conn)
    .await?;

    Ok(count > 0)
}

async fn read_stored_app_version(
    conn: &mut SqliteConnection,
) -> crate::Result<Option<String>> {
    if !has_table(conn, "app_metadata").await? {
        return Ok(None);
    }

    Ok(sqlx::query_scalar!(
        "SELECT value FROM app_metadata WHERE key = 'app_version'"
    )
    .fetch_optional(&mut *conn)
    .await?)
}

async fn has_table(
    conn: &mut SqliteConnection,
    table_name: &str,
) -> crate::Result<bool> {
    let count = sqlx::query_scalar!(
        "
		SELECT COUNT(*)
		FROM sqlite_master
		WHERE type = 'table' AND name = ?
		",
        table_name,
    )
    .fetch_one(&mut *conn)
    .await?;

    Ok(count > 0)
}

async fn next_backup_path(
    backup_dir: &Path,
    stored_version: &str,
    current_version: &str,
) -> crate::Result<PathBuf> {
    crate::util::io::create_dir_all(backup_dir).await?;

    let stored_version = sanitize_version_for_filename(stored_version);
    let current_version = sanitize_version_for_filename(current_version);

    let backup_path = backup_dir.join(format!(
        "app-db-before-{current_version}-from-{stored_version}.db"
    ));
    if !backup_path.try_exists()? {
        return Ok(backup_path);
    }

    for suffix in 2.. {
        let backup_path = backup_dir.join(format!(
            "app-db-before-{current_version}-from-{stored_version}-{suffix}.db"
        ));
        if !backup_path.try_exists()? {
            return Ok(backup_path);
        }
    }

    unreachable!()
}

fn sanitize_version_for_filename(version: &str) -> String {
    let mut sanitized = String::new();
    let mut replaced_last_char = false;

    for character in version.chars() {
        if character.is_ascii_alphanumeric()
            || character == '.'
            || character == '-'
            || character == '_'
        {
            sanitized.push(character);
            replaced_last_char = false;
        } else if !replaced_last_char {
            sanitized.push('-');
            replaced_last_char = true;
        }
    }

    let sanitized = sanitized.trim_matches(&['.', '-', '_'][..]);
    if sanitized.is_empty() {
        "unknown".to_string()
    } else {
        sanitized.to_string()
    }
}

async fn create_sanitized_snapshot(
    conn: &mut SqliteConnection,
    backup_dir: &Path,
    backup_path: &Path,
) -> crate::Result<()> {
    let staging = tempfile::Builder::new()
        .prefix(".app-db-backup-")
        .tempdir_in(backup_dir)?;
    let snapshot =
        tempfile::NamedTempFile::new_in(staging.path())?.into_temp_path();
    let snapshot_path: &Path = snapshot.as_ref();
    let snapshot_str = snapshot_path.to_str().ok_or_else(|| {
        crate::ErrorKind::UTFError(snapshot_path.to_path_buf())
    })?;
    sqlx::query!("VACUUM INTO ?", snapshot_str)
        .execute(&mut *conn)
        .await?;

    let mut copy = SqliteConnectOptions::new()
        .filename(snapshot_path)
        .pragma("secure_delete", "ON")
        .create_if_missing(false)
        .connect()
        .await?;
    strip_snapshot_credentials(&mut copy).await?;
    copy.close().await?;

    // Publish only after sanitizing; never replace an existing backup.
    snapshot
        .persist_noclobber(backup_path)
        .map_err(|error| error.error)?;
    Ok(())
}

async fn strip_snapshot_credentials(
    conn: &mut SqliteConnection,
) -> crate::Result<()> {
    // Keep local Minecraft profiles and all worlds, settings and server bookmarks.
    const REDACTIONS: &[(&str, &str)] = &[
        (
            "minecraft_users",
            "UPDATE minecraft_users SET access_token = '', refresh_token = ''",
        ),
        (
            "minecraft_device_tokens",
            "DELETE FROM minecraft_device_tokens",
        ),
        ("modrinth_users", "DELETE FROM modrinth_users"),
        ("join_log", "DELETE FROM join_log"),
    ];
    for &(table, sql) in REDACTIONS {
        if has_table(conn, table).await? {
            sqlx::query(sql).execute(&mut *conn).await?;
        }
    }
    sqlx::query("VACUUM").execute(&mut *conn).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn snapshot_keeps_worlds_and_profiles_without_session_secrets() {
        let mut db = SqliteConnectOptions::new()
            .in_memory(true)
            .connect()
            .await
            .unwrap();
        for statement in [
            "CREATE TABLE minecraft_users (username TEXT, access_token TEXT, refresh_token TEXT)",
            "CREATE TABLE minecraft_device_tokens (token TEXT)",
            "CREATE TABLE modrinth_users (session_id TEXT)",
            "CREATE TABLE join_log (host TEXT)",
            "CREATE TABLE worlds (name TEXT)",
            "INSERT INTO minecraft_users VALUES ('Player', 'access', 'refresh')",
            "INSERT INTO minecraft_device_tokens VALUES ('device')",
            "INSERT INTO modrinth_users VALUES ('session')",
            "INSERT INTO join_log VALUES ('history.example')",
            "INSERT INTO worlds VALUES ('Home')",
        ] {
            sqlx::query(statement).execute(&mut db).await.unwrap();
        }
        strip_snapshot_credentials(&mut db).await.unwrap();
        let player: (String, String, String) = sqlx::query_as(
            "SELECT username, access_token, refresh_token FROM minecraft_users",
        )
        .fetch_one(&mut db)
        .await
        .unwrap();
        assert_eq!(player, ("Player".into(), String::new(), String::new()));
        for table in ["minecraft_device_tokens", "modrinth_users", "join_log"] {
            let count: i64 =
                sqlx::query_scalar(&format!("SELECT count(*) FROM {table}"))
                    .fetch_one(&mut db)
                    .await
                    .unwrap();
            assert_eq!(count, 0);
        }
        let world: String = sqlx::query_scalar("SELECT name FROM worlds")
            .fetch_one(&mut db)
            .await
            .unwrap();
        assert_eq!(world, "Home");
    }
}
