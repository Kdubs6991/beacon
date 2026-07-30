require('dotenv').config()
const { Pool } = require('pg')
const { randomBytes } = require('node:crypto')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
})

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message)
})

// Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ...
function convertParams(sql) {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

const db = {
  pool,

  async getOne(sql, params = []) {
    const result = await pool.query(convertParams(sql), params)
    return result.rows[0] ?? null
  },

  async getAll(sql, params = []) {
    const result = await pool.query(convertParams(sql), params)
    return result.rows
  },

  // Use for INSERT (with RETURNING id), UPDATE, DELETE
  async execute(sql, params = []) {
    const result = await pool.query(convertParams(sql), params)
    return { changes: result.rowCount, lastInsertId: result.rows[0]?.id ?? null }
  },

  async withTransaction(fn) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const tx = {
        getOne: async (sql, params = []) => {
          const r = await client.query(convertParams(sql), params)
          return r.rows[0] ?? null
        },
        getAll: async (sql, params = []) => {
          const r = await client.query(convertParams(sql), params)
          return r.rows
        },
        execute: async (sql, params = []) => {
          const r = await client.query(convertParams(sql), params)
          return { changes: r.rowCount, lastInsertId: r.rows[0]?.id ?? null }
        },
      }
      const result = await fn(tx)
      await client.query('COMMIT')
      return result
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  },

  async init() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id             SERIAL PRIMARY KEY,
        name           TEXT NOT NULL,
        slug           TEXT NOT NULL UNIQUE,
        short_name     TEXT,
        address_street TEXT,
        address_city   TEXT,
        address_state  TEXT,
        address_zip    TEXT,
        website        TEXT,
        phone          TEXT,
        timezone       TEXT NOT NULL DEFAULT 'America/Chicago',
        access_code    TEXT NOT NULL,
        logo_url       TEXT,
        created_at     TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id               SERIAL PRIMARY KEY,
        org_id           INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name             TEXT NOT NULL,
        email            TEXT NOT NULL,
        password_hash    TEXT NOT NULL,
        role             TEXT NOT NULL DEFAULT 'team_member' CHECK(role IN ('admin','team_member')),
        dashboard_config TEXT,
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT users_email_org_unique UNIQUE (org_id, email)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS campuses (
        id          SERIAL PRIMARY KEY,
        org_id      INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        description TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS service_types (
        id                  SERIAL PRIMARY KEY,
        campus_id           INTEGER REFERENCES campuses(id) ON DELETE SET NULL,
        name                TEXT NOT NULL,
        pco_service_type_id TEXT,
        mode                TEXT NOT NULL DEFAULT 'pco',
        created_at          TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS people (
        id                      SERIAL PRIMARY KEY,
        org_id                  INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name                    TEXT NOT NULL,
        pco_person_id           TEXT,
        photo_url               TEXT,
        photo_url_portrait      TEXT,
        photo_override          TEXT,
        photo_override_portrait TEXT,
        name_override           TEXT,
        email                   TEXT,
        email_override          TEXT,
        category                TEXT DEFAULT 'Worship',
        category_override       TEXT,
        position                TEXT,
        position_override       TEXT,
        created_at              TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS photo_overrides (
        id         SERIAL PRIMARY KEY,
        person_id  INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        photo_url  TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS labels (
        id         SERIAL PRIMARY KEY,
        org_id     INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name       TEXT NOT NULL,
        type       TEXT NOT NULL CHECK(type IN ('mic','iem','other')),
        group_name TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS automation_rules (
        id              SERIAL PRIMARY KEY,
        org_id          INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        priority        INTEGER NOT NULL DEFAULT 0,
        condition_field TEXT NOT NULL CHECK(condition_field IN ('name','position')),
        condition_op    TEXT NOT NULL CHECK(condition_op IN ('is','contains')),
        condition_value TEXT NOT NULL,
        action_type     TEXT NOT NULL CHECK(action_type IN ('mic','iem','slot')),
        action_value    TEXT NOT NULL,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS screens (
        id               SERIAL PRIMARY KEY,
        org_id           INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name             TEXT NOT NULL,
        token            TEXT NOT NULL UNIQUE,
        layout           TEXT DEFAULT 'grid-standard',
        campus_id        INTEGER REFERENCES campuses(id) ON DELETE SET NULL,
        share_code       TEXT UNIQUE,
        mirror_screen_id INTEGER REFERENCES screens(id) ON DELETE SET NULL,
        description      TEXT,
        last_heartbeat   TIMESTAMPTZ,
        created_at       TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS schedules (
        id              SERIAL PRIMARY KEY,
        service_type_id INTEGER REFERENCES service_types(id) ON DELETE CASCADE,
        cron_expr       TEXT NOT NULL,
        enabled         SMALLINT DEFAULT 1,
        screen_ids      TEXT,
        last_run        TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invite_tokens (
        id         SERIAL PRIMARY KEY,
        org_id     INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        token      TEXT NOT NULL UNIQUE,
        role       TEXT NOT NULL DEFAULT 'team_member',
        email      TEXT,
        used       SMALLINT DEFAULT 0,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS pco_tokens (
        id            SERIAL PRIMARY KEY,
        access_token  TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at    TIMESTAMPTZ NOT NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used       SMALLINT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS active_assignments (
        id           SERIAL PRIMARY KEY,
        screen_id    INTEGER NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
        person_id    INTEGER REFERENCES people(id) ON DELETE SET NULL,
        person_name  TEXT,
        person_photo TEXT,
        slot         INTEGER,
        position     TEXT,
        mic_label    TEXT,
        iem_label    TEXT,
        event_name   TEXT,
        event_date   TEXT,
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS templates (
        id          SERIAL PRIMARY KEY,
        org_id      INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        description TEXT,
        config      TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS manual_assignments (
        id              SERIAL PRIMARY KEY,
        service_type_id INTEGER NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
        person_id       INTEGER REFERENCES people(id) ON DELETE CASCADE,
        slot            INTEGER NOT NULL DEFAULT 0,
        position        TEXT
      );

      CREATE TABLE IF NOT EXISTS position_types (
        id         SERIAL PRIMARY KEY,
        org_id     INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name       TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS site_pages (
        id         SERIAL PRIMARY KEY,
        slug       TEXT UNIQUE NOT NULL,
        title      TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS site_blocks (
        id         SERIAL PRIMARY KEY,
        page_id    INTEGER REFERENCES site_pages(id) ON DELETE CASCADE,
        sort_order REAL NOT NULL DEFAULT 0,
        type       TEXT NOT NULL,
        data       JSONB NOT NULL DEFAULT '{}'
      );
    `)

    // Indexes — safe to run on existing databases, IF NOT EXISTS is a no-op when already present
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_people_org_id             ON people(org_id);
      CREATE INDEX IF NOT EXISTS idx_people_pco_person_id      ON people(pco_person_id);
      CREATE INDEX IF NOT EXISTS idx_labels_org_id             ON labels(org_id);
      CREATE INDEX IF NOT EXISTS idx_screens_org_id            ON screens(org_id);
      CREATE INDEX IF NOT EXISTS idx_campuses_org_id           ON campuses(org_id);
      CREATE INDEX IF NOT EXISTS idx_automation_rules_org_id   ON automation_rules(org_id);
      CREATE INDEX IF NOT EXISTS idx_templates_org_id          ON templates(org_id);
      CREATE INDEX IF NOT EXISTS idx_position_types_org_id     ON position_types(org_id);
      CREATE INDEX IF NOT EXISTS idx_users_org_id              ON users(org_id);
      CREATE INDEX IF NOT EXISTS idx_invite_tokens_org_id      ON invite_tokens(org_id);
      CREATE INDEX IF NOT EXISTS idx_schedules_svc_type        ON schedules(service_type_id);
      CREATE INDEX IF NOT EXISTS idx_manual_assignments_svc    ON manual_assignments(service_type_id);
      CREATE INDEX IF NOT EXISTS idx_manual_assignments_person ON manual_assignments(person_id);
      CREATE INDEX IF NOT EXISTS idx_active_assignments_screen ON active_assignments(screen_id);
      CREATE INDEX IF NOT EXISTS idx_active_assignments_person ON active_assignments(person_id);
      CREATE INDEX IF NOT EXISTS idx_photo_overrides_person    ON photo_overrides(person_id);
      CREATE INDEX IF NOT EXISTS idx_svc_types_campus          ON service_types(campus_id);
    `)

    // Data integrity constraint — prevents duplicate slots on the same screen
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_active_assignments_screen_slot'
        ) THEN
          ALTER TABLE active_assignments ADD CONSTRAINT uq_active_assignments_screen_slot UNIQUE (screen_id, slot);
        END IF;
      END $$;
    `)

    // Migrate: add org_id to pco_tokens for per-org PCO connections
    await pool.query(`ALTER TABLE pco_tokens ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE`)

    // Migrate: cache PCO service type name alongside the ID
    await pool.query(`ALTER TABLE service_types ADD COLUMN IF NOT EXISTS pco_service_type_name TEXT`)

    // Migrate: store selected PCO team IDs for filtering (JSON array, null = all teams)
    await pool.query(`ALTER TABLE service_types ADD COLUMN IF NOT EXISTS pco_team_ids TEXT`)
    await pool.query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS timezone TEXT`)

    // Migrate: track which seed version was last applied to the landing page
    await pool.query(`ALTER TABLE site_pages ADD COLUMN IF NOT EXISTS seed_version INTEGER NOT NULL DEFAULT 0`)

    // Migrate: replace global email uniqueness with per-org uniqueness
    await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key`)
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_email_org_unique'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_email_org_unique UNIQUE (org_id, email);
        END IF;
      END $$;
    `)

    // Ensure a default org exists
    const orgCount = await db.getOne('SELECT COUNT(*) AS n FROM organizations')
    if (parseInt(orgCount.n) === 0) {
      await db.execute(
        'INSERT INTO organizations (name, slug, access_code) VALUES (?, ?, ?)',
        ['My Church', 'mychurch', generateAccessCode()]
      )
    }

    // Mark setup complete for existing installs that already have an admin
    const setupDone = await db.getOne("SELECT value FROM settings WHERE key = 'setup_complete'")
    if (!setupDone) {
      const hasAdmin = await db.getOne("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
      if (hasAdmin) {
        await db.execute(
          "INSERT INTO settings (key, value) VALUES ('setup_complete', 'true') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"
        )
      }
    }

    await seedDocsIfEmpty(pool)
    await seedLandingIfEmpty(pool)
  },
}

const ACCESS_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateAccessCode() {
  const bytes = randomBytes(6)
  return Array.from(bytes).map(b => ACCESS_CODE_CHARS[b % ACCESS_CODE_CHARS.length]).join('')
}

const LANDING_SEED_VERSION = 3

async function seedLandingIfEmpty(pool) {
  const { LANDING_SEED_SECTIONS } = require('./data/landingSeed')
  let pageId

  const existing = await pool.query("SELECT id, seed_version FROM site_pages WHERE slug = 'landing'")
  if (existing.rows.length > 0) {
    pageId = existing.rows[0].id
    const storedVersion = existing.rows[0].seed_version || 0

    // Check for old pre-element format (type != 'section')
    const oldFormat = await pool.query(
      "SELECT 1 FROM site_blocks WHERE page_id = $1 AND type != 'section' LIMIT 1",
      [pageId]
    )
    const isOldFormat = oldFormat.rows.length > 0

    if (!isOldFormat && storedVersion >= LANDING_SEED_VERSION) return // Already current

    await pool.query('DELETE FROM site_blocks WHERE page_id = $1', [pageId])
    if (isOldFormat) {
      console.log('[beacon] Migrating landing page to element-based format')
    } else {
      console.log(`[beacon] Updating landing page seed to v${LANDING_SEED_VERSION}`)
    }
  } else {
    const newPage = await pool.query("INSERT INTO site_pages (slug, title) VALUES ('landing', 'Landing Page') RETURNING id")
    pageId = newPage.rows[0].id
  }

  for (let i = 0; i < LANDING_SEED_SECTIONS.length; i++) {
    const s = LANDING_SEED_SECTIONS[i]
    await pool.query(
      'INSERT INTO site_blocks (page_id, sort_order, type, data) VALUES ($1, $2, $3, $4)',
      [pageId, i, s.type, JSON.stringify(s.data)]
    )
  }
  await pool.query('UPDATE site_pages SET seed_version = $1 WHERE id = $2', [LANDING_SEED_VERSION, pageId])
  console.log(`[beacon] Seeded landing page with ${LANDING_SEED_SECTIONS.length} sections (v${LANDING_SEED_VERSION})`)
}

async function seedDocsIfEmpty(pool) {
  const existing = await pool.query("SELECT id FROM site_pages WHERE slug = 'docs'")
  if (existing.rows.length > 0) return
  const { DOCS_SEED_BLOCKS } = require('./data/docsSeed')
  const page = await pool.query("INSERT INTO site_pages (slug, title) VALUES ('docs', 'Documentation') RETURNING id")
  const pageId = page.rows[0].id
  for (let i = 0; i < DOCS_SEED_BLOCKS.length; i++) {
    const block = DOCS_SEED_BLOCKS[i]
    await pool.query(
      'INSERT INTO site_blocks (page_id, sort_order, type, data) VALUES ($1, $2, $3, $4)',
      [pageId, i, block.type, JSON.stringify(block.data)]
    )
  }
  console.log(`[beacon] Seeded docs page with ${DOCS_SEED_BLOCKS.length} blocks`)
}

module.exports = db
module.exports.generateAccessCode = generateAccessCode
