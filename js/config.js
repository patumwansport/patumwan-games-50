// การตั้งค่าหลักของเว็บไซต์: ข้อมูลงาน, ที่อยู่ API และเมนู
window.SiteConfig = {
  name: 'ปทุมวันเกมส์ ครั้งที่ 50',
  shortName: 'ปทุมวันเกมส์',
  subtitle: 'กีฬาสาธิตสามัคคี ครั้งที่ 50',
  slogan: 'One Unity One Victory',
  year: 2027,
  tagline: 'การแข่งขันกีฬาสาธิตสามัคคี ครั้งที่ 50 ประจำปี 2570 (2027)',
  period: 'พ.ศ. 2570 (2027)', // ใส่วันแข่งขันจริงเมื่อกำหนดแล้ว
  // วันเริ่มแข่งขัน สำหรับนับถอยหลังในหน้าแรก เช่น '2027-12-01T08:00:00+07:00' (ว่าง = แสดง --)
  startDate: '2027-12-01T08:00:00+07:00',
  // รูป Hero หน้าแรก เช่น ['assets/images/hero/1.jpg'] (ว่าง = แสดงกรอบเปล่า, หลายรูป = เลื่อนเป็นสไลด์)
  heroImages: [],
  contact: {
    // ใส่เบอร์โทร/โทรสาร/อีเมลของงาน (ว่าง = ไม่แสดงบรรทัดนั้น)
    phone: '',
    fax: '',
    email: '',
    address: [
      'โรงเรียนสาธิตมหาวิทยาลัยศรีนครินทรวิโรฒ ปทุมวัน',
      '2 ถนนอังรีดูนังต์ แขวงปทุมวัน เขตปทุมวัน',
      'กรุงเทพมหานคร 10330',
    ],
    mapEmbed: '', // ลิงก์ Google Maps embed ของสถานที่จัดงาน (ว่าง = ไม่แสดงแผนที่)
  },

  // ผลที่อนุมัติแล้วจากระบบผลการแข่งขัน /admin/results/ (Supabase) ใช้แทน Google Sheet
  // ว่าง = ใช้ Google Sheet ตามเดิม (ดู supabase/README.md ข้อ 7)
  // resultsFeedKey เป็น publishable key (คีย์สาธารณะ) ห้ามใส่ secret / service_role key
  resultsFeed: 'https://unxramvsubyjteyrfzbk.supabase.co/rest/v1/rpc/public_results',
  resultsFeedKey: 'sb_publishable_4D9HoHSZRxNnqGVd3r6mtA_9qoFkSH9',
  // URL ระบบลงทะเบียนที่ติดตั้งจริง เช่น https://registration.example.ac.th/
  // เว้นว่าง: เปิดลิงก์ทดสอบพอร์ต 5700 เฉพาะเมื่อดูเว็บไซต์ผ่าน localhost/127.0.0.1
  registrationUrl: '',

  // Google Sheet สำหรับตารางการแข่งขัน, ผลการแข่งขัน และสรุปเหรียญทุกหน้า (วิธีตั้งค่าดูใน README.md)
  // ใส่ลิงก์จาก ไฟล์ > แชร์ > เผยแพร่ทางเว็บ ของแต่ละแท็บ แบบ CSV (ว่าง = แสดง "ยังไม่มีข้อมูล")
  sheet: {
    matchesCsv: '', // แท็บ "ตารางการแข่งขัน"
    resultsCsv: '', // แท็บ "ผลการแข่งขัน"
    cacheMinutes: 2, // เก็บข้อมูลไว้ใน sessionStorage กี่นาที
  },

  // API ข่าวสาร
  api: {
    // false = ยังไม่เชื่อมต่อ: หน้าข่าวสารว่าง
    // true  = ดึงข้อมูลจาก base ด้านล่าง (ใส่ที่อยู่ API ของระบบใหม่ก่อนเปิดใช้)
    enabled: false,
    base: '',
    news: '/news',
    timeoutMs: 30000, // ใช้กับ Google Sheet ด้วย
    cacheMinutes: 10, // เก็บข้อมูลไว้ใน sessionStorage กี่นาที
  },


  menu: [
    { id: 'home', label: 'หน้าแรก', href: 'index.html' },
    {
      id: 'info',
      label: 'ข้อมูลทั่วไป',
      children: [
        { id: 'history', label: 'ประวัติการแข่งขัน', href: 'history.html' },
        { id: 'anthem', label: 'เพลงประจำการแข่งขัน', href: 'anthem.html' },
        { id: 'medals', label: 'เหรียญรางวัลการแข่งขัน', href: 'medals.html' },
        { id: 'signs', label: 'สัญลักษณ์การแข่งขัน', href: 'signs.html' },
        { id: 'mascots', label: 'สัญลักษณ์นำโชคการแข่งขัน', href: 'mascots.html' },
        { id: 'institution', label: 'สถาบันที่เข้าร่วมการแข่งขัน', href: 'institution.html' },
        { id: 'organizers', label: 'ผู้ประสานงานการจัดการแข่งขัน', href: 'organizers.html' },
      ],
    },
    {
      id: 'info-competition',
      label: 'ข้อมูลการแข่งขัน',
      children: [
        { id: 'sports', label: 'ชนิดกีฬาที่แข่งขัน', href: 'sports.html' },
        { id: 'schedule-official', label: 'กำหนดการแข่งขัน', href: 'schedule-official.html' },
        { id: 'schedule-list', label: 'สรุปตารางการแข่งขัน', href: 'schedule-list.html' },
        { id: 'regulations', label: 'ระเบียบและข้อบังคับการแข่งขัน', href: 'regulations.html' },
        { id: 'map', label: 'แผนที่สนามแข่งขัน', href: 'map.html' },
        { id: 'athletes', label: 'สูจิบัตรการแข่งขัน', href: 'athletes.html' },
        { id: 'equipment', label: 'อุปกรณ์การแข่งขัน', href: 'equipment.html' },
      ],
    },
    {
      id: 'results',
      label: 'ผลการแข่งขัน',
      children: [
        { id: 'match-result-sport', label: 'ผลการแข่งขันตามชนิดกีฬา', href: 'match-result-sport.html' },
        { id: 'match-result', label: 'ผลการแข่งขันประจำวัน', href: 'match-result.html' },
        { id: 'medals-sport', label: 'สรุปเหรียญตามชนิดกีฬา', href: 'medals-sport.html' },
        { id: 'medals-school', label: 'สรุปเหรียญตามสถาบัน', href: 'medals-school.html' },
        { id: 'medals-date', label: 'สรุปเหรียญประจำวัน', href: 'medals-date.html' },
        { id: 'statistics-p', label: 'สรุปเหรียญตามสถาบัน (ระดับประถมศึกษา)', href: 'statistics.html?type=p' },
        { id: 'statistics-m', label: 'สรุปเหรียญตามสถาบัน (ระดับมัธยมศึกษา)', href: 'statistics.html?type=m' },
        { id: 'sport-summary-medals', label: 'สรุปเหรียญตามสถาบัน (ชนิดกีฬา)', href: 'sport-summary-medals.html' },
        { id: 'statistics', label: 'สถิติเหรียญรางวัล', href: 'statistics.html' },
      ],
    },
    { id: 'souvenir', label: 'ของที่ระลึกการแข่งขัน', href: 'souvenir.html' },
    { id: 'news', label: 'ข่าวสารและกิจกรรม', href: 'news.html' },
    { id: 'contact', label: 'ติดต่อเรา', href: 'about-us.html' },
    { id: 'register', label: 'ระบบลงทะเบียนนักกีฬา', href: '', external: true },
  ],
};

// เชื่อมเมนูเข้าระบบลงทะเบียนแยก โดยไม่ใช้ URL เครื่องทดสอบบนเว็บไซต์จริง
(function connectRegistration() {
  const config = window.SiteConfig;
  const configured = config.registrationUrl.trim();
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  let href = '';
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' || (local && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) href = url.href;
    } catch { /* URL ไม่ถูกต้อง ให้เมนูคงสถานะยังไม่เปิดใช้งาน */ }
  } else if (local && window.location.protocol === 'http:') {
    href = `http://${window.location.hostname}:5700/`;
  }
  const menu = config.menu.find(/* เลือกเมนูระบบลงทะเบียนนักกีฬา */ (item) => item.id === 'register');
  if (menu) menu.href = href;
})();
