// หน้า "ผู้ประสานงานการจัดการแข่งขัน"
(function () {
  const { esc } = UI;
  const tel = (p) => esc(p || '-');

  const title = UI.pageTitle('ผู้ประสานงานการจัดการแข่งขัน', 'ผู้ประสานงานการจัดการแข่งขัน ปทุมวันเกมส์ ครั้งที่ 50');
  if (!SiteData.organizers.length) {
    document.getElementById('app').innerHTML = `${title}${UI.empty('ยังไม่มีข้อมูล จะประกาศให้ทราบเร็ว ๆ นี้')}`;
    return;
  }

  document.getElementById('app').innerHTML = `
    ${title}
    <div class="${UI.card} overflow-x-auto">
      <table class="w-full min-w-[760px] text-sm">
        <thead class="table-head text-white">
          <tr><th class="px-4 py-3">ลำดับ</th><th class="px-4 py-3 text-left">กลุ่มประสานงาน</th><th class="px-4 py-3 text-left">รายชื่อ</th><th class="px-4 py-3 text-left">หมายเลขโทรศัพท์</th><th class="px-4 py-3">QR Code</th></tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-white/5">
          ${SiteData.organizers
            .map(
              (o) => `<tr class="align-top hover:bg-brand-50/50 dark:hover:bg-white/5">
                <td class="px-4 py-4 text-center">${o.no}</td>
                <td class="px-4 py-4 font-medium text-brand-800 dark:text-gray-100">${esc(o.group)}</td>
                <td class="space-y-2 px-4 py-4">${o.people.map((p) => `<div>${esc(p.name)}</div>`).join('')}</td>
                <td class="space-y-2 px-4 py-4 tabular-nums">${o.people.map((p) => `<div>${tel(p.phone)}</div>`).join('')}</td>
                <td class="px-4 py-4 text-center">${o.qr ? `<a href="${UI.safeUrl(o.qr)}" ${UI.NEW_TAB}><img src="${UI.safeUrl(o.qr)}" alt="QR ${esc(o.group)}" loading="lazy" class="mx-auto h-24 w-24 rounded-lg bg-white object-contain p-1 ring-1 ring-black/5"></a>` : ''}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
})();
