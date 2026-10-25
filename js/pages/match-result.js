// หน้า "ผลการแข่งขันประจำวัน" — รวมผลทุกกีฬาจาก Google Sheet แล้วแยกตามวัน
(function () {
  const { esc } = UI;
  const app = document.getElementById('app');

  app.innerHTML = `
    ${UI.pageTitle('ผลการแข่งขันประจำวัน', 'เลือกวันที่และชนิดกีฬาเพื่อดูผลการแข่งขัน')}
    <div id="controls"></div>
    <div id="results">${UI.loading('กำลังโหลดผลการแข่งขันทุกชนิดกีฬา...')}</div>`;
  const controls = document.getElementById('controls');
  const resultsEl = document.getElementById('results');

  Api.getAllMatches()
    .then((raw) => {
      if (!raw.length) return (resultsEl.innerHTML = UI.empty('ยังไม่มีผลการแข่งขัน'));
      const matches = MatchUI.sortMatches(raw);
      const dates = [...new Set(matches.map((m) => m.gameDate))];
      let date = UI.qs('date') && dates.includes(UI.qs('date')) ? UI.qs('date') : dates[dates.length - 1];
      let sport = '';

      const render = () => {
        const ofDay = matches.filter((m) => m.gameDate === date);
        const sportsOfDay = [...new Set(ofDay.map((m) => m.sportName))];
        controls.innerHTML = `
          <div class="mb-4">${UI.pills(dates.map((d) => ({ value: d, label: `${esc(d)} <span class="opacity-70">(${matches.filter((m) => m.gameDate === d).length})</span>` })), date, 'data-date')}</div>
          <div class="mb-8 flex justify-center">
            <select id="f-sport" class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-gray-900">
              <option value="">ทุกชนิดกีฬา (${sportsOfDay.length})</option>
              ${sportsOfDay.map((s) => `<option ${s === sport ? 'selected' : ''}>${esc(s)}</option>`).join('')}
            </select>
          </div>`;
        MatchUI.list(resultsEl, ofDay.filter((m) => !sport || m.sportName === sport));
      };

      controls.addEventListener('click', (e) => {
        const b = e.target.closest('[data-date]');
        if (!b) return;
        date = b.dataset.date;
        sport = '';
        render();
      });
      controls.addEventListener('change', (e) => {
        if (e.target.id !== 'f-sport') return;
        sport = e.target.value;
        render();
      });
      render();
    })
    .catch((err) => (resultsEl.innerHTML = UI.error(err.message)));
})();
