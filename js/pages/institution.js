// หน้า "สถาบันที่เข้าร่วมการแข่งขัน"
(/* เริ่มต้นหน้าinstitutionและจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ function () {
  const { esc } = UI;
  const app = document.getElementById('app');
  const all = SiteData.institutions;

  app.innerHTML = `
    ${UI.pageTitle('สถาบันที่เข้าร่วมการแข่งขัน', 'สถาบันที่เข้าร่วมการแข่งขัน ปทุมวันเกมส์ ครั้งที่ 50')}
    <div class="mb-4 flex justify-end">
      ${UI.search('q', 'ค้นหา เช่น ชื่อโรงเรียน, อักษรย่อ', 'ค้นหาชื่อโรงเรียนหรืออักษรย่อ', 'w-full sm:w-72')}
    </div>
    <div class="${UI.card} overflow-x-auto">
      <table class="w-full min-w-[760px] text-sm">
        <thead class="table-head text-white">
          <tr><th class="px-4 py-3">ลำดับ</th><th class="px-4 py-3">อักษรย่อภาษาไทย</th><th class="px-4 py-3">อักษรย่อ</th><th class="px-4 py-3 text-left">โรงเรียน</th></tr>
        </thead>
        <tbody id="rows" class="divide-y divide-gray-100 dark:divide-white/5"></tbody>
      </table>
    </div>`;

  const tbody = document.getElementById('rows');
  const render = /* แสดงหน้าจอจากข้อมูลและสถานะปัจจุบัน */ (q = '') => {
    const s = q.trim().toLowerCase();
    const rows = all.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหน้าinstitution */ (r) => !s || [r.thaiAbbr, r.abbr, r.nameEn, r.nameTh].some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในหน้าinstitution */ (v) => v.toLowerCase().includes(s)));
    tbody.innerHTML = rows.length
      ? rows
          .map(
            /* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าinstitution */ (r) => `<tr class="hover:bg-brand-50/50 dark:hover:bg-white/5">
              <td class="px-4 py-3 text-center">${r.no}</td>
              <td class="px-4 py-3 text-center font-medium">${esc(r.thaiAbbr)}</td>
              <td class="px-4 py-3 text-center"><span class="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-white/10 dark:text-brand-100">${esc(r.abbr)}</span></td>
              <td class="px-4 py-3"><div class="font-medium text-brand-800 dark:text-gray-100">${esc(r.nameTh)}</div><div class="text-xs text-brand-500 dark:text-gray-400">${esc(r.nameEn)}</div></td>
            </tr>`
          )
          .join('')
      : `<tr><td colspan="4">${UI.empty()}</td></tr>`;
  };
  document.getElementById('q').addEventListener('input', /* ตอบสนองเหตุการณ์ 'input' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ (e) => render(e.target.value));
  render();
})();
