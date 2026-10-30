// /api/cms: ตัวกลางระหว่างหน้าแอดมิน (Decap CMS แบบ proxy) กับ repo บน GitHub ใช้ได้เฉพาะคนที่ล็อกอินแล้ว
//   POST { action, params }  คำสั่งจาก Decap (อ่านข้อมูล, บันทึก, อัปโหลด/ลบไฟล์)
//   GET  ?file=<path>        รูป/เอกสารใน repo สำหรับแสดงในคลังไฟล์สื่อของหน้าแอดมิน
const path = require('path');
const { HttpError, query, assertSameOrigin, readJson, send, sendJson, sendError } = require('./_http');
const { requireUser, rpc } = require('./_auth');
const gh = require('./_github');
const SiteDataFormat = require('../admin/sitedata-format.js');

// ไฟล์ที่ระบบผลการแข่งขัน (Supabase) ใช้เป็นรายการให้เลือก: บันทึกแล้วต้องอัปเดตตาราง sports / schools ด้วย
const REFERENCE_FILES = { 'js/data/sports.js': ['sports', 'p_sports'], 'js/data/institutions.js': ['institutions', 'p_schools'] };

// อัปเดตฐานข้อมูลก่อน commit: ถ้าข้อมูลไม่ผ่าน จะไม่มีอะไรถูกบันทึก ถ้า commit ล้มเหลวภายหลัง บันทึกซ้ำได้เพราะเป็น upsert
async function syncReference(req, changes) {
  const args = {};
  for (const { path: p, content } of changes) {
    const [key, arg] = REFERENCE_FILES[p] || [];
    if (key) args[arg] = SiteDataFormat.parse(content.toString('utf8'))[key];
  }
  if (Object.keys(args).length) await rpc(req, 'sync_reference', args);
}

const MAX_MEDIA_BYTES = 3 * 1024 * 1024;

// ถอดข้อมูลไฟล์อัปโหลดก่อนบันทึก
function decodeAsset(asset) {
  if (!asset || asset.encoding !== 'base64' || typeof asset.content !== 'string') throw new HttpError(400, 'ไฟล์ที่อัปโหลดไม่ถูกต้อง');
  const content = Buffer.from(asset.content, 'base64');
  if (content.length > MAX_MEDIA_BYTES) throw new HttpError(413, `ไฟล์ ${path.posix.basename(asset.path)} ใหญ่เกิน 3 MB กรุณาย่อขนาดก่อนอัปโหลด`);
  return { path: gh.mediaPath(asset.path), content };
}

const mediaEntry = /* แปลงข้อมูลไฟล์สื่อเป็นรูปแบบที่ CMS ใช้ */ (p, content) => ({ id: p, name: path.posix.basename(p), path: p, content: content.toString('base64'), encoding: 'base64' });

const message = /* แสดงข้อความแจ้งผลการทำงาน */ (text, user) => `${text || 'แก้ไขเนื้อหาเว็บไซต์'}\n\nแก้ไขโดย ${user} ผ่านหน้าแอดมิน`;

