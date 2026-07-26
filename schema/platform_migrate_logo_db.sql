-- Migration : logos club sur disque → PostgreSQL (plan Render free, sans disque persistant)
-- À lancer une fois si la base a déjà été créée avec logo_path :
--   psql $DATABASE_URL -f schema/platform_migrate_logo_db.sql

ALTER TABLE club_profiles ADD COLUMN IF NOT EXISTS logo_data BYTEA;
ALTER TABLE club_profiles ADD COLUMN IF NOT EXISTS logo_content_type TEXT;

-- Ancienne colonne fichier (optionnel)
ALTER TABLE club_profiles DROP COLUMN IF EXISTS logo_path;
