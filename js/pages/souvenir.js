// หน้า "ของที่ระลึกการแข่งขัน" — กรอบรูปตามขนาดที่กำหนดใน SiteData.souvenir
// กรอบที่ยังไม่มีรูป (src ว่าง) จะแสดงเป็นกรอบเปล่าพร้อมบอกขนาดภาพที่ต้องใช้
(/* เริ่มต้นหน้าsouvenirและจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ function () {
  const { esc } = UI;
  const { title, items } = SiteData.souvenir;
  const fmt = /* จัดรูปแบบค่าให้อ่านง่าย */ (n) => n.toLocaleString('th-TH');
  const ratio = /* คำนวณสัดส่วนความสูงต่อความกว้างของรูป*/ (w, h) => `1 : ${(h / w).toFixed(2)}`;

  const sizeTag = /* สร้างป้ายบอกขนาดของที่ระลึก*/ (it) => `
    <p class="mt-3 text-center text-sm text-neutral-900 dark:text-gray-300">
      <span class="font-semibold text-brand-800 dark:text-white">${esc(it.label)}</span>
      · ${fmt(it.width)} × ${fmt(it.height)} px${it.note ? ` (${esc(it.note)})` : ''}
    </p>`;

  const emptyFrame = /* สร้างกรอบตัวอย่างเมื่อยังไม่มีรูปของที่ระลึก*/ (it) => `
    <div class="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-pink-300 bg-white/60 p-6 text-center text-brand-500 dark:border-pink-500/40 dark:bg-white/5 dark:text-gray-400">
      <svg class="h-14 w-14 text-pink-300 dark:text-pink-500/60" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 16V16C3 16.4643 3 16.6965 3.01926 16.8921C3.20631 18.7912 4.70882 20.2937 6.60793 20.4807C6.80349 20.5 7.03566 20.5 7.5 20.5H16.5C16.9643 20.5 17.1965 20.5 17.3921 20.4807C19.2912 20.2937 20.7937 18.7912 20.9807 16.8921C21 16.6965 21 16.4643 21 16V16M3 16V10.7C3 7.70021 3 6.20032 3.76393 5.14886C4.01065 4.80928 4.30928 4.51065 4.64886 4.26393C5.70032 3.5 7.20021 3.5 10.2 3.5H13.8C16.7998 3.5 18.2997 3.5 19.3511 4.26393C19.6907 4.51065 19.9893 4.80928 20.2361 5.14886C21 6.20032 21 7.70021 21 10.7V16M3 16L5.28731 12.7978C6.26497 11.429 6.7538 10.7447 7.37713 10.5404C7.78179 10.4078 8.21821 10.4078 8.62287 10.5404C9.2462 10.7447 9.73503 11.429 10.7127 12.7978L11.2199 13.5079C11.5923 14.0292 11.7785 14.2899 11.9781 14.4555C12.6242 14.9916 13.5364 15.0671 14.2619 14.6445C14.486 14.514 14.7125 14.2875 15.1655 13.8345V13.8345C15.5562 13.4438 15.7516 13.2484 15.9512 13.1255C16.5943 12.7294 17.4057 12.7294 18.0488 13.1255C18.2484 13.2484 18.4438 13.4438 18.8345 13.8345L21 16M18 8.25C18 9.2165 17.2165 10 16.25 10C15.2835 10 14.5 9.2165 14.5 8.25C14.5 7.2835 15.2835 6.5 16.25 6.5C17.2165 6.5 18 7.2835 18 8.25Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
      <p class="font-medium text-neutral-900 dark:text-gray-200">ใส่รูปภาพ</p>
      <p class="text-2xl font-bold tabular-nums text-pink-600 dark:text-pink-300">${fmt(it.width)} × ${fmt(it.height)} px</p>
      <p class="text-sm">อัตราส่วน ${ratio(it.width, it.height)}${it.note ? ` · ${esc(it.note)}` : ''}</p>
    </div>`;

  const frame = /* สร้างกรอบแสดงรูปและขนาดของที่ระลึก*/ (it) => `
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
