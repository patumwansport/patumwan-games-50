// ตัวช่วย HTTP: router, อ่าน body, ส่ง JSON, header ความปลอดภัย, ไฟล์ static
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';

export class HttpError extends Error {
  // ประมวลผลขั้นตอนย่อยของระบบกีฬาตามข้อมูลหรือสถานะที่รับมา
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const bad = /* สร้างข้อผิดพลาดสำหรับข้อมูลคำขอไม่ถูกต้อง */ (message, fields) => new HttpError(400, message, fields);
export const forbidden = /* สร้างข้อผิดพลาดเมื่อไม่มีสิทธิ์ */ (message = 'ไม่มีสิทธิ์ใช้งานส่วนนี้') => new HttpError(403, message);
export const notFound = /* สร้างข้อผิดพลาดเมื่อไม่พบข้อมูล */ (message = 'ไม่พบข้อมูล') => new HttpError(404, message);
export const conflict = /* สร้างข้อผิดพลาดเมื่อข้อมูลขัดแย้งกัน */ (message) => new HttpError(409, message);

// CSP เดียวกับเว็บหลัก (สคริปต์เฉพาะไฟล์ในเว็บนี้) และห้ามฝังใน iframe
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

// กำหนด header ความปลอดภัยของคำตอบ
export function securityHeaders(res, secure) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  if (secure) res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
}

// ส่งข้อมูลตอบกลับแบบ JSON
export function sendJson(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

// อ่าน request body พร้อมจำกัดขนาด
export function readBody(req, limit) {
  return new Promise(/* ประมวลผลขั้นตอนย่อยของระบบกีฬาตามข้อมูลหรือสถานะที่รับมา */ (resolve, reject) => {
    const len = Number(req.headers['content-length'] || 0);
    if (len > limit) return reject(new HttpError(413, 'ข้อมูลมีขนาดใหญ่เกินกำหนด'));
    const chunks = [];
    let size = 0;
    req.on('data', /* ทำงานต่อภายใน req.on ของระบบกีฬา */ (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, 'ข้อมูลมีขนาดใหญ่เกินกำหนด'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', /* ทำงานต่อภายใน req.on ของระบบกีฬา */ () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// อ่านและแปลง request body เป็น JSON
export async function readJson(req) {
  if (!(req.headers['content-type'] || '').includes('application/json')) throw bad('ต้องส่งข้อมูลแบบ JSON');
  const buf = await readBody(req, 1024 * 1024);
  try {
    const data = JSON.parse(buf.toString('utf8') || '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch {
    throw bad('รูปแบบข้อมูลไม่ถูกต้อง');
  }
}

// Router อย่างง่าย: path เช่น '/api/athletes/:id' (:id รับเฉพาะตัวเลข)
export class Router {
  // ประมวลผลขั้นตอนย่อยของระบบกีฬาตามข้อมูลหรือสถานะที่รับมา
  constructor() {
    this.routes = [];
  }
  // ลงทะเบียนเส้นทางและตัวจัดการคำขอ
  add(method, path, auth, handler) {
    const keys = [];
    const pattern = path.replace(/:(\w+)/g, /* ทำงานต่อภายใน path.replace ของระบบกีฬา */ (_, k) => {
      keys.push(k);
      return k === 'kind' ? '([a-z]+)' : '(\\d+)';
    });
    this.routes.push({ method, re: new RegExp(`^${pattern}$`), keys, auth, handler });
  }
  // ค้นหารายการที่ตรงกับรหัสหรือเส้นทางคำขอ
  match(method, pathname) {
    let pathMatched = false;
    for (const r of this.routes) {
      const m = r.re.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== method) continue;
      const params = {};
      r.keys.forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในระบบกีฬา */ (k, i) => (params[k] = k === 'kind' ? m[i + 1] : Number(m[i + 1])));
      return { route: r, params };
    }
    return pathMatched ? { methodNotAllowed: true } : null;
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

// ส่งไฟล์จากโฟลเดอร์ root เท่านั้น (กัน ../ ออกนอกโฟลเดอร์)
// ให้บริการไฟล์พร้อมตรวจพาธและชนิดเนื้อหา
export function serveFile(req, res, root, relPath, cache = 'no-cache') {
  const full = normalize(join(root, relPath));
  if (full !== root && !full.startsWith(root.endsWith(sep) ? root : root + sep)) return false;
  let st;
  try {
    st = statSync(full);
  } catch {
    return false;
  }
  if (!st.isFile()) return false;
  const type = MIME[extname(full).toLowerCase()];
  if (!type) return false;
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': cache });
  if (req.method === 'HEAD') res.end();
  else createReadStream(full).pipe(res);
  return true;
}
