// หน้าสรุปเหรียญที่คำนวณจากผลการแข่งขันใน Google Sheet
//   medals-sport          : สรุปเหรียญตามชนิดกีฬา (แต่ละกีฬามีเหรียญกี่เหรียญ)
//   medals-date           : สรุปเหรียญประจำวัน (เลือกวัน -> ตารางโรงเรียน)
//   sport-summary-medals  : สรุปเหรียญตามสถาบัน แยกชนิดกีฬา (เลือกกีฬา -> ตารางโรงเรียน)
(/* เริ่มต้นหน้าmedals-derivedและจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ function () {
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
  // สร้างตัวเลือกสำหรับกรองตารางเหรียญ
  function picker(options, initial, renderFor, attr) {
    let current = initial;
    const draw = /* วาดตารางหรือรายการใหม่ตามตัวกรอง */ () => {
      controls.innerHTML = UI.pills(options, current, attr);
      content.innerHTML = renderFor(current);
    };
    controls.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ (e) => {
      const b = e.target.closest(`[${attr}]`);
      if (!b) return;
      current = b.getAttribute(attr);
      draw();
    });
    draw();
  }

  Api.getMedalEntries()
    .then(/* ประมวลผลต่อเมื่อคำขอก่อนหน้าสำเร็จในหน้าmedals-derived */ (entries) => {
      // ยังไม่มีเหรียญเลย: แสดงข้อความแทนตารางที่เป็น 0
      if (!entries.length) {
        content.innerHTML = UI.empty('ยังไม่มีข้อมูล จะประกาศให้ทราบเร็ว ๆ นี้');
        return;
      }

      const schoolTable = /* สรุปเหรียญตามโรงเรียนแล้วสร้างตารางแสดงผล*/ (list, title) => UI.medalTable(Api.tallyBy(list, /* ทำงานต่อภายใน Api.tallyBy ของหน้าmedals-derived */ (e) => e.school), { title });

      if (page === 'medals-sport') {
        const rows = Api.tallyBy(entries, /* ทำงานต่อภายใน Api.tallyBy ของหน้าmedals-derived */ (e) => e.sport);
        const bySport = new Map(rows.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmedals-derived */ (r) => [r.name, r]));
        // เรียงตามรหัสกีฬาแบบเว็บต้นฉบับ
        const ordered = sports.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmedals-derived */ (s, i) => ({ ...(bySport.get(s.name) || { name: s.name, gold: 0, silver: 0, bronze: 0, total: 0 }), rank: i + 1, name: `${s.code}-${s.name}` }));
        content.innerHTML = UI.medalTable(ordered, { title: 'เหรียญรางวัลแยกตามชนิดกีฬา', unit: 'ชนิดกีฬา', nameLabel: 'ชนิดกีฬา', rankLabel: 'ลำดับ', plainRank: true });
        return;
      }

      if (page === 'medals-date') {
        const dates = [...new Set(entries.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmedals-derived */ (e) => e.date))].sort(/* เปรียบเทียบรายการเพื่อจัดลำดับในหน้าmedals-derived */ (a, b) => Api.thaiDateKey(a) - Api.thaiDateKey(b));
        picker(
          dates.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmedals-derived */ (d) => ({ value: d, label: esc(d) })),
          dates[dates.length - 1],
          /* ทำงานต่อภายใน picker ของหน้าmedals-derived */ (d) => schoolTable(entries.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหน้าmedals-derived */ (e) => e.date === d), `เหรียญรางวัลประจำวันที่ ${d}`),
          'data-date'
        );
        return;
      }

      // sport-summary-medals
      const choices = sports.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหน้าmedals-derived */ (s) => entries.some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในหน้าmedals-derived */ (e) => e.sport === s.name));
      const initial = choices.find(/* ค้นหารายการแรกที่ตรงตามเงื่อนไขในหน้าmedals-derived */ (s) => String(s.apiId) === UI.qs('id'))?.name || choices[0]?.name;
      picker(
        choices.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmedals-derived */ (s) => ({ value: s.name, label: esc(s.name) })),
        initial,
        /* ทำงานต่อภายใน picker ของหน้าmedals-derived */ (name) => schoolTable(entries.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหน้าmedals-derived */ (e) => e.sport === name), `เหรียญรางวัลกีฬา${name}`),
        'data-sport'
      );
    })
    .catch(/* จัดการข้อผิดพลาดจากงานแบบ asynchronousในหน้าmedals-derived */ (err) => (content.innerHTML = UI.error(err.message)));
})();
