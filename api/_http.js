// ส่วนที่ใช้ร่วมกันของ API หน้าแอดมิน: อ่าน/ส่งคำขอ HTTP (ไฟล์ขึ้นต้นด้วย _ จึงไม่ถูกเปิดเป็น API)
const BODY_LIMIT = 4 * 1024 * 1024; // Vercel รับคำขอได้ไม่เกิน 4.5 MB

class HttpError extends Error {
  // ประมวลผลขั้นตอนย่อยของAPIตามข้อมูลหรือสถานะที่รับมา
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// โดเมนของเว็บที่เรียกมา (ใช้ตรวจ Origin กันเว็บอื่นส่งคำขอแทนผู้ใช้)
// อ่าน origin ของคำขอ
function origin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}

// อ่านพารามิเตอร์จาก URL
function query(req) {
  return new URL(req.url, 'http://localhost').searchParams;
}

// แยกค่าคุกกี้จาก HTTP header
function cookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในAPI */ (c) => c.trim().split('='))
      .filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในAPI */ ([k]) => k)
      .map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในAPI */ ([k, ...v]) => [k, decodeURIComponent(v.join('='))])
  );
}

// อ่านที่อยู่ผู้ส่งคำขอตามการตั้งค่าเซิร์ฟเวอร์
function ip(req) {
  return String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
}

// คำขอที่แก้ข้อมูลต้องมาจากหน้าโดเมนเดียวกัน และส่งเป็น JSON (ฟอร์มของเว็บอื่นส่ง JSON ไม่ได้)
// ตรวจว่าคำขอเขียนข้อมูลมาจาก origin ที่อนุญาต
function assertSameOrigin(req) {
  const from = req.headers.origin;
  if (from && from !== origin(req)) throw new HttpError(403, 'คำขอไม่ได้มาจากหน้าแอดมินของเว็บนี้');
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) throw new HttpError(415, 'ต้องส่งข้อมูลแบบ JSON');
}

// อ่านและแปลง request body เป็น JSON
async function readJson(req) {
  let body;
  try {
    body = req.body; // Vercel อ่าน JSON ให้แล้ว
  } catch {
    throw new HttpError(400, 'ข้อมูลที่ส่งมาไม่ใช่ JSON');
  }
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) return body;
  let raw = Buffer.isBuffer(body) ? body.toString('utf8') : typeof body === 'string' ? body : null;
  if (raw === null) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > BODY_LIMIT) throw new HttpError(413, 'ไฟล์ใหญ่เกินไป (รวมไม่เกินประมาณ 3 MB ต่อครั้ง)');
      chunks.push(chunk);
    }
    raw = Buffer.concat(chunks).toString('utf8');
  }
  try {
    return JSON.parse(raw || '{}');
  } catch {
    throw new HttpError(400, 'ข้อมูลที่ส่งมาไม่ใช่ JSON');
  }
}

// ส่งข้อมูลตอบกลับพร้อมสถานะ HTTP
function send(res, status, headers, body) {
  res.writeHead(status, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}

// ส่งข้อมูลตอบกลับแบบ JSON
function sendJson(res, status, data, headers = {}) {
  send(res, status, { 'Content-Type': 'application/json; charset=utf-8', ...headers }, JSON.stringify(data));
}

// แปลงข้อผิดพลาดเป็นคำตอบ { error } ที่ Decap CMS แสดงให้ผู้ใช้เห็น
// แปลงข้อผิดพลาดเป็น HTTP response
function sendError(res, err) {
  const status = err instanceof HttpError ? err.status : 500;
  if (status >= 500) console.error(err);
  sendJson(res, status, { error: status >= 500 && !(err instanceof HttpError) ? 'ระบบขัดข้อง กรุณาลองใหม่' : err.message });
}

module.exports = { HttpError, origin, query, cookies, ip, assertSameOrigin, readJson, send, sendJson, sendError };
