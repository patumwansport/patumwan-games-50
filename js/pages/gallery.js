// หน้าแกลเลอรีรูป (เหรียญรางวัล, สัญลักษณ์, ของที่ระลึก, อุปกรณ์, กำหนดการ)
// เลือกชุดข้อมูลจาก <body data-page="...">
(/* เริ่มต้นหน้าgalleryและจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ function () {
  const g = SiteData.galleries[document.body.dataset.page];
  document.getElementById('app').innerHTML = `
    ${UI.pageTitle(g.title, `${g.title} ปทุมวันเกมส์ ครั้งที่ 50`)}
    ${g.images.length ? UI.imageStack(g.images) : UI.empty('ยังไม่มีข้อมูล จะประกาศให้ทราบเร็ว ๆ นี้')}`;
})();
