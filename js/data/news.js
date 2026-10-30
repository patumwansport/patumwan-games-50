// ข่าวสารที่ใส่เองในเว็บ (แสดงร่วมกับข่าวจาก API เมื่อเปิดใช้) เรียงข่าวใหม่สุดก่อนตาม createdAt
// { id (ภาษาอังกฤษ ไม่ซ้ำกัน ใช้ในลิงก์ news.html?id=), title, content, createdAt (YYYY-MM-DD), coverImage, video, pictures: [{ url }] }
// video: ลิงก์ฝังวิดีโอ (Google Drive ใช้ .../file/d/<id>/preview) ไฟล์ต้องแชร์แบบ "ทุกคนที่มีลิงก์"
// แก้ไขได้ที่หน้า /admin (ถ้าแก้ไฟล์เอง ให้คงรูปแบบ JSON: ใช้เครื่องหมาย " และไม่ใส่ comment ในข้อมูล)
window.SiteData = window.SiteData || {};

window.SiteData.news = [
  {
    "id": "vtr-50",
    "title": "VTR ปทุมวันเกมส์ ครั้งที่ 50",
    "content": "ชมวิดีโอแนะนำการแข่งขันกีฬาสาธิตสามัคคี ครั้งที่ 50 \"ปทุมวันเกมส์\" ภายใต้แนวคิด One Unity One Victory",
    "createdAt": "2026-10-25",
    "coverImage": "assets/images/news/vtr-cover.jpg",
    "video": "https://drive.google.com/file/d/1ftYKq8w_f96QqkuTckPdONM5F-tGHV0p/preview"
  }
];
