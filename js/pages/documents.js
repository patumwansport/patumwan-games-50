// หน้าเอกสารแยกตามชนิดกีฬา (ระเบียบการแข่งขัน / สูจิบัตร) — ลิงก์ไป Google Drive
(function () {
  const pages = {
    regulations: { title: 'ระเบียบและข้อบังคับการแข่งขัน', data: SiteData.regulations },
    athletes: { title: 'สูจิบัตรการแข่งขัน', data: SiteData.athletes },
  };
  const page = pages[document.body.dataset.page];
  const openTag = `<span class="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-100">เปิดเอกสาร ${UI.icon.external}</span>`;
  const soonTag = '<span class="mt-2 text-xs text-brand-400 dark:text-gray-500">ยังไม่มีเอกสาร</span>';
  const hasDocs = page.data.some((d) => d.url);

  // ยังไม่มีเอกสารเลย: แสดงข้อความแทนรายการชนิดกีฬา
  if (!hasDocs) {
    document.getElementById('app').innerHTML = `${UI.pageTitle(page.title)}${UI.empty('ยังไม่มีข้อมูล จะประกาศให้ทราบเร็ว ๆ นี้')}`;
    return;
  }

  document.getElementById('app').innerHTML = `
    ${UI.pageTitle(page.title, 'คลิกเพื่อเปิดเอกสาร')}
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      ${page.data.map((d) => UI.sportCard({ href: d.url, icon: d.icon, title: d.title, external: true, extra: d.url ? openTag : soonTag })).join('')}
    </div>`;
})();
