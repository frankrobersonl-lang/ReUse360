-- ─────────────────────────────────────────────
-- ReUse360 Plus — Postgres Init Script
-- Runs once on first container startup
-- ─────────────────────────────────────────────

-- Enable PostGIS extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS postgis_raster;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS address_standardizer;
CREATE EXTENSION IF NOT EXISTS pg_trgm;          -- fuzzy text search on addresses
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";       -- UUID generation
CREATE EXTENSION IF NOT EXISTS btree_gin;         -- GIN index support

-- Set default search path
ALTER DATABASE reuse360plus SET search_path TO public;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE reuse360plus TO reuse360;
GRANT ALL ON SCHEMA public TO reuse360;

-- Verify PostGIS
DO $$
BEGIN
  RAISE NOTICE 'PostGIS version: %', PostGIS_Full_Version();
END $$;
