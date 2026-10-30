// หน้า "ผลการแข่งขันตามชนิดกีฬา" — เลือกกีฬา แล้วแสดงผลของกีฬานั้นจาก Google Sheet
(/* เริ่มต้นหน้าmatch-result-sportและจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ function () {
  const { esc } = UI;
  const app = document.getElementById('app');
  const sports = SiteData.sports;
  const sport = sports.find(/* ค้นหารายการแรกที่ตรงตามเงื่อนไขในหน้าmatch-result-sport */ (s) => String(s.apiId) === UI.qs('id'));

  // ยังไม่ได้เลือกกีฬา: แสดงตารางกีฬาให้เลือก
  if (!sport) {
    app.innerHTML = `
      ${UI.pageTitle('ผลการแข่งขันตามชนิดกีฬา', 'เลือกชนิดกีฬาเพื่อดูผลการแข่งขัน')}
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        ${sports.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmatch-result-sport */ (s) => UI.sportCard({ href: `?id=${s.apiId}`, icon: s.icon, title: `${s.code}-${s.name}` })).join('')}
      </div>`;
    return;
  }

  document.title = `ผลการแข่งขัน ${sport.name} - ${SiteConfig.name}`;
  app.innerHTML = `
    <div class="mb-8 flex flex-col items-center gap-4 text-center">
      ${sport.icon ? `<img src="${UI.safeUrl(sport.icon)}" alt="${esc(sport.name)}" class="h-28 object-contain">` : UI.sportBadge(sport.code, 'h-24 w-24 text-3xl')}
      ${UI.pageTitle(`ผลการแข่งขัน ${esc(sport.code)}-${esc(sport.name)}`)}
    </div>
    <div class="mb-6 overflow-x-auto pb-2 no-scrollbar">
      <div class="flex w-max gap-2">${sports
        .map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmatch-result-sport */ (s) => `<a href="?id=${s.apiId}" class="flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm shadow-sm ring-1 ${s === sport ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-brand-700 ring-black/5 hover:bg-brand-50 dark:bg-gray-900 dark:text-gray-200 dark:ring-white/10'}">${esc(s.name)}</a>`)
        .join('')}</div>
    </div>
    <div id="filters"></div>
    <div id="results">${UI.loading()}</div>`;

  const resultsEl = document.getElementById('results');
  const filtersEl = document.getElementById('filters');

  Api.getMatchesBySport(sport.apiId)
    .then(/* ประมวลผลต่อเมื่อคำขอก่อนหน้าสำเร็จในหน้าmatch-result-sport */ (raw) => {
      if (!raw.length) return (resultsEl.innerHTML = UI.empty(`ยังไม่มีผลการแข่งขันกีฬา${sport.name}`));
      const matches = MatchUI.sortMatches(raw);
      const dates = [...new Set(matches.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmatch-result-sport */ (m) => m.gameDate))];
      const rounds = [...new Set(matches.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmatch-result-sport */ (m) => m.gameRound).filter(Boolean))];
      const select = /* เลือกข้อมูลและแจ้งส่วนที่เกี่ยวข้อง */ (id, label, options) => `
        <label class="text-sm"><span class="mb-1 block text-neutral-900 dark:text-gray-300">${label}</span>
          <select id="${id}" class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-gray-900">
            <option value="">ทั้งหมด</option>${options.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmatch-result-sport */ (o) => `<option>${esc(o)}</option>`).join('')}
          </select></label>`;

      filtersEl.innerHTML = `
        <div class="${UI.card} mb-6 grid gap-4 p-4 sm:grid-cols-3">
          ${UI.search('f-q', 'ค้นหา เช่น รายการ, โรงเรียน, ชื่อ', 'ค้นหารายการ โรงเรียน หรือชื่อ', 'self-end')}
          ${select('f-date', 'วันที่', dates)}
          ${select('f-round', 'รอบ', rounds)}
        </div>`;

      const apply = /* กรองผลตามตัวเลือกและแสดงรายการใหม่*/ () => {
        const q = document.getElementById('f-q').value.trim().toLowerCase();
        const date = document.getElementById('f-date').value;
        const round = document.getElementById('f-round').value;
        const list = matches.filter(
          /* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหน้าmatch-result-sport */ (m) =>
            (!date || m.gameDate === date) &&
            (!round || m.gameRound === round) &&
            (!q || [m.displayName, m.schools, ...(m.results || []).map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmatch-result-sport */ (r) => r.playerName)].some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในหน้าmatch-result-sport */ (v) => (v || '').toLowerCase().includes(q)))
        );
        MatchUI.list(resultsEl, list);
      };
      filtersEl.addEventListener('input', apply);
      apply();
    })
    .catch(/* จัดการข้อผิดพลาดจากงานแบบ asynchronousในหน้าmatch-result-sport */ (err) => (resultsEl.innerHTML = UI.error(err.message)));
})();
