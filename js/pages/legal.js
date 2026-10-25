// หน้านโยบายความเป็นส่วนตัว / เงื่อนไขการใช้งาน (เลือกเนื้อหาจาก data-page ของ body)
// เลเอาต์เดียวกับหน้าประวัติการแข่งขัน: แบบเปิดโล่ง ไม่มีกล่อง หัวข้อชิดซ้ายพร้อมเส้นคั่น
(function () {
  const { esc } = UI;
  const doc = SiteData.legal[document.body.dataset.page];

  // ขนาด/ระยะเดียวกับหน้าประวัติ: ส่วนละ py-12, หัวข้อ + เส้นยาวต่อท้าย
  const section = (title, body, no = '') => `
    <section class="py-12">
      <div class="mb-8 flex items-center gap-6">
        <h2 class="min-w-0 text-2xl font-semibold tracking-tight text-brand-800 sm:text-3xl dark:text-white">${no ? `<span class="mr-3 text-pink-500 dark:text-pink-300">${no}</span>` : ''}${esc(title)}</h2>
        <span class="h-px min-w-12 flex-1 bg-gray-200 dark:bg-white/10" aria-hidden="true"></span>
      </div>
      ${body}
    </section>`;

  const paragraph = (text) => `<p class="text-base leading-loose text-neutral-900 dark:text-gray-300">${esc(text)}</p>`;

  // รายการแบบจุด: เส้นชมพูด้านซ้าย แบบเดียวกับวัตถุประสงค์ในหน้าประวัติ
  const items = (list) => `
    <ul class="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">${list
      .map((t) => `<li class="self-start border-l-2 border-pink-300 pl-4 font-semibold leading-relaxed text-brand-800 dark:border-pink-500/50 dark:text-white">${esc(t)}</li>`)
      .join('')}</ul>`;

  const body = (s) => [s.text ? paragraph(s.text) : '', s.items ? items(s.items) : ''].filter(Boolean).join('<div class="h-6"></div>');

  const app = document.getElementById('app');
  app.className = 'mx-auto max-w-7xl px-4 sm:px-6'; // เท่ากับหน้าแรก/หน้าประวัติ
  app.innerHTML = `
    <div class="pt-10">${UI.pageTitle(esc(doc.title), esc(doc.subtitle))}</div>
    <div>
      ${section('ภาพรวม', paragraph(doc.intro))}
      ${doc.sections.map((s, i) => section(s.title, body(s), String(i + 1).padStart(2, '0'))).join('')}
      <p class="pb-12 text-sm text-gray-500 dark:text-gray-400">อัปเดตล่าสุด: ${esc(doc.updated)}</p>
    </div>`;
})();
