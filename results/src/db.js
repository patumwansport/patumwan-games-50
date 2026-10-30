import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

// อ่านข้อมูลอ้างอิงจากไฟล์ข้อมูลเว็บไซต์
export function siteData(siteRoot, file, key) {
  const window = {};
  vm.runInNewContext(readFileSync(join(siteRoot, 'js/data', file), 'utf8'), { window });
  return JSON.parse(JSON.stringify(window.SiteData[key]));
}

// เปิด SQLite และสร้างตารางหรือดัชนีที่จำเป็น
export function openDb(file) {
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','staff')),
      display_name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
      must_change INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS assignments (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sport_id INTEGER NOT NULL, permission TEXT NOT NULL CHECK(permission IN ('technician','reviewer')),
      PRIMARY KEY(user_id,sport_id)
    );
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE COLLATE NOCASE,
      sport_id INTEGER NOT NULL, payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','returned','approved')),
      version INTEGER NOT NULL DEFAULT 1, submitted_by INTEGER REFERENCES users(id),
      published TEXT, review_note TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY, at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER REFERENCES users(id), match_id INTEGER REFERENCES matches(id),
      action TEXT NOT NULL, detail TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_matches_sport ON matches(sport_id);
    CREATE INDEX IF NOT EXISTS idx_audit_match ON audit_log(match_id);
  `);
  return db;
}

// ทำงานในธุรกรรมและย้อนกลับเมื่อเกิดข้อผิดพลาด
export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
