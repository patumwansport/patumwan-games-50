// หน้า "ผลการแข่งขันประจำวัน" — รวมผลทุกกีฬาจาก Google Sheet แล้วแยกตามวัน
(/* เริ่มต้นหน้าmatch-resultและจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ function () {
  const { esc } = UI;
  const app = document.getElementById('app');

  app.innerHTML = `
    ${UI.pageTitle('ผลการแข่งขันประจำวัน', 'เลือกวันที่และชนิดกีฬาเพื่อดูผลการแข่งขัน')}
    <div id="controls"></div>
    <div id="results">${UI.loading('กำลังโหลดผลการแข่งขันทุกชนิดกีฬา...')}</div>`;
  const controls = document.getElementById('controls');
  const resultsEl = document.getElementById('results');

  Api.getAllMatches()
    .then(/* ประมวลผลต่อเมื่อคำขอก่อนหน้าสำเร็จในหน้าmatch-result */ (raw) => {
      if (!raw.length) return (resultsEl.innerHTML = UI.empty('ยังไม่มีผลการแข่งขัน'));
      const matches = MatchUI.sortMatches(raw);
      const dates = [...new Set(matches.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmatch-result */ (m) => m.gameDate))];
      let date = UI.qs('date') && dates.includes(UI.qs('date')) ? UI.qs('date') : dates[dates.length - 1];
      let sport = '';

      const render = /* แสดงหน้าจอจากข้อมูลและสถานะปัจจุบัน */ () => {
        const ofDay = matches.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหน้าmatch-result */ (m) => m.gameDate === date);
        const sportsOfDay = [...new Set(ofDay.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmatch-result */ (m) => m.sportName))];
        controls.innerHTML = `
          <div class="mb-4">${UI.pills(dates.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmatch-result */ (d) => ({ value: d, label: `${esc(d)} <span class="opacity-70">(${matches.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหน้าmatch-result */ (m) => m.gameDate === d).length})</span>` })), date, 'data-date')}</div>
          <div class="mb-8 flex justify-center">
            <select id="f-sport" class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-gray-900">
              <option value="">ทุกชนิดกีฬา (${sportsOfDay.length})</option>
              ${sportsOfDay.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmatch-result */ (s) => `<option ${s === sport ? 'selected' : ''}>${esc(s)}</option>`).join('')}
            </select>
          </div>`;
        MatchUI.list(resultsEl, ofDay.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหน้าmatch-result */ (m) => !sport || m.sportName === sport));
      };

      controls.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ (e) => {
        const b = e.target.closest('[data-date]');
        if (!b) return;
        date = b.dataset.date;
        sport = '';
        render();
      });
      controls.addEventListener('change', /* ตอบสนองเหตุการณ์ 'change' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ (e) => {
        if (e.target.id !== 'f-sport') return;
        sport = e.target.value;
        render();
      });
      render();
    })
    .catch(/* จัดการข้อผิดพลาดจากงานแบบ asynchronousในหน้าmatch-result */ (err) => (resultsEl.innerHTML = UI.error(err.message)));
})();
