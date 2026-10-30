// ตัวกลางระหว่างฟอร์มแก้ไขเนื้อหา (Decap CMS ใน admin/editor.html) กับ repo บน GitHub ใช้ได้เฉพาะ IT Admin และ CMS Editor
//   POST { action, params }  คำสั่งจาก Decap (อ่านข้อมูล, บันทึก, อัปโหลด/ลบไฟล์)
//   GET  ?file=<path>        รูป/เอกสารใน repo สำหรับแสดงในคลังไฟล์สื่อ
// อยู่ที่ Supabase เพราะเว็บขึ้น GitHub Pages ซึ่งรันโค้ดฝั่งเซิร์ฟเวอร์ไม่ได้ ทุก commit ทำให้ Pages build เว็บใหม่เอง
// Secrets (supabase secrets set):
//   GITHUB_TOKEN   Fine-grained token เฉพาะ repo นี้ สิทธิ์ Contents: Read and write
//   GITHUB_REPO    เจ้าของ/ชื่อ repo (ว่าง = patumwansport/patumwan-games-50)
//   GITHUB_BRANCH  branch ที่บันทึก (ว่าง = main)
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
// ไฟล์เดียวกับ admin/sitedata-format.js (symlink) ตั้งค่า globalThis.SiteDataFormat
import './sitedata-format.js';

const SiteDataFormat = (globalThis as unknown as {
  SiteDataFormat: { parse(text: string): Record<string, unknown>; stringify(data: Record<string, unknown>): string };
}).SiteDataFormat;

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const token = Deno.env.get('GITHUB_TOKEN') || '';
const repoName = Deno.env.get('GITHUB_REPO') || 'patumwansport/patumwan-games-50';
const branch = Deno.env.get('GITHUB_BRANCH') || 'main';

// role ที่แก้เนื้อหาเว็บไซต์ได้ ต้องตรงกับ canEditContent ใน admin-ui/src/admin/session.ts
const CMS_ROLES = ['admin', 'editor'];
const MAX_MEDIA_BYTES = 3 * 1024 * 1024;

class HttpError extends Error {
  // ประมวลผลขั้นตอนย่อยของระบบเนื้อหาตามข้อมูลหรือสถานะที่รับมา
  constructor(public status: number, message: string, public githubStatus = 0) { super(message); }
}

// หน้าแอดมินแก้ได้เฉพาะข้อมูลใน js/data และรูป/เอกสารใน assets ไฟล์โค้ดอื่นแตะไม่ได้
const DATA_FILE = /^js\/data\/[a-z0-9-]+\.js$/;
const MEDIA_DIR = /^assets\/(images|documents|uploads)(\/[\w.-]+)*$/;
const MEDIA_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
};

// ไฟล์ที่ระบบผลการแข่งขันใช้เป็นรายการให้เลือก: บันทึกแล้วต้องอัปเดตตาราง sports / schools ด้วย
const REFERENCE_FILES: Record<string, [string, string]> = {
  'js/data/sports.js': ['sports', 'p_sports'],
  'js/data/institutions.js': ['institutions', 'p_schools'],
};

const dirname = /* โฟลเดอร์ของพาธ */ (p: string) => p.slice(0, Math.max(p.lastIndexOf('/'), 0));
const basename = /* ชื่อไฟล์ของพาธ */ (p: string) => p.slice(p.lastIndexOf('/') + 1);
const extname = /* นามสกุลไฟล์ตัวพิมพ์เล็ก */ (p: string) => { const name = basename(p); const i = name.lastIndexOf('.'); return i > 0 ? name.slice(i).toLowerCase() : ''; };

// ตัด / หน้าสุดออก และไม่รับ .. หรืออักขระแปลก ๆ ในชื่อไฟล์
function cleanPath(p: unknown): string {
  const value = String(p || '').replace(/^\/+/, '');
  if (!value || value.split('/').some((s) => !s || s === '.' || s === '..') || /[\\\0-\x1f]/.test(value)) {
    throw new HttpError(400, `ที่อยู่ไฟล์ไม่ถูกต้อง: ${p}`);
  }
  return value;
}

const isMedia = /* ตรวจว่าไฟล์เป็นสื่อชนิดที่รองรับ */ (p: string) => MEDIA_DIR.test(dirname(p)) && !!MEDIA_TYPES[extname(p)];

