// ผู้ประสานงานการจัดการแข่งขัน (ว่าง = แสดง "ยังไม่มีข้อมูล จะประกาศให้ทราบเร็ว ๆ นี้")
// รูปแบบ: [{ no, group, people: [{ name, phone }], qr }] qr = path/ลิงก์รูป QR Code หรือ null
// แก้ไขได้ที่หน้า /admin (ถ้าแก้ไฟล์เอง ให้คงรูปแบบ JSON: ใช้เครื่องหมาย " และไม่ใส่ comment ในข้อมูล)
window.SiteData = window.SiteData || {};

window.SiteData.organizers = [];
