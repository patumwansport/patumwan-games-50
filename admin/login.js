// หน้าเข้าสู่ระบบ /admin/login.html: เข้าสู่ระบบด้วย Supabase Auth แล้วส่ง session ต่อให้หน้าแอดมิน
// อีเมลโดเมนโรงเรียน (loginDomain ใน admin/supabase.json) กรอกเฉพาะส่วนหน้า @ ได้ เช่น kittiya.kul
const ADMIN_PAGE = './';
// หน้าแอดมินอ่าน token จากที่นี่ครั้งเดียวแล้วลบทิ้ง (ต้องตรงกับ HANDOFF_KEY ใน admin-ui/src/admin/supabase.ts)
const HANDOFF_KEY = 'pw50-admin-login';

const form = document.getElementById('login-form');
const username = document.getElementById('username');
const password = document.getElementById('password');
const submit = document.getElementById('submit');
const submitLabel = document.getElementById('submit-label');
const error = document.getElementById('error');
const toggle = document.getElementById('toggle-password');

const configReady = fetch('supabase.json', { cache: 'no-cache' }).then(/* ประมวลผลต่อเมื่อคำขอก่อนหน้าสำเร็จในหลังบ้าน */ (res) => res.json());

// ล็อกอินค้างอยู่แล้วก็เข้าหน้าแอดมินเลย (หน้าแอดมินตรวจ session ซ้ำ ถ้าหมดอายุจะส่งกลับมาหน้านี้)
// ดูเฉพาะ token ของโปรเจกต์ในไฟล์ supabase.json: เว็บอื่นใน origin เดียวกัน (เช่น *.github.io) อาจเก็บ token ของ Supabase โปรเจกต์อื่นไว้
// ซึ่งหน้าแอดมินใช้ไม่ได้ ถ้านับรวมจะส่งกลับไปกลับมาระหว่างสองหน้าไม่จบ
configReady.then(/* ประมวลผลต่อเมื่อคำขอก่อนหน้าสำเร็จในหลังบ้าน */ (config) => {
  const ref = new URL(config.url).hostname.split('.')[0];
  if (localStorage.getItem(`sb-${ref}-auth-token`)) location.replace(ADMIN_PAGE);
}).catch(/* ไม่มี localStorage หรืออ่านการตั้งค่าไม่ได้ก็ล็อกอินใหม่ได้ตามปกติ */ () => {});

username.focus();

toggle.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  toggle.textContent = show ? 'ซ่อน' : 'แสดง';
  toggle.setAttribute('aria-pressed', String(show));
  password.focus();
});

// จัดการ showError ภายในหลังบ้าน
function showError(message, field) {
  error.textContent = message;
  for (const input of [username, password]) input.setAttribute('aria-invalid', String(input === field || (!field && !!message)));
  if (field) field.focus();
}

// เลือกข้อความแจ้งเตือนสำหรับหน้าล็อกอิน
function loginMessage(status, data) {
  if (status === 429) return 'ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่';
  if (data.error_code === 'user_banned') return 'บัญชีนี้ถูกปิดใช้งาน ติดต่อผู้ดูแลระบบ';
  if (status === 400 || status === 401) return 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
  return 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่';
}

form.addEventListener('submit', /* ตอบสนองเหตุการณ์ 'submit' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ async (event) => {
  event.preventDefault();
  const name = username.value.trim().toLowerCase();
  if (!name) return showError('กรุณากรอกชื่อผู้ใช้', username);
  if (!password.value) return showError('กรุณากรอกรหัสผ่าน', password);

  showError('');
  submit.disabled = true;
  submitLabel.textContent = 'กำลังเข้าสู่ระบบ…';
  try {
    const config = await configReady;
    if (!config.url || !config.publishableKey) throw new Error('config');
    const email = name.includes('@') ? name : `${name}@${config.loginDomain}`;
    const res = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: config.publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: password.value }),
    });
    const data = await res.json().catch(/* จัดการข้อผิดพลาดจากงานแบบ asynchronousในหลังบ้าน */ () => ({}));
    if (res.ok && data.access_token && data.refresh_token) {
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ access_token: data.access_token, refresh_token: data.refresh_token }));
      return location.replace(ADMIN_PAGE);
    }
    password.value = '';
    showError(loginMessage(res.status, data), password);
  } catch {
    showError('เชื่อมต่อระบบบัญชีไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่');
  }
  submit.disabled = false;
  submitLabel.textContent = 'เข้าสู่ระบบ';
});