// ตรวจพาธไฟล์ข้อมูลที่อนุญาต
function dataPath(p: unknown): string {
  const value = cleanPath(p);
  if (!DATA_FILE.test(value)) throw new HttpError(403, `หน้าแอดมินแก้ไฟล์นี้ไม่ได้: ${value}`);
  return value;
}

// ตรวจพาธไฟล์สื่อที่อนุญาต
function mediaPath(p: unknown): string {
  const value = cleanPath(p);
  if (!isMedia(value)) throw new HttpError(403, `อัปโหลดได้เฉพาะรูป (jpg, png, webp, gif, avif) และ PDF ในโฟลเดอร์ assets: ${value}`);
  return value;
}

// ตรวจโฟลเดอร์เก็บสื่อที่อนุญาต
function mediaFolder(p: unknown): string {
  const value = cleanPath(p);
  if (!MEDIA_DIR.test(value)) throw new HttpError(403, `เปิดโฟลเดอร์นี้ไม่ได้: ${value}`);
  return value;
}

const base64 = /* แปลงไบต์เป็น base64 */ (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromBase64 = /* แปลง base64 เป็นไบต์ */ (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// ส่งคำขอไปยัง GitHub API
async function gh(method: string, path: string, { body, raw }: { body?: unknown; raw?: boolean } = {}) {
  if (!token) throw new HttpError(503, 'ยังไม่ได้ตั้งค่า GITHUB_TOKEN ของฟังก์ชัน cms ใน Supabase (ดู supabase/README.md)');
  const res = await fetch(`https://api.github.com/repos/${repoName}${path}`, {
    method,
    headers: {
      Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'patumwan-games-cms',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new HttpError(502, `GitHub ตอบกลับผิดพลาด (${res.status}): ${detail.message || res.statusText}`, res.status);
  }
  return raw ? new Uint8Array(await res.arrayBuffer()) : res.json();
}

const contentsUrl = /* สร้าง URL อ่านเนื้อหาไฟล์บน GitHub */ (p: string) =>
  `/contents/${p.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`;

// เนื้อหาไฟล์หรือ null ถ้าไม่มีไฟล์
// ยังไม่ได้ตั้ง GITHUB_TOKEN: repo เป็นสาธารณะ จึงอ่านจาก raw.githubusercontent.com ได้ (ฟอร์มแสดงข้อมูลได้ แต่บันทึกไม่ได้)
async function readFile(p: string): Promise<Uint8Array | null> {
  if (token) return gh('GET', contentsUrl(p), { raw: true });
  const res = await fetch(`https://raw.githubusercontent.com/${repoName}/${encodeURIComponent(branch)}/${p.split('/').map(encodeURIComponent).join('/')}`, {
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new HttpError(502, `อ่านไฟล์จาก GitHub ไม่สำเร็จ (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

// รายการไฟล์ในโฟลเดอร์ (ไม่มีโฟลเดอร์ = รายการว่าง)
async function listFolder(p: string) {
  const items = await gh('GET', contentsUrl(p));
  return Array.isArray(items) ? items.filter((i) => i.type === 'file') : [];
}

type Change = { path: string; content?: Uint8Array; remove?: boolean };

// บันทึกหลายไฟล์เป็น commit เดียว (GitHub Pages จึง build ครั้งเดียว)
async function commit(changes: Change[], message: string) {
  const blobs = await Promise.all(changes.map(async (c) =>
    c.remove
      ? { path: c.path, mode: '100644', type: 'blob', sha: null }
      : { path: c.path, mode: '100644', type: 'blob', sha: (await gh('POST', '/git/blobs', { body: { content: base64(c.content!), encoding: 'base64' } })).sha }
  ));
  // ถ้ามีคนบันทึกพร้อมกันจน branch ขยับไปก่อน ให้ต่อ commit บนของใหม่แล้วลองอีกครั้ง
  for (let attempt = 0; ; attempt++) {
    const head = await gh('GET', `/branches/${encodeURIComponent(branch)}`);
    if (!head) throw new HttpError(500, `ไม่พบ branch ${branch} ใน repo`);
    const tree = await gh('POST', '/git/trees', { body: { base_tree: head.commit.commit.tree.sha, tree: blobs } });
    const next = await gh('POST', '/git/commits', { body: { message, tree: tree.sha, parents: [head.commit.sha] } });
    try {
      await gh('PATCH', `/git/refs/heads/${encodeURIComponent(branch)}`, { body: { sha: next.sha } });
      return next.sha;
    } catch (err) {
      if (!(err instanceof HttpError) || err.githubStatus !== 422 || attempt >= 2) throw err;
    }
  }
}

// ไฟล์ js/data ที่ส่งมาต้องอ่านได้เป็นรูปแบบ sitedata และเขียนใหม่จากข้อมูลเท่านั้น
// (ไฟล์พวกนี้หน้าเว็บโหลดเป็นสคริปต์ จึงห้ามมีโค้ดอื่นปนมา)
function cleanDataFile(raw: unknown): Uint8Array {
  try {
    return new TextEncoder().encode(SiteDataFormat.stringify(SiteDataFormat.parse(String(raw))));
  } catch (err) {
    throw new HttpError(400, (err as Error).message);
  }
}

// ถอดข้อมูลไฟล์อัปโหลดก่อนบันทึก
function decodeAsset(asset: { path?: string; content?: unknown; encoding?: string }): Change {
  if (!asset || asset.encoding !== 'base64' || typeof asset.content !== 'string') throw new HttpError(400, 'ไฟล์ที่อัปโหลดไม่ถูกต้อง');
  const content = fromBase64(asset.content);
  if (content.length > MAX_MEDIA_BYTES) throw new HttpError(413, `ไฟล์ ${basename(String(asset.path))} ใหญ่เกิน 3 MB กรุณาย่อขนาดก่อนอัปโหลด`);
  return { path: mediaPath(asset.path), content };
}

const mediaEntry = /* แปลงข้อมูลไฟล์สื่อเป็นรูปแบบที่ CMS ใช้ */ (p: string, content: Uint8Array) =>
  ({ id: p, name: basename(p), path: p, content: base64(content), encoding: 'base64' });

const message = /* ข้อความ commit */ (text: unknown, user: string) => `${text || 'แก้ไขเนื้อหาเว็บไซต์'}\n\nแก้ไขโดย ${user} ผ่านหน้าแอดมิน`;

type Caller = { username: string; db: ReturnType<typeof createClient> };

// เรียกฟังก์ชันฐานข้อมูลด้วย token ของผู้ใช้ (ฐานข้อมูลตรวจสิทธิ์เอง) SQLSTATE PTxxx คือ HTTP status
async function rpc(caller: Caller['db'], fn: string, args: Record<string, unknown> = {}) {
  const { data, error } = await caller.rpc(fn, args);
  if (error) {
    const m = /^PT(\d{3})$/.exec(error.code || '');
    if (m) throw new HttpError(Number(m[1]), error.message);
    // token ใช้ไม่ได้หรือไม่ใช่ token ของผู้ใช้ที่ล็อกอิน (role anon ไม่มีสิทธิ์เรียกฟังก์ชันของเจ้าหน้าที่)
    if (error.code === 'PGRST301' || error.code === 'PGRST303' || error.code === '42501') throw new HttpError(401, 'หมดเวลาการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่');
    console.error(fn, error);
    throw new HttpError(503, 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่');
  }
  return data;
}

// ตรวจบัญชีล่าสุดทุกคำขอ ปิดบัญชี เปลี่ยน role หรือรีเซ็ตรหัสผ่านจึงมีผลทันที
async function requireUser(req: Request): Promise<Caller> {
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) throw new HttpError(401, 'กรุณาเข้าสู่ระบบ');
  const db = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const me = await rpc(db, 'me');
  if (me.user.mustChange) throw new HttpError(403, 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน');
  if (!CMS_ROLES.includes(me.user.role)) throw new HttpError(403, 'บัญชีนี้ไม่มีสิทธิ์แก้ไขเนื้อหาเว็บไซต์');
  return { username: me.user.username, db };
}

// อัปเดตฐานข้อมูลก่อน commit: ถ้าข้อมูลไม่ผ่าน จะไม่มีอะไรถูกบันทึก ถ้า commit ล้มเหลวภายหลัง บันทึกซ้ำได้เพราะเป็น upsert
async function syncReference(caller: Caller, changes: Change[]) {
  const args: Record<string, unknown> = {};
  for (const { path, content } of changes) {
    const [key, arg] = REFERENCE_FILES[path] || [];
    if (key) args[arg] = SiteDataFormat.parse(new TextDecoder().decode(content))[key];
  }
  if (Object.keys(args).length) await rpc(caller.db, 'sync_reference', args);
}

type Params = Record<string, any>;

const actions: Record<string, (params: Params, caller: Caller) => unknown> = {
  info: () => ({ repo: repoName.split('/')[1], publish_modes: ['simple'], type: 'patumwan-cms' }),

  // อ่านรายการเนื้อหาตามไฟล์ที่กำหนด
  async entriesByFiles({ files = [] }) {
    const entries = await Promise.all(files.map(async (file: { path: string; label?: string }) => {
      const data = await readFile(dataPath(file.path));
      return data && { data: new TextDecoder().decode(data), file: { path: file.path, label: file.label, id: null } };
    }));
    return entries.filter(Boolean);
  },

  // ทุก collection ในเว็บนี้เป็นแบบ files ไม่มีแบบ folder
  entriesByFolder: () => [],

  // อ่านเนื้อหาหนึ่งรายการสำหรับ CMS
  async getEntry({ path }) {
    const data = await readFile(dataPath(path));
    if (!data) throw new HttpError(404, `ไม่พบไฟล์ ${path}`);
    return { file: { path, id: null }, data: new TextDecoder().decode(data) };
  },

  // บันทึกเนื้อหาจากฟอร์ม CMS
  async persistEntry({ dataFiles = [], assets = [], options = {} }, caller) {
    const data: Change[] = dataFiles.map((f: { path: string; newPath?: string; raw: string }) => {
      if (f.newPath && f.newPath !== f.path) throw new HttpError(400, 'เปลี่ยนชื่อไฟล์ข้อมูลไม่ได้');
      return { path: dataPath(f.path), content: cleanDataFile(f.raw) };
    });
    const changes = [...data, ...assets.map(decodeAsset)];
    await syncReference(caller, data);
    if (changes.length) await commit(changes, message(options.commitMessage, caller.username));
    return { message: 'entry persisted' };
  },

  // อ่านรายการสื่อของ CMS (ส่งแค่รายชื่อ รูปตัวอย่างโหลดทีละรูปจาก GET ?file=)
  async getMedia({ mediaFolder: folder }) {
    const files = await listFolder(mediaFolder(folder));
    return files.filter((f) => isMedia(f.path)).map((f) => ({ id: f.sha, name: f.name, path: f.path, size: f.size }));
  },

  // อ่านไฟล์สื่อที่เลือก
  async getMediaFile({ path }) {
    const file = mediaPath(path);
    const content = await readFile(file);
    if (!content) throw new HttpError(404, `ไม่พบไฟล์ ${path}`);
    return mediaEntry(file, content);
  },

  // บันทึกไฟล์สื่อที่อัปโหลด
  async persistMedia({ asset, options = {} }, caller) {
    const media = decodeAsset(asset);
    await commit([media], message(options.commitMessage, caller.username));
    return mediaEntry(media.path, media.content!);
  },

  // ลบไฟล์สื่อ
  async deleteFiles({ paths = [], options = {} }, caller) {
    const changes = paths.map((p: string) => ({ path: mediaPath(p), remove: true }));
    if (changes.length) await commit(changes, message(options.commitMessage, caller.username));
    return { message: 'files deleted' };
  },

  getDeployPreview: () => null,
};

// ใช้ Bearer token ไม่ใช้ cookie จึงเปิดให้ทุก origin ได้ (Vercel, GitHub Pages และเครื่องที่ทดสอบ)
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = /* สร้าง HTTP response แบบ JSON */ (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

Deno.serve(/* รับและประมวลผลคำขอของระบบเนื้อหา */ async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  try {
    if (req.method === 'GET') {
      await requireUser(req);
      const file = mediaPath(new URL(req.url).searchParams.get('file'));
      const content = await readFile(file);
      if (!content) throw new HttpError(404, 'ไม่พบไฟล์');
      return new Response(content, { headers: { ...cors, 'Content-Type': MEDIA_TYPES[extname(file)], 'Cache-Control': 'private, max-age=300' } });
    }
    if (req.method !== 'POST') throw new HttpError(405, 'ไม่รองรับคำขอแบบนี้');
    const caller = await requireUser(req);
    let body: { action?: string; params?: Params };
    try { body = await req.json(); } catch { throw new HttpError(400, 'ข้อมูลไม่ถูกต้อง'); }
    const { action = '', params = {} } = body || {};
    if (!Object.hasOwn(actions, action)) throw new HttpError(400, `หน้าแอดมินนี้ไม่รองรับคำสั่ง ${action}`);
    return json(200, await actions[action](params, caller));
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message });
    console.error(err);
    return json(500, { error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่' });
  }
});
