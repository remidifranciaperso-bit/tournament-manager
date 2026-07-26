-- PostgreSQL — service tournament-manager-platform (Render)
-- Appliquer une fois : psql $DATABASE_URL -f schema/platform.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'organizer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS club_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    club TEXT NOT NULL DEFAULT '',
    nb_terrains INT NOT NULL DEFAULT 4 CHECK (nb_terrains BETWEEN 1 AND 8),
    terrains JSONB NOT NULL DEFAULT '["TERRAIN 1","TERRAIN 2","TERRAIN 3","TERRAIN 4"]'::jsonb,
    terrain_principal TEXT NOT NULL DEFAULT 'TERRAIN 1',
    has_logo BOOLEAN NOT NULL DEFAULT false,
    logo_data BYTEA,
    logo_content_type TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE tournament_status AS ENUM (
    'generated',
    'convocations_sent',
    'live_active',
    'finished'
);

CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date_label TEXT NOT NULL DEFAULT '',
    format_label TEXT NOT NULL DEFAULT '',
    teams INT NOT NULL DEFAULT 0,
    status tournament_status NOT NULL DEFAULT 'generated',
    pdf_filename TEXT,
    pdf_data BYTEA,
    engine_v2_pdf_path TEXT,
    live_snapshot JSONB,
    export_captures JSONB,
    crosspage_stubs JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_user_id ON tournaments(user_id);
