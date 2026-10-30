// /api/keepalive: Vercel Cron เรียกวันละครั้ง (vercel.json) เพื่อให้โปรเจกต์ Supabase แบบ Free มีการใช้งานต่อเนื่อง
// Supabase พักโปรเจกต์ Free ที่ไม่มีการใช้งานราว 1 สัปดาห์ ช่วยลดโอกาสถูกพักก่อนวันงาน แต่ไม่ใช่การรับประกัน (แพ็กเกจ Pro ไม่ถูกพัก)
// อ่านเฉพาะผลที่เผยแพร่แล้ว (ข้อมูลสาธารณะ) ด้วย publishable key ไม่แก้ข้อมูลใด ๆ
const config = require('../admin/supabase.json');
const { sendJson } = require('./_http');

module.exports = async (req, res) => {
  // ถ้าตั้ง CRON_SECRET ใน Vercel จะรับเฉพาะคำขอจาก Vercel Cron
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return sendJson(res, 401, { error: 'unauthorized' });
  }
  try {
    const r = await fetch(`${config.url}/rest/v1/rpc/public_results`, {
      headers: { apikey: config.publishableKey },
      signal: AbortSignal.timeout(15000),
    });
    sendJson(res, r.ok ? 200 : 502, { ok: r.ok, status: r.status });
  } catch {
    sendJson(res, 502, { ok: false });
  }
};
