// หน้า "ชนิดกีฬาที่แข่งขัน"
(function () {
  document.getElementById('app').innerHTML = `
    ${UI.pageTitle('ชนิดกีฬาที่แข่งขัน', `${SiteData.sports.length} ชนิดกีฬา ในการแข่งขัน ปทุมวันเกมส์ ครั้งที่ 50`)}
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      ${SiteData.sports.map((s) => UI.sportCard({ href: `match-result-sport.html?id=${s.apiId}`, icon: s.icon, title: s.name, code: s.code })).join('')}
    </div>`;
})();
