use crate::state::DirectoryInfo;
use sqlx::sqlite::{
    SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions,
};
use sqlx::{Pool, Sqlite};
use std::path::Path;
use std::time::Duration;

pub(crate) async fn connect(
    app_identifier: &str,
) -> crate::Result<Pool<Sqlite>> {
    let settings_dir = DirectoryInfo::initial_settings_dir_path(app_identifier)
        .ok_or(crate::ErrorKind::FSError(
            "Could not find valid config dir".to_string(),
        ))?;

    crate::util::io::create_dir_all(&settings_dir).await?;

    let db_path = settings_dir.join("app.db");

    connect_app_db(&db_path).await
}

async fn connect_app_db(db_path: &Path) -> crate::Result<Pool<Sqlite>> {
    if db_path.try_exists()? {
        let pool = open_app_db_pool(db_path).await?;
        sanitize_private_records(&pool).await?;
        pool.close().await;
        super::db_backup::maybe_backup_existing_app_db(db_path).await?;
    }
    open_migrated_app_db(db_path).await
}

async fn open_migrated_app_db(db_path: &Path) -> crate::Result<Pool<Sqlite>> {
    let pool = open_app_db_pool(db_path).await?;

    if let Err(err) = stale_data_cleanup(&pool).await {
        tracing::warn!(
            "Failed to clean up stale data from state database before migrations: {err}"
        );
    }

    // Players may go back to an older launcher whenever they like. An older
    // build does not know the migrations a newer one added, so it must skip
    // them instead of refusing to start. Every migration is additive (new
    // tables, or new columns with defaults), which keeps older builds working
    // on a database a newer build has touched.
    let mut migrator = sqlx::migrate!();
    migrator.set_ignore_missing(true);
    migrator.run(&pool).await?;
    record_current_app_version(&pool).await?;

    if let Err(err) = stale_data_cleanup(&pool).await {
        tracing::warn!(
            "Failed to clean up stale data from state database: {err}"
        );
    }

    Ok(pool)
}

async fn open_app_db_pool(db_path: &Path) -> crate::Result<Pool<Sqlite>> {
    let conn_options = SqliteConnectOptions::new()
        .filename(db_path)
        .busy_timeout(Duration::from_secs(30))
        .journal_mode(SqliteJournalMode::Wal)
        .pragma("secure_delete", "ON")
        .optimize_on_close(true, None)
        .create_if_missing(true);

    Ok(SqlitePoolOptions::new()
        .max_connections(10)
        .min_connections(1)
        .idle_timeout(Duration::from_secs(120))
        .max_lifetime(None)
        .connect_with(conn_options)
        .await?)
}

/// Sanitize old credentials before the database can be copied into a backup.
async fn sanitize_private_records(pool: &Pool<Sqlite>) -> crate::Result<()> {
    use sqlx::Row;
    // These identifiers are fixed schema names, not user input.
    const SECRET_COLUMNS: &[(&str, &str)] = &[
        ("minecraft_users", "access_token"),
        ("minecraft_users", "refresh_token"),
        ("minecraft_device_tokens", "private_key"),
        ("minecraft_device_tokens", "token"),
        ("modrinth_users", "session_id"),
    ];
    let mut transaction = pool.begin().await?;
    let history_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'join_log')",
    )
    .fetch_one(&mut *transaction)
    .await?;
    let mut changed = if history_exists {
        sqlx::query("DELETE FROM join_log")
            .execute(&mut *transaction)
            .await?
            .rows_affected()
            > 0
    } else {
        false
    };
    for &(table, column) in SECRET_COLUMNS {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = ?)",
        )
        .bind(table)
        .fetch_one(&mut *transaction)
        .await?;
        if !exists {
            continue;
        }
        let select = format!(
            "SELECT rowid, {column} FROM {table} WHERE {column} != '' AND {column} NOT GLOB 'mksealed2:*'"
        );
        let update = format!("UPDATE {table} SET {column} = ? WHERE rowid = ?");
        for row in sqlx::query(&select).fetch_all(&mut *transaction).await? {
            let stored: &str = row.try_get(1)?;
            if let Some(replacement) =
                crate::util::secret::migrate_value(stored)
            {
                let id: i64 = row.try_get(0)?;
                sqlx::query(&update)
                    .bind(replacement)
                    .bind(id)
                    .execute(&mut *transaction)
                    .await?;
                changed = true;
            }
        }
    }
    transaction.commit().await?;
    if changed {
        sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
            .execute(pool)
            .await?;
    }
    Ok(())
}

async fn record_current_app_version(pool: &Pool<Sqlite>) -> crate::Result<()> {
    let previous_version = sqlx::query_scalar!(
        "SELECT value FROM app_metadata WHERE key = 'app_version'"
    )
    .fetch_optional(pool)
    .await?;
    let already_used_sync_update = previous_version
        .as_deref()
        .and_then(|version| {
            let mut parts = version.split('.');
            Some((
                parts.next()?.parse::<u64>().ok()?,
                parts.next()?.parse::<u64>().ok()?,
            ))
        })
        .is_some_and(|version| version >= (0, 20));

    if env!("CARGO_PKG_VERSION").starts_with("0.20.")
        && already_used_sync_update
    {
        let mut settings = super::Settings::get(pool).await?;
        if settings.pending_update_toast_for_version.is_some() {
            settings.pending_update_toast_for_version = None;
            settings.update(pool).await?;
        }
    }

    sqlx::query!(
        "
		INSERT INTO app_metadata (key, value, updated_at)
		VALUES ('app_version', ?, unixepoch())
		ON CONFLICT(key) DO UPDATE SET
			value = excluded.value,
			updated_at = excluded.updated_at
		",
        env!("CARGO_PKG_VERSION"),
    )
    .execute(pool)
    .await?;

    Ok(())
}

/// Cleans up data from the database that is no longer referenced, but must be
/// kept around for a little while to allow users to recover from accidental
/// deletions.
async fn stale_data_cleanup(pool: &Pool<Sqlite>) -> crate::Result<()> {
    let mut tx = pool.begin().await?;

    let has_skin_tables = sqlx::query!(
		"SELECT COUNT(*) AS \"count!: i64\" FROM sqlite_master WHERE type = 'table' AND name IN ('custom_minecraft_skins', 'minecraft_users')",
	)
	.fetch_one(&mut *tx)
	.await?
	.count == 2;

    if has_skin_tables {
        sqlx::query!(
			"DELETE FROM custom_minecraft_skins WHERE minecraft_user_uuid NOT IN (SELECT uuid FROM minecraft_users)"
		)
		.execute(&mut *tx)
		.await?;
    }

    tx.commit().await?;

    Ok(())
}
