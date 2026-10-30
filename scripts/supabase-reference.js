// สร้าง SQL นำเข้าชนิดกีฬาและรายชื่อสถาบันจาก js/data ไปที่ตาราง public.sports / public.schools ของ Supabase
// ใช้: node scripts/supabase-reference.js > ไฟล์.sql  แล้วรันใน SQL Editor (หรือบันทึกเป็น migration ใหม่)
// ใช้ upsert เท่านั้น ไม่ลบแถวเดิม เพราะรายการแข่งขันอ้างอิงชนิดกีฬาอยู่
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const root = join(__dirname, '..');
// อ่านข้อมูลอ้างอิงจากไฟล์ข้อมูลเว็บไซต์
function siteData(file, key) {
  const window = {};
  vm.runInNewContext(readFileSync(join(root, 'js/data', file), 'utf8'), { window });
  return window.SiteData[key];
}

const q = /* จัดการ q ภายในบริการบัญชี */ (v) => `'${String(v ?? '').replace(/'/g, "''")}'`;
const sports = siteData('sports.js', 'sports');
const schools = siteData('institutions.js', 'institutions');

const out = [
  '-- สร้างจาก scripts/supabase-reference.js (js/data/sports.js, js/data/institutions.js)',
  'insert into public.sports (id, code, name) values',
  sports.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในบริการบัญชี */ (s) => `  (${Number(s.id)}, ${q(s.code)}, ${q(s.name)})`).join(',\n'),
  'on conflict (id) do update set code = excluded.code, name = excluded.name;',
  '',
  'insert into public.schools (no, name_th, name_en, abbr, thai_abbr, levels) values',
  schools.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในบริการบัญชี */ (s) => `  (${Number(s.no)}, ${q(s.nameTh)}, ${q(s.nameEn)}, ${q(s.abbr)}, ${q(s.thaiAbbr)}, array[${(s.levels || []).map(q).join(', ')}]::text[])`).join(',\n'),
  'on conflict (no) do update set name_th = excluded.name_th, name_en = excluded.name_en, abbr = excluded.abbr,',
  '  thai_abbr = excluded.thai_abbr, levels = excluded.levels;',
  '',
];
process.stdout.write(out.join('\n'));
