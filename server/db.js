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
        email            TEXT NOT NULL UNIQUE,
        password_hash    TEXT NOT NULL,
        role             TEXT NOT NULL DEFAULT 'team_member' CHECK(role IN ('admin','team_member')),
        dashboard_config TEXT,
        created_at       TIMESTAMPTZ DEFAULT NOW()
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
  },
}

const ACCESS_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateAccessCode() {
  const bytes = randomBytes(6)
  return Array.from(bytes).map(b => ACCESS_CODE_CHARS[b % ACCESS_CODE_CHARS.length]).join('')
}

module.exports = db
module.exports.generateAccessCode = generateAccessCode
