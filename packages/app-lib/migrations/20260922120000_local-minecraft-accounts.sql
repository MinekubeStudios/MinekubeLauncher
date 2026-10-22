-- Minecraft accounts can now either be Microsoft accounts (authenticated
-- through Xbox Live, as before) or local accounts, which live purely on this
-- machine and never contact Microsoft or Mojang services.
ALTER TABLE minecraft_users
    ADD COLUMN account_type TEXT NOT NULL DEFAULT 'microsoft'
        CHECK (account_type IN ('microsoft', 'local'));
