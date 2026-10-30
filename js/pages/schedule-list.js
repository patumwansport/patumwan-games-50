// หน้า "สรุปตารางการแข่งขัน" — ตารางรวมทุกนัดจาก Google Sheet พร้อมตัวกรอง
(/* เริ่มต้นหน้าschedule-listและจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ function () {
  const { esc } = UI;
  const app = document.getElementById('app');
  const PAGE = 50;

  app.innerHTML = `
    ${UI.pageTitle('สรุปตารางการแข่งขัน', 'ตารางการแข่งขันทุกชนิดกีฬา พร้อมวัน เวลา และสถานที่')}
    <div id="filters"></div>
    <div id="table">${UI.loading('กำลังโหลดตารางการแข่งขัน...')}</div>`;
  const filtersEl = document.getElementById('filters');
  const tableEl = document.getElementById('table');

  Api.getAllMatches()
    .then(/* ประมวลผลต่อเมื่อคำขอก่อนหน้าสำเร็จในหน้าschedule-list */ (raw) => {
      if (!raw.length) return (tableEl.innerHTML = UI.empty('ยังไม่มีตารางการแข่งขัน'));
      const matches = MatchUI.sortMatches(raw);
      const uniq = /* ตัดค่าซ้ำออกจากรายการ */ (key) => [...new Set(matches.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าschedule-list */ (m) => m[key]).filter(Boolean))];
      const dates = uniq('gameDate');
      const venues = uniq('stadium').sort(/* เปรียบเทียบรายการเพื่อจัดลำดับในหน้าschedule-list */ (a, b) => a.localeCompare(b, 'th'));
      let limit = PAGE;

      const select = /* เลือกข้อมูลและแจ้งส่วนที่เกี่ยวข้อง */ (id, label, options) => `
        <label class="text-sm"><span class="mb-1 block text-neutral-900 dark:text-gray-300">${label}</span>
          <select id="${id}" class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-gray-900">
            <option value="">ทั้งหมด</option>${options.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าschedule-list */ (o) => `<option value="${esc(o.value ?? o)}">${esc(o.label ?? o)}</option>`).join('')}
          </select></label>`;

      filtersEl.innerHTML = `
        <div class="${UI.card} mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          ${UI.search('f-q', 'ค้นหา เช่น รายการ, โรงเรียน', 'ค้นหารายการหรือโรงเรียน', 'self-end')}
          ${select('f-sport', 'ประเภทกีฬา', SiteData.sports.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าschedule-list */ (s) => ({ value: s.name, label: `${s.code}-${s.name}` })))}
          ${select('f-date', 'วันที่', dates)}
          ${select('f-venue', 'สถานที่', venues)}
        </div>`;

      const val = /* อ่านค่าตัวกรองจากองค์ประกอบที่ระบุ*/ (id) => document.getElementById(id).value;
      const filtered = /* เลือกข้อมูลตามตัวกรองปัจจุบัน */ () => {
        const q = val('f-q').trim().toLowerCase();
        return matches.filter(
          /* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหน้าschedule-list */ (m) =>
            (!val('f-sport') || m.sportName === val('f-sport')) &&
            (!val('f-date') || m.gameDate === val('f-date')) &&
            (!val('f-venue') || m.stadium === val('f-venue')) &&
            (!q || [m.displayName, m.schools].some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในหน้าschedule-list */ (v) => (v || '').toLowerCase().includes(q)))
        );
      };

      const render = /* แสดงหน้าจอจากข้อมูลและสถานะปัจจุบัน */ () => {
        const list = filtered();
        if (!list.length) return (tableEl.innerHTML = UI.empty('ไม่พบรายการแข่งขันตามเงื่อนไขที่เลือก'));
        tableEl.innerHTML = `
          <p class="mb-3 text-sm text-brand-500 dark:text-gray-400">พบ ${list.length.toLocaleString('th-TH')} รายการ</p>
          <div class="${UI.card} overflow-x-auto">
            <table class="w-full min-w-[960px] text-sm">
              <thead class="table-head text-left text-white">
                <tr><th class="px-4 py-3">วันที่ / เวลา</th><th class="px-4 py-3">ประเภทกีฬา</th><th class="px-4 py-3">การแข่งขัน</th><th class="px-4 py-3">รอบ</th><th class="px-4 py-3">โรงเรียน</th><th class="px-4 py-3">สถานที่</th><th class="px-4 py-3">สถานะ</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/5">${list
                .slice(0, limit)
                .map(
                  /* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าschedule-list */ (m) => `<tr class="align-top hover:bg-brand-50/50 dark:hover:bg-white/5">
                    <td class="whitespace-nowrap px-4 py-3">${esc(m.gameDate)}<div class="text-xs text-brand-500">${esc(m.gameTime)} น.</div></td>
                    <td class="px-4 py-3"><div class="flex items-center gap-2 whitespace-nowrap">${UI.sportBadge(m.sportCode || m.sportName.charAt(0), 'h-8 w-8 text-xs')}${esc(m.sportName)}</div></td>
                    <td class="px-4 py-3">${esc(m.displayName.replace(`${m.sportName} : `, ''))}${m.gameGroup ? `<div class="text-xs text-brand-500">กลุ่ม ${esc(m.gameGroup)}</div>` : ''}</td>
                    <td class="whitespace-nowrap px-4 py-3">${esc(m.gameRound || '-')}</td>
                    <td class="px-4 py-3 text-xs text-neutral-900 dark:text-gray-300">${esc(m.schools)}</td>
                    <td class="px-4 py-3 text-xs">${esc(m.stadium)}</td>
                    <td class="px-4 py-3"><span class="whitespace-nowrap rounded-full bg-pink-50 px-2.5 py-0.5 text-xs text-pink-700 dark:bg-pink-500/20 dark:text-pink-100">${esc(m.gameStatus)}</span></td>
                  </tr>`
                )
                .join('')}</tbody>
            </table>
          </div>
          ${list.length > limit ? `<div class="mt-6 text-center"><button type="button" id="more" class="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-medium text-white shadow hover:bg-brand-700">แสดงเพิ่มเติม (${(list.length - limit).toLocaleString('th-TH')})</button></div>` : ''}`;
        document.getElementById('more')?.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => {
          limit += PAGE;
          render();
        });
      };

      filtersEl.addEventListener('input', /* ตอบสนองเหตุการณ์ 'input' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => {
        limit = PAGE;
        render();
      });
      render();
    })
    .catch(/* จัดการข้อผิดพลาดจากงานแบบ asynchronousในหน้าschedule-list */ (err) => (tableEl.innerHTML = UI.error(err.message)));
})();
