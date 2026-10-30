// อ่าน/เขียนไฟล์ใน repo ผ่าน GitHub API ด้วย token ฝั่งเซิร์ฟเวอร์ (ผู้ใช้หน้าแอดมินไม่เห็น token)
// Environment Variables ใน Vercel:
//   GITHUB_TOKEN   Fine-grained token เฉพาะ repo นี้ สิทธิ์ Contents: Read and write
//   GITHUB_REPO    เจ้าของ/ชื่อ repo (ว่าง = repo ที่ Vercel ดึงมา deploy)
//   GITHUB_BRANCH  branch ที่บันทึก (ว่าง = main)
const path = require('path');
const { HttpError } = require('./_http');
const SiteDataFormat = require('../admin/sitedata-format.js');

// หน้าแอดมินแก้ได้เฉพาะข้อมูลใน js/data และรูป/เอกสารใน assets ไฟล์โค้ดอื่นแตะไม่ได้
const DATA_FILE = /^js\/data\/[a-z0-9-]+\.js$/;
const MEDIA_DIR = /^assets\/(images|documents|uploads)(\/[\w.-]+)*$/;
const MEDIA_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
};

// ตัด / หน้าสุดออก และไม่รับ .. หรืออักขระแปลก ๆ ในชื่อไฟล์
// ตรวจและปรับพาธไฟล์ก่อนเข้าถึง repository
function cleanPath(p) {
  const value = String(p || '').replace(/^\/+/, '');
  if (!value || value.split('/').some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในAPI */ (s) => !s || s === '.' || s === '..') || /[\\\0-\x1f]/.test(value)) {
    throw new HttpError(400, `ที่อยู่ไฟล์ไม่ถูกต้อง: ${p}`);
  }
  return value;
}

// ตรวจว่าไฟล์เป็นสื่อชนิดที่รองรับ
function isMedia(p) {
  return MEDIA_DIR.test(path.posix.dirname(p)) && !!MEDIA_TYPES[path.posix.extname(p).toLowerCase()];
}

// ตรวจพาธไฟล์ข้อมูลที่อนุญาต
function dataPath(p) {
  const value = cleanPath(p);
  if (!DATA_FILE.test(value)) throw new HttpError(403, `หน้าแอดมินแก้ไฟล์นี้ไม่ได้: ${value}`);
  return value;
}

// ตรวจพาธไฟล์สื่อที่อนุญาต
function mediaPath(p) {
  const value = cleanPath(p);
  if (!isMedia(value)) throw new HttpError(403, `อัปโหลดได้เฉพาะรูป (jpg, png, webp, gif, avif) และ PDF ในโฟลเดอร์ assets: ${value}`);
  return value;
}

// ตรวจโฟลเดอร์เก็บสื่อที่อนุญาต
function mediaFolder(p) {
  const value = cleanPath(p);
  if (!MEDIA_DIR.test(value)) throw new HttpError(403, `เปิดโฟลเดอร์นี้ไม่ได้: ${value}`);
  return value;
}

const contentType = /* ระบุ MIME type ตามชนิดไฟล์ */ (p) => MEDIA_TYPES[path.posix.extname(p).toLowerCase()] || 'application/octet-stream';

// อ่านการตั้งค่า repository
function repo() {
  const name = process.env.GITHUB_REPO || (process.env.VERCEL_GIT_REPO_OWNER && `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`);
  if (!name || !process.env.GITHUB_TOKEN) throw new HttpError(500, 'ยังไม่ได้ตั้งค่า GITHUB_TOKEN / GITHUB_REPO');
  return { name, branch: process.env.GITHUB_BRANCH || 'main' };
}

// ส่งคำขอไปยัง GitHub API
async function gh(method, url, { body, raw } = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo().name}${url}`, {
    method,
    headers: {
      Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'patumwan-games-cms',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = await res.json().catch(/* จัดการข้อผิดพลาดจากงานแบบ asynchronousในAPI */ () => ({}));
    const err = new HttpError(502, `GitHub ตอบกลับผิดพลาด (${res.status}): ${detail.message || res.statusText}`);
    err.githubStatus = res.status;
    throw err;
  }
  return raw ? Buffer.from(await res.arrayBuffer()) : res.json();
}

const contentsUrl = /* สร้าง URL อ่านเนื้อหาไฟล์บน GitHub */ (p) => `/contents/${p.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(repo().branch)}`;

// เนื้อหาไฟล์ (Buffer) หรือ null ถ้าไม่มีไฟล์
// อ่านเนื้อหาไฟล์จาก repository
function readFile(p) {
  return gh('GET', contentsUrl(p), { raw: true });
}

// รายการไฟล์ในโฟลเดอร์ (ไม่มีโฟลเดอร์ = รายการว่าง)
// อ่านรายการไฟล์ภายในโฟลเดอร์
async function listFolder(p) {
  const items = await gh('GET', contentsUrl(p));
  return Array.isArray(items) ? items.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในAPI */ (i) => i.type === 'file') : [];
}

// บันทึกหลายไฟล์เป็น commit เดียว (Vercel จึง deploy ครั้งเดียว)
// changes: [{ path, content: Buffer }] หรือ [{ path, remove: true }]
// บันทึกการเปลี่ยนแปลงไฟล์เข้า GitHub
async function commit(changes, message) {
  const { branch } = repo();
  const blobs = await Promise.all(
    changes.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในAPI */ async (c) =>
      c.remove
        ? { path: c.path, mode: '100644', type: 'blob', sha: null }
        : { path: c.path, mode: '100644', type: 'blob', sha: (await gh('POST', '/git/blobs', { body: { content: c.content.toString('base64'), encoding: 'base64' } })).sha }
    )
  );
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
      if (err.githubStatus !== 422 || attempt >= 2) throw err;
    }
  }
}

// ไฟล์ js/data ที่ส่งมาต้องอ่านได้เป็นรูปแบบ sitedata และเขียนใหม่จากข้อมูลเท่านั้น
// (ไฟล์พวกนี้หน้าเว็บโหลดเป็นสคริปต์ จึงห้ามมีโค้ดอื่นปนมา)
// ตรวจและสร้างไฟล์ SiteData ใหม่จากข้อมูลที่อนุญาต
function cleanDataFile(raw) {
  try {
    return Buffer.from(SiteDataFormat.stringify(SiteDataFormat.parse(raw)), 'utf8');
  } catch (err) {
    throw new HttpError(400, err.message);
  }
}

module.exports = { dataPath, mediaPath, mediaFolder, isMedia, contentType, readFile, listFolder, commit, cleanDataFile };
