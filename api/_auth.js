// ตรวจการเข้าสู่ระบบของหน้าแอดมินด้วย Supabase Auth
// หน้าแอดมินส่ง access token ของ Supabase มาใน Authorization: Bearer <token>
// ค่า url / publishableKey อ่านจาก admin/supabase.json (เป็นค่าสาธารณะ ไม่ต้องใช้ service role ที่ Vercel)
const { HttpError } = require('./_http');
const config = require('../admin/supabase.json');

// role ที่แก้เนื้อหาเว็บไซต์ (CMS) ได้ ฝ่ายเทคนิคและผู้ตรวจใช้ระบบผลการแข่งขัน
const CMS_ROLES = ['admin', 'editor'];

// อ่าน Bearer token จาก HTTP header
function bearer(req) {
  const m = /^Bearer\s+([\w.-]+)$/i.exec(req.headers.authorization || '');
  return m ? m[1] : '';
}

// เรียกบริการ Supabase ตามการตั้งค่าของส่วนนี้
async function supabase(path, token) {
  if (!config.url || !config.publishableKey) throw new HttpError(500, 'ยังไม่ได้ตั้งค่า Supabase ใน admin/supabase.json');
  let res;
  try {
    res = await fetch(`${config.url}${path}`, {
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new HttpError(503, 'เชื่อมต่อระบบบัญชีไม่ได้ กรุณาลองใหม่');
  }
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new HttpError(503, 'ตรวจสอบบัญชีไม่สำเร็จ กรุณาลองใหม่');
  return res.json();
}

// อ่าน profile ล่าสุดทุกครั้ง (RLS ให้อ่านแถวของตนเอง) ปิดบัญชี เปลี่ยน role หรือรีเซ็ตรหัสผ่านจึงมีผลทันที
// ตรวจ token และสถานะบัญชีล่าสุดกับ Supabase
async function sessionAccount(req) {
  const token = bearer(req);
  if (!token) return null;
  const user = await supabase('/auth/v1/user', token);
  if (!user?.id) return null;
  const rows = await supabase(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=username,display_name,role,active,must_change`, token);
  const profile = Array.isArray(rows) ? rows[0] : null;
  return profile?.active ? profile : null;
}

// ตรวจบัญชีและสิทธิ์แก้เนื้อหาเว็บไซต์
async function requireUser(req) {
  const account = await sessionAccount(req);
  if (!account) throw new HttpError(401, 'หมดเวลาการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่ที่ /admin/login.html');
  if (account.must_change) throw new HttpError(403, 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน');
  if (!CMS_ROLES.includes(account.role)) throw new HttpError(403, 'บัญชีนี้ไม่มีสิทธิ์แก้ไขเนื้อหาเว็บไซต์');
  return account.username;
}

// เรียกฟังก์ชันในฐานข้อมูลด้วย token ของผู้ใช้ที่ส่งคำขอ (ฐานข้อมูลตรวจสิทธิ์เอง) ข้อผิดพลาด PTxxx = HTTP status พร้อมข้อความไทย
async function rpc(req, fn, args) {
  let res;
  try {
    res = await fetch(`${config.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${bearer(req)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new HttpError(503, 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่');
  }
  const data = await res.json().catch(() => null);
  if (res.ok) return data;
  if (/^PT\d{3}$/.test(data?.code || '')) throw new HttpError(Number(data.code.slice(2)), data.message);
  throw new HttpError(503, 'บันทึกลงฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่');
}

module.exports = { CMS_ROLES, sessionAccount, requireUser, rpc };
