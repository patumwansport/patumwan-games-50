import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { openDb, tx } from '../src/db.js';
import { generatePassword, hashPassword } from '../src/auth.js';

const dataDir = resolve(process.env.RESULTS_DATA_DIR || join(dirname(fileURLToPath(import.meta.url)), '../data'));
const file = join(dataDir, 'results.db');
if (!existsSync(file)) throw new Error('ยังไม่มีฐานข้อมูล กรุณารันระบบก่อน');
const db = openDb(file);
try {
  const username = process.argv[2] || 'admin';
  const user = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (!user) throw new Error('ไม่พบบัญชี');
  const password = generatePassword(16);
  tx(db, /* ทำคำสั่งที่ต้องสำเร็จหรือย้อนกลับพร้อมกันในระบบกีฬา */ () => {
    db.prepare('UPDATE users SET password_hash=?,must_change=1 WHERE id=?').run(hashPassword(password), user.id);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
    db.prepare("INSERT INTO audit_log(user_id,action,detail) VALUES(?,'password_reset_cli','{}')").run(user.id);
  });
  console.log(`ชื่อผู้ใช้: ${username}\nรหัสผ่านใหม่: ${password}\nต้องเปลี่ยนรหัสผ่านเมื่อเข้าระบบ`);
} finally { db.close(); }
