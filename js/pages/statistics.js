// หน้า "สถิติเหรียญรางวัล" และ "สรุปเหรียญตามสถาบัน" (ทั้งหมด / ?type=p ประถม / ?type=m มัธยม)
// คำนวณจากผลการแข่งขันใน Google Sheet (ระดับตามคอลัมน์ "ระดับ" ของแต่ละนัด)
(function () {
  const app = document.getElementById('app');
  const isSchoolPage = document.body.dataset.page === 'medals-school';
  const type = ['p', 'm'].includes(UI.qs('type')) ? UI.qs('type') : '';
  const level = { p: ' ระดับประถมศึกษา', m: ' ระดับมัธยมศึกษา', '': '' }[type];
  const title = isSchoolPage ? 'สรุปเหรียญตามสถาบัน' : `สถิติเหรียญรางวัล${level}`;

  if (type) document.title = `สรุปเหรียญตามสถาบัน${level} - ${SiteConfig.name}`;

  app.innerHTML = `
    ${UI.pageTitle(title, 'ติดตามเหรียญรางวัลและสถิติของแต่ละโรงเรียนในงาน ปทุมวันเกมส์ ครั้งที่ 50')}
    ${isSchoolPage ? '' : `<div class="mb-8">${UI.pills([{ value: '', label: 'ทุกระดับ' }, { value: 'p', label: 'ระดับประถมศึกษา' }, { value: 'm', label: 'ระดับมัธยมศึกษา' }], type, 'data-type')}</div>`}
    <div id="summary"></div>
    <div id="table">${UI.loading()}</div>`;

  app.querySelectorAll('[data-type]').forEach((b) =>
    b.addEventListener('click', () => (location.search = b.dataset.type ? `?type=${b.dataset.type}` : ''))
  );

  const stat = (kind, label, value, tone) => `
    <div class="${UI.card} p-5 text-center">${UI.medalDot(kind, 'h-8 w-8 shadow-inner')}
      <div class="mt-2 text-3xl font-bold tabular-nums ${tone}">${value.toLocaleString('th-TH')}</div>
      <div class="text-sm text-brand-500 dark:text-gray-400">${label}</div></div>`;

  Api.getMedalTable(type)
    .then(({ rows }) => {
      const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
      // ยังไม่มีเหรียญเลย: แสดงข้อความแทนตารางที่เป็น 0
      if (sum('total') === 0) {
        document.getElementById('table').innerHTML = UI.empty('ยังไม่มีข้อมูล จะประกาศให้ทราบเร็ว ๆ นี้');
        return;
      }
      document.getElementById('summary').innerHTML = `
        <div class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          ${stat('gold', 'เหรียญทอง', sum('gold'), 'text-yellow-500')}
          ${stat('silver', 'เหรียญเงิน', sum('silver'), 'text-gray-400')}
          ${stat('bronze', 'เหรียญทองแดง', sum('bronze'), 'text-orange-500')}
          ${stat('total', 'รวมทั้งหมด', sum('total'), 'text-brand-600')}
        </div>`;
      document.getElementById('table').innerHTML = UI.medalTable(rows);
    })
    .catch((err) => (document.getElementById('table').innerHTML = UI.error(err.message)));
})();