const actions = {
  info: /* ส่งข้อมูลชื่อและความสามารถของ backend ให้ CMS*/ () => ({ repo: 'patumwan-games-50', publish_modes: ['simple'], type: 'patumwan-cms' }),

  // อ่านรายการเนื้อหาตามไฟล์ที่กำหนด
  async entriesByFiles({ files = [] }) {
    const entries = await Promise.all(
      files.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในAPI */ async (file) => {
        const data = await gh.readFile(gh.dataPath(file.path));
        return data && { data: data.toString('utf8'), file: { path: file.path, label: file.label, id: null } };
      })
    );
    return entries.filter(Boolean);
  },

  // ทุก collection ในเว็บนี้เป็นแบบ files ไม่มีแบบ folder
  entriesByFolder: /* อ่านรายการเนื้อหาจากโฟลเดอร์ */ () => [],

  // อ่านเนื้อหาหนึ่งรายการสำหรับ CMS
  async getEntry({ path: p }) {
    const data = await gh.readFile(gh.dataPath(p));
    if (!data) throw new HttpError(404, `ไม่พบไฟล์ ${p}`);
    return { file: { path: p, id: null }, data: data.toString('utf8') };
  },

  // บันทึกเนื้อหาจากฟอร์ม CMS
  async persistEntry({ dataFiles = [], assets = [], options = {} }, user, req) {
    const data = dataFiles.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในAPI */ (f) => {
      if (f.newPath && f.newPath !== f.path) throw new HttpError(400, 'เปลี่ยนชื่อไฟล์ข้อมูลไม่ได้');
      return { path: gh.dataPath(f.path), content: gh.cleanDataFile(f.raw) };
    });
    const changes = [...data, ...assets.map(decodeAsset)];
    await syncReference(req, data);
    if (changes.length) await gh.commit(changes, message(options.commitMessage, user));
    return { message: 'entry persisted' };
  },

  // อ่านรายการสื่อของ CMS
  async getMedia({ mediaFolder }) {
    const files = await gh.listFolder(gh.mediaFolder(mediaFolder));
    // ส่งแค่รายชื่อ ไม่ส่งเนื้อไฟล์ทุกรูป (หน้าแอดมินโหลดรูปตัวอย่างจาก GET ?file= ทีละรูปเอง)
    return files.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในAPI */ (f) => gh.isMedia(f.path)).map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในAPI */ (f) => ({ id: f.sha, name: f.name, path: f.path, size: f.size }));
  },

  // อ่านไฟล์สื่อที่เลือก
  async getMediaFile({ path: p }) {
    const file = gh.mediaPath(p);
    const content = await gh.readFile(file);
    if (!content) throw new HttpError(404, `ไม่พบไฟล์ ${p}`);
    return mediaEntry(file, content);
  },

  // บันทึกไฟล์สื่อที่อัปโหลด
  async persistMedia({ asset, options = {} }, user) {
    const media = decodeAsset(asset);
    await gh.commit([media], message(options.commitMessage, user));
    return mediaEntry(media.path, media.content);
  },

  // ลบไฟล์ที่ผ่านการตรวจพาธและสิทธิ์แล้ว
  async deleteFiles({ paths = [], options = {} }, user) {
    const changes = paths.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในAPI */ (p) => ({ path: gh.mediaPath(p), remove: true }));
    if (changes.length) await gh.commit(changes, message(options.commitMessage, user));
    return { message: 'files deleted' };
  },

  getDeployPreview: /* อ่านข้อมูลสำหรับเปิดตัวอย่างการเผยแพร่ */ () => null,
};

// ให้บริการไฟล์พร้อมตรวจพาธและชนิดเนื้อหา
async function serveFile(req, res) {
  await requireUser(req);
  const file = gh.mediaPath(query(req).get('file'));
  const content = await gh.readFile(file);
  if (!content) throw new HttpError(404, 'ไม่พบไฟล์');
  send(res, 200, { 'Content-Type': gh.contentType(file), 'Cache-Control': 'private, max-age=300' }, content);
}

module.exports = /* ประมวลผลขั้นตอนย่อยของAPIตามข้อมูลหรือสถานะที่รับมา */ async (req, res) => {
  try {
    if (req.method === 'GET') return await serveFile(req, res);
    if (req.method !== 'POST') throw new HttpError(405, 'ไม่รองรับคำขอแบบนี้');
    assertSameOrigin(req);
    const user = await requireUser(req);
    const { action, params = {} } = await readJson(req);
    if (!Object.hasOwn(actions, action)) throw new HttpError(400, `หน้าแอดมินนี้ไม่รองรับคำสั่ง ${action}`);
    sendJson(res, 200, await actions[action](params, user, req));
  } catch (err) {
    sendError(res, err);
  }
};
