// หน้าสรุปเหรียญที่คำนวณจากผลการแข่งขันใน Google Sheet
//   medals-sport          : สรุปเหรียญตามชนิดกีฬา (แต่ละกีฬามีเหรียญกี่เหรียญ)
//   medals-date           : สรุปเหรียญประจำวัน (เลือกวัน -> ตารางโรงเรียน)
//   sport-summary-medals  : สรุปเหรียญตามสถาบัน แยกชนิดกีฬา (เลือกกีฬา -> ตารางโรงเรียน)
(function () {
  const { esc } = UI;
  const app = document.getElementById('app');
  const page = document.body.dataset.page;
  const sports = SiteData.sports;

  const TITLES = {
    'medals-sport': ['สรุปเหรียญตามชนิดกีฬา', 'จำนวนเหรียญรางวัลที่มอบในแต่ละชนิดกีฬา'],
    'medals-date': ['สรุปเหรียญประจำวัน', 'เลือกวันที่เพื่อดูเหรียญรางวัลของแต่ละโรงเรียน'],
    'sport-summary-medals': ['สรุปเหรียญตามสถาบัน (ชนิดกีฬา)', 'เลือกชนิดกีฬาเพื่อดูเหรียญรางวัลของแต่ละโรงเรียน'],
  };
  const [title, subtitle] = TITLES[page];

  app.innerHTML = `
    ${UI.pageTitle(title, subtitle)}
    <div id="controls" class="mb-8"></div>
    <div id="content">${UI.loading('กำลังรวบรวมผลการแข่งขันทุกชนิดกีฬา...')}</div>`;
  const controls = document.getElementById('controls');
  const content = document.getElementById('content');

  // ---- เลือกค่าแล้ว render ตารางโรงเรียน (ใช้กับ medals-date / sport-summary-medals) ----
  function picker(options, initial, renderFor, attr) {
    let current = initial;
    const draw = () => {
      controls.innerHTML = UI.pills(options, current, attr);
      content.innerHTML = renderFor(current);
    };
    controls.addEventListener('click', (e) => {
      const b = e.target.closest(`[${attr}]`);
      if (!b) return;
      current = b.getAttribute(attr);
      draw();
    });
    draw();
  }

  Api.getMedalEntries()
    .then((entries) => {
      // ยังไม่มีเหรียญเลย: แสดงข้อความแทนตารางที่เป็น 0
      if (!entries.length) {
        content.innerHTML = UI.empty('ยังไม่มีข้อมูล จะประกาศให้ทราบเร็ว ๆ นี้');
        return;
      }

      const schoolTable = (list, title) => UI.medalTable(Api.tallyBy(list, (e) => e.school), { title });

      if (page === 'medals-sport') {
        const rows = Api.tallyBy(entries, (e) => e.sport);
        const bySport = new Map(rows.map((r) => [r.name, r]));
        // เรียงตามรหัสกีฬาแบบเว็บต้นฉบับ
        const ordered = sports.map((s, i) => ({ ...(bySport.get(s.name) || { name: s.name, gold: 0, silver: 0, bronze: 0, total: 0 }), rank: i + 1, name: `${s.code}-${s.name}` }));
        content.innerHTML = UI.medalTable(ordered, { title: 'เหรียญรางวัลแยกตามชนิดกีฬา', unit: 'ชนิดกีฬา', nameLabel: 'ชนิดกีฬา', rankLabel: 'ลำดับ', plainRank: true });
        return;
      }

      if (page === 'medals-date') {
        const dates = [...new Set(entries.map((e) => e.date))].sort((a, b) => Api.thaiDateKey(a) - Api.thaiDateKey(b));
        picker(
          dates.map((d) => ({ value: d, label: esc(d) })),
          dates[dates.length - 1],
          (d) => schoolTable(entries.filter((e) => e.date === d), `เหรียญรางวัลประจำวันที่ ${d}`),
          'data-date'
        );
        return;
      }

      // sport-summary-medals
      const choices = sports.filter((s) => entries.some((e) => e.sport === s.name));
      const initial = choices.find((s) => String(s.apiId) === UI.qs('id'))?.name || choices[0]?.name;
      picker(
        choices.map((s) => ({ value: s.name, label: esc(s.name) })),
        initial,
        (name) => schoolTable(entries.filter((e) => e.sport === name), `เหรียญรางวัลกีฬา${name}`),
        'data-sport'
      );
    })
    .catch((err) => (content.innerHTML = UI.error(err.message)));
})();
