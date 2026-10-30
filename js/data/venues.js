// ข้อมูลที่ดึงมาจากหน้า venues ของเว็บไซต์ต้นฉบับ
// embed: ลิงก์ Google My Maps แบบ embed
// venues: [{ title, image, url }] สนามแข่งขันแต่ละแห่ง (ว่าง = ยังไม่มีข้อมูล)
// แก้ไขได้ที่หน้า /admin (ถ้าแก้ไฟล์เอง ให้คงรูปแบบ JSON: ใช้เครื่องหมาย " และไม่ใส่ comment ในข้อมูล)
window.SiteData = window.SiteData || {};

window.SiteData.venues = {
  "embed": "",
  "venues": []
};
