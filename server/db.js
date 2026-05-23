const { DatabaseSync } = require('node:sqlite')
const { randomBytes } = require('node:crypto')
const path = require('path')

const DB_PATH = path.join(__dirname, 'beacon.db')
const db = new DatabaseSync(DB_PATH)

db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

// Polyfill better-sqlite3-style .transaction() for node:sqlite
db.transaction = function (fn) {
  return function (...args) {
    db.exec('BEGIN')
    try {
      const result = fn(...args)
      db.exec('COMMIT')
      return result
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }
}

const ACCESS_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateAccessCode() {
  const bytes = randomBytes(6)
  return Array.from(bytes).map(b => ACCESS_CODE_CHARS[b % ACCESS_CODE_CHARS.length]).join('')
}

db.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL,
    slug           TEXT NOT NULL UNIQUE,
    address_street TEXT,
    address_city   TEXT,
    address_state  TEXT,
    address_zip    TEXT,
    website        TEXT,
    phone          TEXT,
    timezone       TEXT NOT NULL DEFAULT 'America/Chicago',
    access_code    TEXT NOT NULL,
    created_at     TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id        INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'team_member' CHECK(role IN ('admin','team_member')),
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS campuses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id      INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS service_types (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    campus_id           INTEGER REFERENCES campuses(id) ON DELETE SET NULL,
    name                TEXT NOT NULL,
    pco_service_type_id TEXT,
    created_at          TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS people (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id        INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    pco_person_id TEXT,
    photo_url     TEXT,
    category      TEXT DEFAULT 'Worship',
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS photo_overrides (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id  INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    photo_url  TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS labels (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id     INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL CHECK(type IN ('mic','iem','other')),
    group_name TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS automation_rules (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id          INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    priority        INTEGER NOT NULL DEFAULT 0,
    condition_field TEXT NOT NULL CHECK(condition_field IN ('name','position')),
    condition_op    TEXT NOT NULL CHECK(condition_op IN ('is','contains')),
    condition_value TEXT NOT NULL,
    action_type     TEXT NOT NULL CHECK(action_type IN ('mic','iem','slot')),
    action_value    TEXT NOT NULL,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS screens (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id           INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    token            TEXT NOT NULL UNIQUE,
    campus_id        INTEGER REFERENCES campuses(id) ON DELETE SET NULL,
    share_code       TEXT UNIQUE,
    mirror_screen_id INTEGER REFERENCES screens(id) ON DELETE SET NULL,
    description      TEXT,
    created_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    service_type_id INTEGER REFERENCES service_types(id) ON DELETE CASCADE,
    cron_expr       TEXT NOT NULL,
    enabled         INTEGER DEFAULT 1,
    last_run        TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invite_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id     INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    role       TEXT NOT NULL DEFAULT 'team_member',
    email      TEXT,
    used       INTEGER DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pco_tokens (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    access_token  TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at    TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used       INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS active_assignments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
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
    updated_at   TEXT DEFAULT (datetime('now'))
  );
`)

// Ensure default org
const orgCount = db.prepare('SELECT COUNT(*) as n FROM organizations').get()
if (orgCount.n === 0) {
  db.prepare(
    'INSERT INTO organizations (name, slug, access_code) VALUES (?, ?, ?)'
  ).run('My Church', 'mychurch', generateAccessCode())
}

// Migration block — handle upgrades from older schema
;(function runMigrations() {
  const org = db.prepare('SELECT id FROM organizations LIMIT 1').get()
  const orgId = org.id

  // --- Migrate users table if org_id column is missing ---
  const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name)
  if (!userCols.includes('org_id')) {
    db.exec('PRAGMA foreign_keys = OFF')
    db.exec(`
      CREATE TABLE IF NOT EXISTS users_new (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id        INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'team_member' CHECK(role IN ('admin','team_member')),
        created_at    TEXT DEFAULT (datetime('now'))
      )
    `)
    db.exec(`
      INSERT INTO users_new (id, org_id, name, email, password_hash, role, created_at)
      SELECT id, ${orgId}, name, email, password_hash,
        CASE WHEN role = 'admin' THEN 'admin' ELSE 'team_member' END,
        created_at
      FROM users
    `)
    db.exec('DROP TABLE users')
    db.exec('ALTER TABLE users_new RENAME TO users')
    db.exec('PRAGMA foreign_keys = ON')
  }

  // --- Add org_id to other tables if missing ---
  const orgTables = ['campuses', 'screens', 'people', 'labels', 'automation_rules']
  for (const tbl of orgTables) {
    const cols = db.prepare(`PRAGMA table_info(${tbl})`).all().map(c => c.name)
    if (!cols.includes('org_id')) {
      db.exec(`ALTER TABLE ${tbl} ADD COLUMN org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE`)
      db.prepare(`UPDATE ${tbl} SET org_id = ?`).run(orgId)
    }
  }

  // --- Screen column migrations (mirror_screen_id, description) ---
  const screenCols = db.prepare('PRAGMA table_info(screens)').all().map(c => c.name)
  if (!screenCols.includes('mirror_screen_id')) {
    db.exec('ALTER TABLE screens ADD COLUMN mirror_screen_id INTEGER REFERENCES screens(id) ON DELETE SET NULL')
  }
  if (!screenCols.includes('description')) {
    db.exec('ALTER TABLE screens ADD COLUMN description TEXT')
  }

  // --- Split address field into 4 columns ---
  const orgCols = db.prepare('PRAGMA table_info(organizations)').all().map(c => c.name)
  // --- invite_tokens email column ---
  const inviteCols = db.prepare('PRAGMA table_info(invite_tokens)').all().map(c => c.name)
  if (!inviteCols.includes('email')) {
    db.exec('ALTER TABLE invite_tokens ADD COLUMN email TEXT')
  }

  if (!orgCols.includes('timezone')) {
    db.exec("ALTER TABLE organizations ADD COLUMN timezone TEXT NOT NULL DEFAULT 'America/Chicago'")
  }

  if (!orgCols.includes('address_street')) {
    db.exec('ALTER TABLE organizations ADD COLUMN address_street TEXT')
    // Migrate existing single-field address into street if present
    if (orgCols.includes('address')) {
      db.exec('UPDATE organizations SET address_street = address WHERE address IS NOT NULL')
    }
  }
  if (!orgCols.includes('address_city'))  db.exec('ALTER TABLE organizations ADD COLUMN address_city TEXT')
  if (!orgCols.includes('address_state')) db.exec('ALTER TABLE organizations ADD COLUMN address_state TEXT')
  if (!orgCols.includes('address_zip'))   db.exec('ALTER TABLE organizations ADD COLUMN address_zip TEXT')
  if (!orgCols.includes('logo_url'))      db.exec('ALTER TABLE organizations ADD COLUMN logo_url TEXT')

  // --- Add email to people ---
  const peopleCols = db.prepare('PRAGMA table_info(people)').all().map(c => c.name)
  if (!peopleCols.includes('email')) {
    db.exec('ALTER TABLE people ADD COLUMN email TEXT')
  }

  // --- Add override columns to people ---
  const peopleCols2 = db.prepare('PRAGMA table_info(people)').all().map(c => c.name)
  if (!peopleCols2.includes('name_override'))     db.exec('ALTER TABLE people ADD COLUMN name_override TEXT')
  if (!peopleCols2.includes('photo_override'))    db.exec('ALTER TABLE people ADD COLUMN photo_override TEXT')
  if (!peopleCols2.includes('email_override'))    db.exec('ALTER TABLE people ADD COLUMN email_override TEXT')
  if (!peopleCols2.includes('category_override')) db.exec('ALTER TABLE people ADD COLUMN category_override TEXT')

  // --- Add portrait photo columns to people ---
  const peopleCols3 = db.prepare('PRAGMA table_info(people)').all().map(c => c.name)
  if (!peopleCols3.includes('photo_url_portrait'))      db.exec('ALTER TABLE people ADD COLUMN photo_url_portrait TEXT')
  if (!peopleCols3.includes('photo_override_portrait')) db.exec('ALTER TABLE people ADD COLUMN photo_override_portrait TEXT')

  // --- Add position column to people ---
  const peopleCols4 = db.prepare('PRAGMA table_info(people)').all().map(c => c.name)
  if (!peopleCols4.includes('position'))          db.exec('ALTER TABLE people ADD COLUMN position TEXT')
  if (!peopleCols4.includes('position_override')) db.exec('ALTER TABLE people ADD COLUMN position_override TEXT')

  // --- Add layout column to screens ---
  const screenCols2 = db.prepare('PRAGMA table_info(screens)').all().map(c => c.name)
  if (!screenCols2.includes('layout')) db.exec("ALTER TABLE screens ADD COLUMN layout TEXT DEFAULT 'grid-standard'")
  if (!screenCols2.includes('last_heartbeat')) db.exec('ALTER TABLE screens ADD COLUMN last_heartbeat TEXT')

  // --- Create templates table ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id      INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      description TEXT,
      config      TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    )
  `)

  // --- Add screen_ids to schedules ---
  const schedCols = db.prepare('PRAGMA table_info(schedules)').all().map(c => c.name)
  if (!schedCols.includes('screen_ids')) db.exec('ALTER TABLE schedules ADD COLUMN screen_ids TEXT')

  // --- Add mode to service_types ---
  const stCols2 = db.prepare('PRAGMA table_info(service_types)').all().map(c => c.name)
  if (!stCols2.includes('mode')) db.exec("ALTER TABLE service_types ADD COLUMN mode TEXT NOT NULL DEFAULT 'pco'")

  // --- Manual assignments (non-PCO service type roster) ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS manual_assignments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      service_type_id INTEGER NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
      person_id       INTEGER REFERENCES people(id) ON DELETE CASCADE,
      slot            INTEGER NOT NULL DEFAULT 0,
      position        TEXT
    )
  `)

  // Migrate old manual_assignments that had mic/iem label columns
  const maCols = db.prepare('PRAGMA table_info(manual_assignments)').all().map(c => c.name)
  if (maCols.includes('mic_label_id')) {
    db.exec('PRAGMA foreign_keys = OFF')
    db.exec(`
      CREATE TABLE manual_assignments_new (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        service_type_id INTEGER NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
        person_id       INTEGER REFERENCES people(id) ON DELETE CASCADE,
        slot            INTEGER NOT NULL DEFAULT 0,
        position        TEXT
      )
    `)
    db.exec('INSERT INTO manual_assignments_new (id, service_type_id, person_id, slot) SELECT id, service_type_id, person_id, slot FROM manual_assignments')
    db.exec('DROP TABLE manual_assignments')
    db.exec('ALTER TABLE manual_assignments_new RENAME TO manual_assignments')
    db.exec('PRAGMA foreign_keys = ON')
  }

  // --- Position types (predefined position labels for manual service teams) ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS position_types (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id     INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // --- Convert single-value category strings to JSON arrays (idempotent) ---
  db.prepare(`UPDATE people SET category          = '["' || category          || '"]' WHERE category          IS NOT NULL AND category          NOT LIKE '[%'`).run()
  db.prepare(`UPDATE people SET category_override = '["' || category_override || '"]' WHERE category_override IS NOT NULL AND category_override NOT LIKE '[%'`).run()

  // --- Add dashboard_config to users ---
  const userCols2 = db.prepare('PRAGMA table_info(users)').all().map(c => c.name)
  if (!userCols2.includes('dashboard_config')) {
    db.exec('ALTER TABLE users ADD COLUMN dashboard_config TEXT')
  }
})()

// Mark setup complete for existing installs that already have an admin
const setupDone = db.prepare("SELECT value FROM settings WHERE key = 'setup_complete'").get()
if (!setupDone) {
  const hasAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get()
  if (hasAdmin) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('setup_complete', 'true')").run()
  }
}

module.exports = db
module.exports.generateAccessCode = generateAccessCode
