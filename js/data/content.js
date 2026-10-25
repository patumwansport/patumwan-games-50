// ข้อมูลหน้าที่เป็นเนื้อหาคงที่: เพลง, มาสคอต, แกลเลอรีรูป และผู้สนับสนุน
window.SiteData = window.SiteData || {};

window.SiteData.anthem = {
  title: 'ปทุมวันเกมส์',
  subtitle: 'One Unity One Victory',
  // ลิงก์วิดีโอเพลง (ว่าง = ยังไม่มี) เช่น 'https://www.youtube.com/embed/<id>' และ 'https://youtu.be/<id>'
  youtubeEmbed: '',
  youtubeUrl: '',
  about: [], // ย่อหน้าอธิบายเพลง (ว่าง = ไม่แสดงหัวข้อ "เกี่ยวกับเพลง")
  structure: [], // [{ name: 'Intro', desc: '...' }] ท่อนเพลง (ว่าง = ไม่แสดง)
  // เนื้อเพลงและคอร์ด: { title: 'ท่อน', lines: ['บรรทัด', ...] }
  lyrics: [],
};

// มาสคอตของงาน: [{ name, image, description }] (ว่าง = แสดง "ยังไม่มีข้อมูลมาสคอต")
window.SiteData.mascots = [
  { name: 'Visakar', image: 'assets/images/mascots/visakar.png', description: '' },
  { name: 'Mitrarie', image: 'assets/images/mascots/mitrarie.png', description: '' },
];

// หน้าแกลเลอรี: key ตรงกับ data-page ของแต่ละไฟล์ HTML
window.SiteData.galleries = {
  medals: {
    title: 'เหรียญรางวัลการแข่งขัน',
    images: [], // [{ src, alt }] ว่าง = ยังไม่มีข้อมูล
  },
  signs: {
    title: 'สัญลักษณ์การแข่งขัน',
    images: [], // [{ src, alt }] ว่าง = ยังไม่มีข้อมูล
  },
  equipment: {
    title: 'อุปกรณ์การแข่งขัน',
    images: [], // [{ src, alt }] ว่าง = ยังไม่มีข้อมูล
  },
  'schedule-official': {
    title: 'กำหนดการแข่งขัน',
    images: [], // [{ src, alt }] ว่าง = ยังไม่มีข้อมูล
  },
};

// หน้าของที่ระลึก: กรอบรูปพร้อมขนาด
// ใส่ path รูปใน src เมื่อมีรูปแล้ว (เว้นว่าง = แสดงกรอบเปล่า), เพิ่ม/ลดกรอบได้ตามต้องการ
window.SiteData.souvenir = {
  title: 'ของที่ระลึกการแข่งขัน',
  items: [
    { src: 'assets/images/souvenir/product-inspirations.jpg', label: 'ตัวอย่างผลิตภัณฑ์', width: 4419, height: 6250, note: 'A4 แนวตั้ง' },
  ],
};

// ข่าวสารที่ใส่เองในเว็บ (แสดงร่วมกับข่าวจาก API เมื่อเปิดใช้)
// video: ลิงก์ฝังวิดีโอ (Google Drive ใช้ .../file/d/<id>/preview) ไฟล์ต้องแชร์แบบ "ทุกคนที่มีลิงก์"
window.SiteData.news = [
  {
    id: 'vtr-50',
    title: 'VTR ปทุมวันเกมส์ ครั้งที่ 50',
    content: 'ชมวิดีโอแนะนำการแข่งขันกีฬาสาธิตสามัคคี ครั้งที่ 50 "ปทุมวันเกมส์" ภายใต้แนวคิด One Unity One Victory',
    createdAt: '2026-10-25',
    coverImage: 'assets/images/news/vtr-cover.jpg',
    video: 'https://drive.google.com/file/d/1ftYKq8w_f96QqkuTckPdONM5F-tGHV0p/preview',
  },
];

// ผู้สนับสนุนในหน้าแรก: ใส่ชื่อ (string) หรือ { name, logo } เมื่อมีโลโก้จริง
window.SiteData.sponsors = ['ผู้สนับสนุน 1', 'ผู้สนับสนุน 2', 'ผู้สนับสนุน 3', 'ผู้สนับสนุน 4', 'ผู้สนับสนุน 5', 'ผู้สนับสนุน 6'];
