// รหัสผ่าน (scrypt) และ session แบบ cookie HttpOnly
import { randomBytes, randomInt, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

const SESSION_HOURS = 8;
const COOKIE = 'results_sid';

// สร้างค่าแฮชรหัสผ่านพร้อม salt
export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

// ตรวจรหัสผ่านกับค่าแฮชที่จัดเก็บ
export function verifyPassword(password, stored) {
  if (!stored) return false;
  const [algo, saltHex, hashHex] = stored.split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

// รหัสผ่านสุ่ม อ่านง่าย (ไม่มี 0/O, 1/l/I)
// สร้างรหัสผ่านสุ่มตามเงื่อนไขระบบ
export function generatePassword(len = 10) {
  if (!Number.isInteger(len) || len < 8 || len > 128) throw new RangeError('รหัสผ่านสุ่มต้องยาว 8–128 ตัวอักษร');
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const chars = letters + digits;
  const out = [letters[randomInt(letters.length)], digits[randomInt(digits.length)]];
  while (out.length < len) out.push(chars[randomInt(chars.length)]);
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
}

// ตรวจความยาวและรูปแบบรหัสผ่าน
export function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  if (pw.length > 128) return 'รหัสผ่านยาวเกินไป';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข';
  return '';
}

const sha256 = /* สร้างค่าแฮช SHA-256 */ (v) => createHash('sha256').update(v).digest('hex');

// สร้าง session สำหรับบัญชีที่เข้าสู่ระบบ
export function createSession(db, userId) {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    sha256(token),
    userId,
    now,
    now + SESSION_HOURS * 3600_000
  );
  return token;
}

// อ่านค่าคุกกี้ที่ต้องการจากคำขอ
function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
}

// ตรวจ session และอ่านบัญชีที่ยังใช้งานได้
export function sessionUser(db, req) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.display_name, u.must_change, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND u.active = 1`
    )
    .get(sha256(token));
  if (!row || row.expires_at < Date.now()) return null;
  return { ...row, tokenHash: sha256(token) };
}

// ลบ session เพื่อยุติการเข้าสู่ระบบ
export function destroySession(db, req) {
  const token = readCookie(req, COOKIE);
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

// สร้างค่าคุกกี้สำหรับ session
export function sessionCookie(token, secure, clear = false) {
  const parts = [`${COOKIE}=${clear ? '' : token}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${clear ? 0 : SESSION_HOURS * 3600}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

// จำกัดการเดารหัสผ่าน: ผิด 5 ครั้งใน 15 นาที ต่อ IP+ชื่อผู้ใช้ จะถูกพัก
const failures = new Map();
const WINDOW_MS = 15 * 60_000;
const MAX_FAILS = 5;

// ตรวจข้อจำกัดการพยายามเข้าสู่ระบบ
export function loginBlocked(key) {
  const f = failures.get(key);
  if (!f) return false;
  if (Date.now() - f.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return f.count >= MAX_FAILS;
}

// บันทึกการเข้าสู่ระบบไม่สำเร็จ
export function recordLoginFailure(key) {
  const f = failures.get(key);
  if (!f || Date.now() - f.first > WINDOW_MS) failures.set(key, { first: Date.now(), count: 1 });
  else f.count++;
}

// ล้างประวัติการเข้าสู่ระบบผิดหลังตรวจผ่าน
export function clearLoginFailures(key) {
  failures.delete(key);
}
