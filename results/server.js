// ระบบผลการแข่งขันแยกจาก CMS และระบบลงทะเบียน รันด้วย Node.js 22.13+
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, siteData } from './src/db.js';
import { generatePassword, hashPassword, passwordProblem, sessionUser } from './src/auth.js';
import { registerRoutes } from './src/api.js';
import { HttpError, Router, securityHeaders, sendJson, serveFile } from './src/http.js';

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, '..');
const passwordPaths = new Set(['/api/me','/api/password','/api/logout']);

// ประกอบเซิร์ฟเวอร์ ฐานข้อมูล และเส้นทาง API ของระบบผล
export function createApp({ dataDir = resolve(process.env.RESULTS_DATA_DIR || join(here, 'data')),
  adminPassword = process.env.RESULTS_ADMIN_PASSWORD, trustProxy = process.env.TRUST_PROXY === '1',
  publicOrigin = process.env.PUBLIC_SITE_ORIGIN || '', quiet = false } = {}) {
  if (publicOrigin && new URL(publicOrigin).origin !== publicOrigin) throw new Error('PUBLIC_SITE_ORIGIN ต้องเป็น origin เช่น https://example.com (ไม่มี / ท้าย)');
  const db = openDb(join(dataDir, 'results.db'));
  if (!db.prepare("SELECT 1 FROM users WHERE role='admin'").get()) {
    const password = adminPassword || generatePassword(16);
    const problem = passwordProblem(password);
    if (problem) { db.close(); throw new Error(problem); }
    db.prepare("INSERT INTO users(username,display_name,password_hash,role) VALUES('admin','แอดมินกลาง',?,'admin')").run(hashPassword(password));
    if (!quiet) {
      console.log('สร้างบัญชี admin สำหรับระบบผลการแข่งขันแล้ว ต้องเปลี่ยนรหัสผ่านก่อนใช้งาน');
      if (!adminPassword) console.log(`รหัสผ่านครั้งแรก: ${password}`);
    }
  }
  const router = new Router();
  registerRoutes(router, { db, sports: siteData(siteRoot, 'sports.js', 'sports'), schools: siteData(siteRoot, 'institutions.js', 'institutions') });
  const server = createServer(/* ทำงานต่อภายใน createServer ของระบบกีฬา */ async (req, res) => {
    const secure = !!req.socket.encrypted || (trustProxy && req.headers['x-forwarded-proto'] === 'https');
    securityHeaders(res, secure);
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        // CORS เปิดเฉพาะผลที่เผยแพร่แล้ว ห้ามใช้กับ API เจ้าหน้าที่
        if (url.pathname === '/api/public/results' && req.method === 'GET' && publicOrigin && req.headers.origin === publicOrigin) {
          res.setHeader('Access-Control-Allow-Origin', publicOrigin);
          res.setHeader('Vary', 'Origin');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        }
        if (!['GET','HEAD'].includes(req.method)) {
          const expected = `${secure ? 'https' : 'http'}://${req.headers.host}`;
          if (req.headers['x-requested-with'] !== 'fetch' || (req.headers.origin && req.headers.origin !== expected)) throw new HttpError(403, 'คำขอไม่ถูกต้อง');
        }
        const found = router.match(req.method, url.pathname);
        if (!found) throw new HttpError(404, 'ไม่พบ API');
        if (found.methodNotAllowed) throw new HttpError(405, 'ไม่รองรับคำขอนี้');
        const ctx = { req, res, url, params: found.params, secure, user: null,
          ip: trustProxy ? String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',')[0].trim() : req.socket.remoteAddress,
          setCookie: /* จัดการ setCookie ภายในระบบกีฬา */ (value) => res.setHeader('Set-Cookie', value) };
        if (found.route.auth !== 'public') {
          ctx.user = sessionUser(db, req);
          if (!ctx.user) throw new HttpError(401, 'กรุณาเข้าสู่ระบบ');
          if (ctx.user.must_change && !passwordPaths.has(url.pathname)) throw new HttpError(403, 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน');
        }
        const result = await found.route.handler(ctx);
        sendJson(res, 200, result);
        return;
      }
      if (!['GET','HEAD'].includes(req.method)) throw new HttpError(405, 'ไม่รองรับคำขอนี้');
      const path = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (path.startsWith('site/')) {
        const rel = path.slice(5);
        if (/^(?:css\/style\.css|assets\/fonts\/[\w.-]+|assets\/images\/logo(?:-full)?\.png|assets\/favicon-32\.png)$/.test(rel) && serveFile(req, res, siteRoot, rel, 'public, max-age=3600')) return;
      } else if (serveFile(req, res, join(here, 'public'), path || 'index.html')) return;
      throw new HttpError(404, 'ไม่พบหน้า');
    } catch (err) {
      if (!err.status) console.error(err);
      if (!res.headersSent) sendJson(res, err.status || 500, { error: err.status ? err.message : 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่' });
      else res.destroy();
    }
  });
  return { server, db };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server, db } = createApp();
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 5800);
  server.on('error', /* ทำงานต่อภายใน server.on ของระบบกีฬา */ (err) => { console.error(err.message); db.close(); process.exitCode = 1; });
  server.listen(port, host, /* ทำงานต่อภายใน server.listen ของระบบกีฬา */ () => console.log(`ระบบผลการแข่งขัน: http://${host}:${port}`));
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, /* ทำงานต่อภายใน process.once ของระบบกีฬา */ () => server.close(/* ทำงานต่อภายใน server.close ของระบบกีฬา */ () => { db.close(); process.exit(); }));
}
