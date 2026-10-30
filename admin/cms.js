// ตั้งค่าฟอร์ม admin/editor.html ก่อนเริ่ม Decap CMS: ตรวจการเข้าสู่ระบบ รูปแบบไฟล์ js/data และตัวบันทึกผ่าน api/cms
window.CMS_MANUAL_INIT = true;

const ADMIN_PAGE = './';
const LOGIN_PAGE = 'login.html';
// api/cms เป็น Vercel Function: เว็บบน GitHub Pages (ไฟล์ static อย่างเดียว) จะไม่มี path นี้
const CMS_API = new URL('../api/cms', location.href).pathname;

// ฟอร์มนี้แสดงในกรอบของหน้า /admin (มีเมนูด้านซ้าย) ถ้าเปิดตรง ๆ ให้ไปหน้านั้นแทน
if (window.top === window) location.replace(ADMIN_PAGE);

// หน้า /admin (admin-ui) ถือ session ของ Supabase และต่ออายุ token ให้ ฟอร์มนี้ขอ token ล่าสุดจากหน้านั้นทุกคำขอ
const auth = window.top !== window ? window.parent.adminAuth : null;

// นำผู้ใช้กลับหน้าล็อกอิน
function goToLogin() {
  window.top.location.replace(LOGIN_PAGE);
  return null;
}

// ส่งคำขอ CMS พร้อม token ของผู้ใช้
async function authFetch(url, init = {}) {
  const token = await auth.token();
  if (!token) return goToLogin();
  const res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  if (res.status === 401) goToLogin();
  return res;
}

// ตัวบันทึก "session": ใช้ตัว proxy ของ Decap ส่งคำสั่งไปที่ api/cms พร้อม token แต่ให้ล็อกอิน/ออกจากระบบผ่านหน้า login ของเว็บ
// ลงทะเบียนตัวเชื่อม API ของ CMS
function registerSessionBackend(username) {
  const proxy = CMS.getBackend('proxy');
  CMS.registerBackend(
    'session',
    class {
      // ประมวลผลขั้นตอนย่อยของหลังบ้านตามข้อมูลหรือสถานะที่รับมา
      constructor(config, options) {
        const backend = proxy.init(config, options);
        const user = /* อ่านข้อมูลผู้ใช้สำหรับ CMS */ () => Promise.resolve({ name: username, login: username });
        backend.authenticate = user;
        backend.restoreUser = user;
        backend.authComponent = /* ประมวลผลขั้นตอนย่อยของหลังบ้านตามข้อมูลหรือสถานะที่รับมา */ () => goToLogin;
        backend.logout = /* ประมวลผลขั้นตอนย่อยของหลังบ้านตามข้อมูลหรือสถานะที่รับมา */ () => auth.signOut();
        backend.request = /* ประมวลผลขั้นตอนย่อยของหลังบ้านตามข้อมูลหรือสถานะที่รับมา */ async (req) => {
          const res = await authFetch(CMS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ branch: backend.branch, ...req }),
          });
          const data = await res?.json().catch(/* จัดการข้อผิดพลาดจากงานแบบ asynchronousในหลังบ้าน */ () => ({}));
          if (res?.ok) return data;
          if (res?.status === 404 || res?.status === 405) throw new Error('ระบบบันทึกเนื้อหาใช้ได้เมื่อเว็บ deploy บน Vercel เท่านั้น (GitHub Pages รันฟังก์ชันฝั่งเซิร์ฟเวอร์ไม่ได้) ดู README หัวข้อหน้าแอดมิน');
          throw new Error(data?.error || 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่');
        };
        // api/cms ส่งแค่รายชื่อไฟล์ รูปตัวอย่างโหลดทีละรูปพร้อม token แล้วแสดงเป็น blob URL
        backend.getMedia = /* ประมวลผลขั้นตอนย่อยของหลังบ้านตามข้อมูลหรือสถานะที่รับมา */ async (folder = backend.mediaFolder) => {
          const files = await backend.request({ action: 'getMedia', params: { branch: backend.branch, mediaFolder: folder } });
          return files.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (f) => ({ ...f, url: `${CMS_API}?file=${encodeURIComponent(f.path)}`, displayURL: f.path }));
        };
        backend.getMediaDisplayURL = /* ประมวลผลขั้นตอนย่อยของหลังบ้านตามข้อมูลหรือสถานะที่รับมา */ async (path) => {
          const res = await authFetch(`${CMS_API}?file=${encodeURIComponent(path)}`);
          if (!res?.ok) throw new Error('โหลดรูปตัวอย่างไม่สำเร็จ');
          return URL.createObjectURL(await res.blob());
        };
        return backend;
      }
    }
  );
}

// สคริปต์ Decap โหลดต่อจากไฟล์นี้ จึงรอให้โหลดครบก่อนเรียกใช้ CMS
window.addEventListener('DOMContentLoaded', /* ตอบสนองเหตุการณ์ 'DOMContentLoaded' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => {
  if (!auth?.username) return goToLogin();

  CMS.registerCustomFormat('sitedata', 'js', {
    fromFile: SiteDataFormat.parse,
    toFile: SiteDataFormat.stringify,
  });
  registerSessionBackend(auth.username);
  // บอก Decap ว่าล็อกอินแล้ว จะได้เข้าหน้าแก้ไขเลยโดยไม่ต้องกดปุ่มเข้าสู่ระบบของ Decap อีกรอบ
  localStorage.setItem('decap-cms-user', JSON.stringify({ name: auth.username, login: auth.username, backendName: 'session' }));
  CMS.init({ config: { local_backend: false } });
});
