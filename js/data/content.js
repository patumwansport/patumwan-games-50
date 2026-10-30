// ข้อมูลหน้าที่เป็นเนื้อหาคงที่: เพลง, มาสคอต, แกลเลอรีรูป, ของที่ระลึก และผู้สนับสนุน
// anthem: youtubeEmbed เช่น https://www.youtube.com/embed/<id>, youtubeUrl เช่น https://youtu.be/<id> (ว่าง = ยังไม่มี)
//   about: [ย่อหน้า], structure: [{ name, desc }] ท่อนเพลง, lyrics: [{ title, lines: [บรรทัด] }] (ว่าง = ไม่แสดงหัวข้อนั้น)
// mascots: [{ name, image, description }] (ว่าง = แสดง "ยังไม่มีข้อมูลมาสคอต")
// galleries: key ตรงกับ data-page ของแต่ละไฟล์ HTML, images: [{ src, alt }] (ว่าง = ยังไม่มีข้อมูล)
// souvenir: กรอบรูปพร้อมขนาด { src, label, width, height, note } (src ว่าง = แสดงกรอบเปล่า)
// sponsors: ผู้สนับสนุนในหน้าแรก [{ name, logo }] (logo ว่าง = แสดงชื่อแทน)
// แก้ไขได้ที่หน้า /admin (ถ้าแก้ไฟล์เอง ให้คงรูปแบบ JSON: ใช้เครื่องหมาย " และไม่ใส่ comment ในข้อมูล)
window.SiteData = window.SiteData || {};

window.SiteData.anthem = {
  "title": "ปทุมวันเกมส์",
  "subtitle": "One Unity One Victory",
  "youtubeEmbed": "",
  "youtubeUrl": "",
  "about": [],
  "structure": [],
  "lyrics": []
};

window.SiteData.mascots = [
  {
    "name": "Visakar",
    "image": "assets/images/mascots/visakar.png",
    "description": ""
  },
  {
    "name": "Mitrarie",
    "image": "assets/images/mascots/mitrarie.png",
    "description": ""
  }
];

window.SiteData.galleries = {
  "medals": {
    "title": "เหรียญรางวัลการแข่งขัน",
    "images": []
  },
  "signs": {
    "title": "สัญลักษณ์การแข่งขัน",
    "images": []
  },
  "equipment": {
    "title": "อุปกรณ์การแข่งขัน",
    "images": []
  },
  "schedule-official": {
    "title": "กำหนดการแข่งขัน",
    "images": []
  }
};

window.SiteData.souvenir = {
  "title": "ของที่ระลึกการแข่งขัน",
  "items": [
    {
      "src": "assets/images/souvenir/product-inspirations.jpg",
      "label": "ตัวอย่างผลิตภัณฑ์",
      "width": 4419,
      "height": 6250,
      "note": "A4 แนวตั้ง"
    }
  ]
};

window.SiteData.sponsors = [
  {
    "name": "ผู้สนับสนุน 1",
    "logo": ""
  },
  {
    "name": "ผู้สนับสนุน 2",
    "logo": ""
  },
  {
    "name": "ผู้สนับสนุน 3",
    "logo": ""
  },
  {
    "name": "ผู้สนับสนุน 4",
    "logo": ""
  },
  {
    "name": "ผู้สนับสนุน 5",
    "logo": ""
  },
  {
    "name": "ผู้สนับสนุน 6",
    "logo": ""
  }
];
