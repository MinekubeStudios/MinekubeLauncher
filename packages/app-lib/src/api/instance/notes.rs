use crate::state::State;

pub async fn get_notes(instance_id: &str) -> crate::Result<String> {
    let state = State::get().await?;
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM instances WHERE id = ?)",
    )
    .bind(instance_id)
    .fetch_one(&state.pool)
    .await?;

    if !exists {
        return Err(crate::ErrorKind::InputError(
            "Unknown instance".to_string(),
        )
        .into());
    }

    let notes = sqlx::query_scalar::<_, String>(
        "SELECT notes FROM instance_notes WHERE instance_id = ?",
    )
    .bind(instance_id)
    .fetch_optional(&state.pool)
    .await?;

    Ok(notes.unwrap_or_default())
}

pub async fn set_notes(instance_id: &str, notes: String) -> crate::Result<()> {
    let state = State::get().await?;
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM instances WHERE id = ?)",
    )
    .bind(instance_id)
    .fetch_one(&state.pool)
    .await?;

    if !exists {
        return Err(crate::ErrorKind::InputError(
            "Unknown instance".to_string(),
        )
        .into());
    }

    sqlx::query(
        "INSERT INTO instance_notes (instance_id, notes) VALUES (?, ?) \
         ON CONFLICT (instance_id) DO UPDATE SET notes = excluded.notes",
    )
    .bind(instance_id)
    .bind(notes)
    .execute(&state.pool)
    .await?;

    Ok(())
}
