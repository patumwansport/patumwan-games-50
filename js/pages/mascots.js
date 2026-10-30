// หน้า "สัญลักษณ์นำโชคการแข่งขัน"
(/* เริ่มต้นหน้าmascotsและจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ function () {
  const { esc } = UI;
  document.getElementById('app').innerHTML = `
    ${UI.pageTitle('สัญลักษณ์นำโชคการแข่งขัน', 'สัญลักษณ์นำโชคการแข่งขัน ปทุมวันเกมส์ ครั้งที่ 50')}
    ${SiteData.mascots.length ? '' : UI.empty('ยังไม่มีข้อมูลมาสคอต จะประกาศให้ทราบเร็ว ๆ นี้')}
    <div class="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
      ${SiteData.mascots
        .map(
          /* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าmascots */ (m) => `<article class="${UI.card} overflow-hidden">
            <div class="flex h-80 items-center justify-center bg-gradient-to-br from-brand-50 via-white to-pink-50 p-6 dark:from-white/5 dark:via-white/5 dark:to-white/5">
              ${m.image ? `<img src="${UI.safeUrl(m.image)}" alt="${esc(m.name)}" class="max-h-full object-contain drop-shadow-xl">` : `<div class="flex h-full w-full items-center justify-center rounded-2xl border-2 border-dashed border-pink-200 text-brand-500 dark:border-white/10 dark:text-gray-400">ใส่รูปมาสคอต</div>`}
            </div>
            <div class="p-6 sm:p-8">
              <h3 class="text-2xl font-bold text-brand-800 dark:text-brand-100">${esc(m.name)}</h3>
              ${m.description ? `<p class="mt-3 leading-relaxed text-neutral-900 dark:text-gray-300">${esc(m.description)}</p>` : ''}
            </div>
          </article>`
        )
        .join('')}
    </div>`;
})();
