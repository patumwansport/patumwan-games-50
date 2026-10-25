// หน้า "ของที่ระลึกการแข่งขัน" — กรอบรูปตามขนาดที่กำหนดใน SiteData.souvenir
// กรอบที่ยังไม่มีรูป (src ว่าง) จะแสดงเป็นกรอบเปล่าพร้อมบอกขนาดภาพที่ต้องใช้
(function () {
  const { esc } = UI;
  const { title, items } = SiteData.souvenir;
  const fmt = (n) => n.toLocaleString('th-TH');
  const ratio = (w, h) => `1 : ${(h / w).toFixed(2)}`;

  const sizeTag = (it) => `
    <p class="mt-3 text-center text-sm text-neutral-900 dark:text-gray-300">
      <span class="font-semibold text-brand-800 dark:text-white">${esc(it.label)}</span>
      · ${fmt(it.width)} × ${fmt(it.height)} px${it.note ? ` (${esc(it.note)})` : ''}
    </p>`;

  const emptyFrame = (it) => `
    <div class="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-pink-300 bg-white/60 p-6 text-center text-brand-500 dark:border-pink-500/40 dark:bg-white/5 dark:text-gray-400">
      <svg class="h-14 w-14 text-pink-300 dark:text-pink-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      <p class="font-medium text-neutral-900 dark:text-gray-200">ใส่รูปภาพ</p>
      <p class="text-2xl font-bold tabular-nums text-pink-600 dark:text-pink-300">${fmt(it.width)} × ${fmt(it.height)} px</p>
      <p class="text-sm">อัตราส่วน ${ratio(it.width, it.height)}${it.note ? ` · ${esc(it.note)}` : ''}</p>
    </div>`;

  const frame = (it) => `
    <figure>
      <div class="overflow-hidden rounded-2xl" style="aspect-ratio: ${it.width} / ${it.height}">
        ${it.src
          ? `<a href="${UI.safeUrl(it.src)}" ${UI.NEW_TAB} class="block h-full"><img src="${UI.safeUrl(it.src)}" alt="${esc(it.label)}" loading="lazy" class="h-full w-full rounded-2xl object-cover shadow-lg ring-1 ring-black/5"></a>`
          : emptyFrame(it)}
      </div>
      <figcaption>${sizeTag(it)}</figcaption>
    </figure>`;

  document.getElementById('app').innerHTML = `
    ${UI.pageTitle(title, `${title} ปทุมวันเกมส์ ครั้งที่ 50`)}
    <div class="mx-auto grid gap-8 ${items.length > 1 ? 'max-w-5xl sm:grid-cols-2' : 'max-w-xl'}">${items.map(frame).join('')}</div>`;
})();
