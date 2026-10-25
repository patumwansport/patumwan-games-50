// หน้า "แผนที่สนามแข่งขัน"
(function () {
  const { esc } = UI;
  const { venues } = SiteData.venues;
  const embed = UI.embedUrl(SiteData.venues.embed); // ว่าง = ลิงก์ไม่ใช่ Google Maps จึงไม่แสดง

  document.getElementById('app').innerHTML = `
    ${UI.pageTitle('แผนที่สนามแข่งขัน')}
    ${embed ? `<div class="${UI.card} overflow-hidden p-2">
      <iframe src="${embed}" referrerpolicy="strict-origin-when-cross-origin" title="แผนที่สนามแข่งขัน" class="h-[480px] w-full rounded-xl" loading="lazy"></iframe>
    </div>` : ''}
    ${venues.length ? '' : UI.empty('ยังไม่มีข้อมูลสนามแข่งขัน จะประกาศให้ทราบเร็ว ๆ นี้')}
    ${venues.length ? `<h2 class="mb-6 mt-14 text-center text-2xl font-bold text-brand-800 dark:text-white">สถานที่แข่งขัน</h2>` : ''}
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      ${venues
        .map(
          (v) => `<article class="${UI.card} flex flex-col overflow-hidden">
            <a href="${UI.safeUrl(v.image)}" ${UI.NEW_TAB} class="block aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img src="${UI.safeUrl(v.image)}" alt="${esc(v.title)}" loading="lazy" class="h-full w-full object-cover transition hover:scale-105">
            </a>
            <div class="flex flex-1 flex-col justify-between gap-4 p-5">
              <h3 class="font-semibold text-brand-800 dark:text-gray-100">${esc(v.title)}</h3>
              <a href="${UI.safeUrl(v.url)}" ${UI.NEW_TAB} class="inline-flex w-fit items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">เปิดใน Google Maps</a>
            </div>
          </article>`
        )
        .join('')}
    </div>`;
})();
