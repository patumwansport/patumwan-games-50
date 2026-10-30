// หน้า "ติดต่อเรา"
(/* เริ่มต้นหน้าaboutและจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ function () {
  const { esc } = UI;
  const c = SiteConfig.contact;
  const mapSrc = UI.embedUrl(c.mapEmbed); // ว่าง = ลิงก์ไม่ใช่ Google Maps จึงไม่แสดง
  const row = /* สร้างแถวแสดงข้อมูล */ (icon, label, value) => `
    <div class="flex gap-4">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-white/10 dark:text-brand-100">${icon}</span>
      <div><p class="text-sm text-brand-500 dark:text-gray-400">${label}</p><div class="mt-0.5 text-brand-800 dark:text-gray-100">${value}</div></div>
    </div>`;

  document.getElementById('app').innerHTML = `
    ${UI.pageTitle('ติดต่อเรา')}
    <div class="grid gap-8 ${mapSrc ? 'lg:grid-cols-2' : 'mx-auto max-w-2xl'}">
      <section class="${UI.card} space-y-6 p-6 sm:p-8">
        <h2 class="text-2xl font-bold text-brand-800 dark:text-white">ข้อมูลติดต่อ</h2>
        ${row(UI.icon.pin, 'ที่อยู่', c.address.map(esc).join('<br>'))}
        ${c.phone ? row(UI.icon.phone, 'โทรศัพท์', esc(c.phone)) : ''}
        ${c.fax ? row(UI.icon.printer, 'โทรสาร', esc(c.fax)) : ''}
        ${c.email ? row(UI.icon.mail, 'อีเมล', esc(c.email)) : ''}
      </section>
${mapSrc ? `<section class="${UI.card} p-6 sm:p-8">
        <h2 class="mb-6 text-2xl font-bold text-brand-800 dark:text-white">แผนที่</h2>
        <iframe src="${mapSrc}" referrerpolicy="strict-origin-when-cross-origin" title="แผนที่โรงเรียน" class="h-[380px] w-full rounded-xl" loading="lazy" allowfullscreen></iframe>
      </section>` : ''}
    </div>`;
})();
