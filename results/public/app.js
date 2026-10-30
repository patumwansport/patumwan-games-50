/* ระบบผลการแข่งขัน: session อยู่ใน HttpOnly cookie เท่านั้น */
(/* เริ่มต้นระบบกีฬาและจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ () => {
  'use strict';
  const main = document.getElementById('main');
  const notice = document.getElementById('notice');
  document.querySelector('.skip').addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ (event) => { event.preventDefault(); main.focus(); });
  const state = { me: null };
  // Icons by Iconstica. See assets/icons/iconstica/README.md.
  const paths = {
  "list": "<path d=\"M19 7.5H8.5M19 12H8.5M19 16.5H8.5\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n<path d=\"M4.25 7.5C4.25 6.94772 4.69772 6.5 5.25 6.5V6.5C5.80228 6.5 6.25 6.94772 6.25 7.5V7.5C6.25 8.05228 5.80228 8.5 5.25 8.5V8.5C4.69772 8.5 4.25 8.05228 4.25 7.5V7.5Z\" fill=\"currentColor\"/>\n<path d=\"M4.25 12C4.25 11.4477 4.69772 11 5.25 11V11C5.80228 11 6.25 11.4477 6.25 12V12C6.25 12.5523 5.80228 13 5.25 13V13C4.69772 13 4.25 12.5523 4.25 12V12Z\" fill=\"currentColor\"/>\n<path d=\"M4.25 16.5C4.25 15.9477 4.69772 15.5 5.25 15.5V15.5C5.80228 15.5 6.25 15.9477 6.25 16.5V16.5C6.25 17.0523 5.80228 17.5 5.25 17.5V17.5C4.69772 17.5 4.25 17.0523 4.25 16.5V16.5Z\" fill=\"currentColor\"/>",
  "users": "<path d=\"M10.0042 17.7195V17.7195C9.63874 18.7034 10.3665 19.75 11.416 19.75H18.0397C18.5872 19.75 18.8609 19.75 19.0645 19.7162C20.4518 19.4855 21.376 18.1564 21.1091 16.7756C21.07 16.573 20.9747 16.3164 20.784 15.8031V15.8031C20.6253 15.3759 20.546 15.1623 20.4537 14.9759C19.8451 13.7459 18.6484 12.9139 17.2836 12.7716C17.0767 12.75 16.8488 12.75 16.3931 12.75H14.6075C14.3945 12.75 14.288 12.75 14.1821 12.7556C13.9157 12.7697 13.6513 12.8105 13.393 12.8773C13.2904 12.9038 13.1889 12.9358 12.9857 13V13M8.33008 8.25C7.22551 8.25 6.33008 7.35457 6.33008 6.25C6.33008 5.14543 7.22551 4.25 8.33008 4.25C9.43465 4.25 10.3301 5.14543 10.3301 6.25C10.3301 7.35457 9.43465 8.25 8.33008 8.25ZM15.8301 10.25C14.7255 10.25 13.8301 9.35457 13.8301 8.25C13.8301 7.14543 14.7255 6.25 15.8301 6.25C16.9346 6.25 17.8301 7.14543 17.8301 8.25C17.8301 9.35457 16.9346 10.25 15.8301 10.25ZM5.96032 17.75H10.5397C11.0872 17.75 11.3609 17.75 11.5645 17.7162C12.9518 17.4855 13.876 16.1564 13.6091 14.7756C13.57 14.573 13.4747 14.3164 13.284 13.8031V13.8031C13.1253 13.3759 13.046 13.1623 12.9537 12.9759C12.3451 11.7459 11.1484 10.9139 9.78358 10.7716C9.5767 10.75 9.34883 10.75 8.89307 10.75H7.60693C7.15117 10.75 6.9233 10.75 6.71642 10.7716C5.35155 10.9139 4.15492 11.7459 3.54627 12.9759C3.45401 13.1623 3.37467 13.3759 3.21598 13.8031V13.8031C3.02535 14.3164 2.93003 14.573 2.89087 14.7756C2.62401 16.1564 3.54819 17.4855 4.9355 17.7162C5.13908 17.75 5.41283 17.75 5.96032 17.75Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/>",
  "shield": "<path d=\"M17 8V8C17 5.23858 14.7614 3 12 3V3C9.23858 3 7 5.23858 7 8V8M12 15.5V15.5C13.1046 15.5 14 14.6046 14 13.5V13.5C14 12.3954 13.1046 11.5 12 11.5V11.5C10.8954 11.5 10 12.3954 10 13.5V13.5C10 14.6046 10.8954 15.5 12 15.5V15.5ZM12 15.5V18M9.5 21H14.5C16.8346 21 18.0019 21 18.8856 20.5277C19.5833 20.1548 20.1548 19.5833 20.5277 18.8856C21 18.0019 21 16.8346 21 14.5V14.5C21 12.1654 21 10.9981 20.5277 10.1144C20.1548 9.4167 19.5833 8.84525 18.8856 8.47231C18.0019 8 16.8346 8 14.5 8H9.5C7.16537 8 5.99805 8 5.11441 8.47231C4.4167 8.84525 3.84525 9.4167 3.47231 10.1144C3 10.9981 3 12.1654 3 14.5V14.5C3 16.8346 3 18.0019 3.47231 18.8856C3.84525 19.5833 4.4167 20.1548 5.11441 20.5277C5.99805 21 7.16537 21 9.5 21Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "history": "<path d=\"M12.75 12C12.75 12.4142 12.4142 12.75 12 12.75C11.5858 12.75 11.25 12.4142 11.25 12C11.25 11.5858 11.5858 11.25 12 11.25C12.4142 11.25 12.75 11.5858 12.75 12Z\" fill=\"currentColor\"/>\n<path d=\"M12.75 12C12.75 12.4142 12.4142 12.75 12 12.75C11.5858 12.75 11.25 12.4142 11.25 12C11.25 11.5858 11.5858 11.25 12 11.25M12.75 12C12.75 11.5858 12.4142 11.25 12 11.25M12.75 12H16.5M12 11.25V6.5M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "logout": "<path d=\"M12 12H21M21 12L18.5 9.5M21 12L18.5 14.5M15 8.5V8.4C15 6.15016 15 5.02524 14.4271 4.23664C14.242 3.98196 14.018 3.75799 13.7634 3.57295C12.9748 3 11.8498 3 9.6 3H8.4C6.15016 3 5.02524 3 4.23664 3.57295C3.98196 3.75799 3.75799 3.98196 3.57295 4.23664C3 5.02524 3 6.15016 3 8.4V15.6C3 17.8498 3 18.9748 3.57295 19.7634C3.75799 20.018 3.98196 20.242 4.23664 20.4271C5.02524 21 6.15016 21 8.4 21H9.6C11.8498 21 12.9748 21 13.7634 20.4271C14.018 20.242 14.242 20.018 14.4271 19.7634C15 18.9748 15 17.8498 15 15.6V15.5\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "plus": "<path d=\"M12 20V12M12 12V4M12 12H20M12 12H4\" stroke=\"currentColor\" stroke-opacity=\"0.18\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "search": "<path d=\"M21 21L17.5967 17.5963M20.0385 11.5202C20.0385 16.2258 16.2243 20.0405 11.5192 20.0405C6.8142 20.0405 3 16.2258 3 11.5202C3 6.81464 6.8142 3 11.5192 3C16.2243 3 20.0385 6.81464 20.0385 11.5202Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>",
  "arrow": "<path d=\"M4 12H20M20 12L17 9M20 12L17 15\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "back": "<path d=\"M20 12H4M4 12L7 9M4 12L7 15\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "trophy": "<path d=\"M17.8162 5.38891V5.38891C17.9154 4.10028 16.8965 3 15.604 3H8.39597C7.10353 3 6.08464 4.10028 6.18376 5.38891V5.38891M17.8162 5.38891L17.3835 11.0147C17.1671 13.8278 14.8214 16 12 16V16M17.8162 5.38891V5.38891C19.7681 5.38891 21.2744 7.10607 21.0201 9.04128L20.9259 9.75862C20.6822 11.6133 19.1014 13 17.2308 13V13M6.18376 5.38891L6.61652 11.0147C6.83291 13.8278 9.17862 16 12 16V16M6.18376 5.38891V5.38891C4.23192 5.38891 2.72561 7.10607 2.97987 9.04128L3.07412 9.75862C3.31781 11.6133 4.8986 13 6.76923 13V13M12 16V18M12 18L14.2138 19.3283C15.2031 19.9218 15.6977 20.2186 15.6948 20.505C15.6939 20.5922 15.6703 20.6777 15.6262 20.7529C15.4813 21 14.9044 21 13.7507 21H10.2493C9.09558 21 8.51872 21 8.37384 20.7529C8.32973 20.6777 8.30606 20.5922 8.30518 20.505C8.30229 20.2186 8.79694 19.9218 9.78624 19.3283L12 18Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/>\n<path d=\"M11.1929 7.38529C11.5024 6.75823 11.6571 6.4447 11.8897 6.3921C11.9623 6.37567 12.0377 6.37567 12.1103 6.3921C12.3429 6.4447 12.4976 6.75823 12.8071 7.38529L12.8722 7.51718C12.9631 7.7015 13.0086 7.79367 13.082 7.85868C13.1061 7.8801 13.1323 7.89913 13.1602 7.9155C13.2447 7.96518 13.3464 7.97996 13.5498 8.00952L13.6954 8.03067C14.3874 8.13122 14.7334 8.1815 14.8552 8.3864C14.8933 8.4504 14.9166 8.52209 14.9234 8.59624C14.9452 8.83365 14.6949 9.0777 14.1941 9.56579L14.0888 9.66846C13.9416 9.81193 13.868 9.88367 13.8289 9.97354C13.816 10.0031 13.806 10.0339 13.799 10.0655C13.7779 10.1612 13.7952 10.2625 13.83 10.4651L13.8548 10.61C13.9731 11.2992 14.0322 11.6438 13.875 11.8231C13.8259 11.8791 13.7649 11.9234 13.6965 11.9528C13.4774 12.0469 13.1679 11.8842 12.549 11.5588L12.4188 11.4904C12.2369 11.3947 12.1459 11.3469 12.0483 11.3374C12.0162 11.3343 11.9838 11.3343 11.9517 11.3374C11.8541 11.3469 11.7631 11.3947 11.5812 11.4904L11.451 11.5588C10.8321 11.8842 10.5226 12.0469 10.3035 11.9528C10.2351 11.9234 10.1741 11.8791 10.125 11.8231C9.96784 11.6438 10.0269 11.2992 10.1452 10.61L10.17 10.4651C10.2048 10.2625 10.2221 10.1612 10.201 10.0655C10.194 10.0339 10.184 10.0031 10.1711 9.97354C10.132 9.88367 10.0584 9.81193 9.91118 9.66846L9.80585 9.56579C9.30512 9.0777 9.05475 8.83365 9.07658 8.59624C9.0834 8.52209 9.10669 8.4504 9.14476 8.3864C9.26665 8.1815 9.61265 8.13122 10.3046 8.03067L10.4502 8.00952C10.6536 7.97996 10.7553 7.96518 10.8398 7.9155C10.8677 7.89913 10.8939 7.8801 10.918 7.85868C10.9914 7.79367 11.0369 7.70151 11.1278 7.51718L11.1929 7.38529Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/>"
};
  const icon = /* สร้าง SVG ของไอคอนที่ต้องการ */ (name) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.list}</svg>`;
  const dateLabel = /* แสดงวันที่เป็นภาษาไทย */ (date) => {
    const value = new Date(`${date}T00:00:00+07:00`);
    return Number.isFinite(value.getTime()) ? value.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' }) : date;
  };
  const schoolLabel = /* เลือกชื่อย่อสถาบันสำหรับหน้าจอ */ (name) => {
    const school = state.me.schools.find(/* ค้นหารายการแรกที่ตรงตามเงื่อนไขในระบบกีฬา */ (s) => s.nameTh === name);
    return school?.thaiAbbr || school?.abbr || name;
  };
  let renderId = 0;
  const esc = /* แปลงอักขระพิเศษก่อนแสดงข้อมูลเป็น HTML */ (v) => String(v ?? '').replace(/[&<>"']/g, /* ทำงานต่อภายใน Stringv.replace ของระบบกีฬา */ (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const admin = /* ตรวจหรือบังคับสิทธิ์แอดมินตามบริบท */ () => state.me?.user.role === 'admin';
  const can = /* ตรวจสิทธิ์ของผู้ใช้ก่อนทำงาน */ (sportId, permission) => admin() || state.me.assignments.some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในระบบกีฬา */ (a) => a.sport_id === sportId && a.permission === permission);
  const status = { draft: 'ฉบับร่าง', pending: 'รอตรวจ', returned: 'ส่งกลับแก้ไข', approved: 'อนุมัติแล้ว' };
  const permission = { technician: 'ฝ่ายเทคนิค (กรอกผล)', reviewer: 'ผู้ตรวจ (อนุมัติผล)' };
  const actions = { created: 'สร้างรายการ', edited: 'แก้ไขผล', submitted: 'ส่งตรวจ', returned: 'ส่งกลับแก้ไข', approved: 'อนุมัติและเผยแพร่', withdrawn: 'ถอนผลเผยแพร่', login: 'เข้าสู่ระบบ', user_created: 'สร้างบัญชี', user_updated: 'เปลี่ยนสิทธิ์บัญชี', password_reset: 'รีเซ็ตรหัสผ่าน', password_changed: 'เปลี่ยนรหัสผ่าน', password_reset_cli: 'รีเซ็ตรหัสผ่านจากเซิร์ฟเวอร์' };
  const go = /* เปลี่ยนเส้นทางภายในระบบ */ (path) => { location.hash = `#${path}`; };
  const option = /* สร้างตัวเลือกพร้อมระบุค่าที่เลือกอยู่ */ (value, label, selected) => `<option value="${esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${esc(label)}</option>`;
  const sportOptions = /* สร้างตัวเลือกกีฬาตามสิทธิ์ */ (list, selected) => list.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (s) => option(s.id, `${s.code} ${s.name}`, selected)).join('');
  const badge = /* สร้างป้ายสถานะสำหรับแสดงบนหน้าจอ */ (s) => `<span class="badge ${esc(s)}">${status[s] || esc(s)}</span>`;
  // แสดงข้อความแจ้งผลการทำงาน
  function message(text, error = false) {
    notice.textContent = text;
    notice.className = error ? 'error' : '';
    notice.setAttribute('role', error ? 'alert' : 'status');
    if (error) notice.scrollIntoView({ block: 'nearest' });
  }
  // ส่งคำขอไปยัง API และจัดการข้อผิดพลาด
  async function api(method, path, data) {
    let res;
    try {
      res = await fetch(path, { method, credentials: 'same-origin', headers: { 'X-Requested-With': 'fetch', 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(30000) });
    } catch { throw new Error('เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่'); }
    const body = await res.json();
    if (!res.ok) {
      if (res.status === 401 && path !== '/api/login') { state.me = null; go('/login'); }
      throw new Error(body.error || 'เกิดข้อผิดพลาด');
    }
    return body;
  }
  // อ่านค่าฟอร์มเป็นออบเจ็กต์
  function formObject(form) { return Object.fromEntries(new FormData(form)); }
  // ผูกการส่งฟอร์มและป้องกันการกดซ้ำระหว่างบันทึก
  function bindForm(form, handler) {
    form.addEventListener('submit', /* ตอบสนองเหตุการณ์ 'submit' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ async (event) => {
      event.preventDefault();
      if (form.dataset.busy) return;
      form.dataset.busy = '1';
      const buttons = [...form.querySelectorAll('button')];
      const disabled = buttons.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (b) => b.disabled);
      buttons.forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในระบบกีฬา */ (b) => { b.disabled = true; });
      try { await handler(form); }
      catch (err) { message(err.message, true); }
      finally { delete form.dataset.busy; buttons.forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในระบบกีฬา */ (b, i) => { b.disabled = disabled[i]; }); }
    });
  }
  // ซิงก์บัญชีและหน้าปัจจุบันให้โครงเมนู
  function shell(path) {
    document.body.dataset.auth = state.me ? 'true' : 'false';
    const roleLabel = admin() ? 'แอดมินกลาง' : state.me?.assignments.every(/* ตรวจว่าทุกรายการผ่านเงื่อนไขในระบบกีฬา */ (a) => a.permission === 'reviewer') ? 'ผู้ตรวจผลการแข่งขัน' : 'ฝ่ายเทคนิคกีฬา';
    const assigned = state.me?.sports.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในระบบกีฬา */ (s) => state.me.assignments.some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในระบบกีฬา */ (a) => a.sport_id === s.id)) || [];
    window.dispatchEvent(new CustomEvent('results:shell', { detail: {
      path, user: state.me?.user || null, roleLabel,
      scope: state.me ? (admin() ? 'ทุกชนิดกีฬา' : assigned.length === 1 ? assigned[0].name : `${assigned.length} กีฬาที่รับผิดชอบ`) : '',
    } }));
  }
  window.ResultsPortal = { logout: /* ยุติการเข้าสู่ระบบและนำกลับหน้าล็อกอิน */ async () => {
    await api('POST', '/api/logout'); state.me = null;
    message('ออกจากระบบแล้ว'); go('/login');
  } };
  // ใช้คลาสปุ่มและช่องกรอกของ admin-ui โดยตรง ทุกครั้งที่เปลี่ยนเนื้อหาหรือกรองรายการ
  // ใช้รูปแบบปุ่มและช่องกรอกร่วมกับหลังบ้านหลัก
  function applyAdminControls() {
    main.querySelectorAll('button, a.button').forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในระบบกีฬา */ (button) => {
      if (button.closest('.workflow-tabs') || button.matches('[data-remove]')) return;
      button.classList.add('admin-button');
      if (button.matches('.primary,.approve')) button.classList.add('admin-button-primary');
    });
    main.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]),select,textarea').forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในระบบกีฬา */ (input) => input.classList.add('admin-field'));
  }
  new MutationObserver(applyAdminControls).observe(main, { childList: true, subtree: true });
  // แสดงฟอร์มและจัดการการเข้าสู่ระบบ
  function login() {
    main.innerHTML = `<div class="login-brand"><img src="/site/assets/images/logo.png" alt=""><strong>ปทุมวันเกมส์ ครั้งที่ 50</strong><small>ระบบจัดการผลการแข่งขัน</small></div><form class="panel narrow login-form"><h1>เข้าสู่ระบบ</h1><p class="intro">สำหรับฝ่ายเทคนิคกีฬาและผู้ตรวจผลการแข่งขัน</p>
      <label for="username">ชื่อผู้ใช้</label><input id="username" name="username" autocomplete="username" maxlength="50" required>
      <label for="password">รหัสผ่าน</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="128" required>
      <div class="actions"><button class="primary">เข้าสู่ระบบ</button></div></form>`;
    bindForm(main.querySelector('form'), /* ประมวลผลข้อมูลเมื่อส่งฟอร์มในระบบกีฬา */ async (form) => {
      state.me = await api('POST', '/api/login', formObject(form));
      message('เข้าสู่ระบบแล้ว');
      go(state.me.user.mustChange ? '/password' : '/matches');
    });
  }
  // แสดงฟอร์มเปลี่ยนรหัสผ่าน
  function password() {
    main.innerHTML = `<h1>เปลี่ยนรหัสผ่าน</h1><p class="intro">${state.me.user.mustChange ? 'ต้องตั้งรหัสผ่านใหม่ก่อนเริ่มใช้งาน' : 'รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร มีทั้งตัวอักษรอังกฤษและตัวเลข'}</p>
      <form class="panel narrow"><label>รหัสผ่านปัจจุบัน<input name="current" type="password" autocomplete="current-password" required maxlength="128"></label>
      <label>รหัสผ่านใหม่<input name="next" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></label>
      <label>ยืนยันรหัสผ่านใหม่<input name="confirm" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></label>
      <div class="actions"><button class="primary">บันทึกรหัสผ่าน</button></div></form>`;
    bindForm(main.querySelector('form'), /* ประมวลผลข้อมูลเมื่อส่งฟอร์มในระบบกีฬา */ async (form) => {
      const data = formObject(form);
      if (data.next !== data.confirm) throw new Error('รหัสผ่านใหม่ไม่ตรงกัน');
      await api('POST', '/api/password', data);
      state.me = await api('GET', '/api/me');
      message('เปลี่ยนรหัสผ่านแล้ว'); go('/matches');
    });
  }
  // แสดงการตั้งค่าของระบบกีฬา
  function settings() {
    let size = Number(localStorage.getItem('pw50-admin:text-size')) || 20;
    if (![20,22,24].includes(size)) size = 20;
    main.innerHTML = `<h1>ตั้งค่า (Settings)</h1><p class="intro">ปรับการอ่านและดูแลบัญชีของคุณ</p>
      <section class="panel"><h2>ขนาดตัวอักษร</h2><p class="muted">ใช้กับเมนู ตาราง และฟอร์มแก้ไข บันทึกเฉพาะเบราว์เซอร์นี้</p><form id="display-settings"><label>เลือกขนาด<select name="size">${[20,22,24].map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (value) => option(value, `${value === 20 ? 'มาตรฐาน' : value === 22 ? 'ใหญ่' : 'ใหญ่มาก'} · ${value}px`, size)).join('')}</select></label><div class="actions"><button class="primary">บันทึกการแสดงผล</button></div></form></section>
      <section class="panel"><h2>บัญชีของคุณ</h2><p>${esc(state.me.user.display_name)}</p><p class="muted">ชื่อผู้ใช้: ${esc(state.me.user.username)}</p><a class="button" href="#/password">เปลี่ยนรหัสผ่าน</a></section>`;
    bindForm(main.querySelector('#display-settings'), /* ประมวลผลข้อมูลเมื่อส่งฟอร์มในระบบกีฬา */ async (form) => {
      const next = Number(formObject(form).size);
      if (![20,22,24].includes(next)) throw new Error('ขนาดตัวอักษรไม่ถูกต้อง');
      localStorage.setItem('pw50-admin:text-size', String(next));
      document.documentElement.style.fontSize = `${next}px`;
      message('บันทึกขนาดตัวอักษรแล้ว');
    });
  }
  // จัดการตารางแข่งขันรายวัน ตัวกรอง และการส่งออกข้อมูล
  async function schedule(current) {
    const { matches: rows } = await api('GET', '/api/matches');
    if (current !== renderId) return;
    const sports = state.me.sports.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในระบบกีฬา */ (s) => admin() || state.me.assignments.some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในระบบกีฬา */ (a) => a.sport_id === s.id));
    const dates = [...new Set(rows.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (r) => r.date))].sort();
    main.innerHTML = `<div class="page-heading"><div><span class="eyebrow">เตรียมรายการก่อนวันแข่งขัน</span><h1>ตารางแข่งขันรายวัน</h1><p class="intro">จัดเวลาและประเภทไว้ล่วงหน้า เมื่อแข่งขันเสร็จให้เลือกรายการเพื่อกรอกผล</p></div><div class="actions"><button id="export-schedule" type="button">ส่งออก Excel (CSV)</button>${sports.some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในระบบกีฬา */ (s) => can(s.id,'technician')) ? '<a class="button primary" href="#/new">เพิ่มการแข่งขัน / กิจกรรม</a>' : ''}</div></div>
      <p class="muted">ตารางภายในสำหรับเจ้าหน้าที่ ผลจะขึ้นเว็บไซต์หลังผู้ตรวจอนุมัติเท่านั้น</p>
      <div class="toolbar"><label>ค้นหา<input id="schedule-query" type="search" placeholder="รายการ ประเภท รอบ หรือสนาม"></label><label>วันแข่งขัน<select id="schedule-date"><option value="">ทุกวัน</option>${dates.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (d) => option(d,dateLabel(d))).join('')}</select></label><label>กีฬา<select id="schedule-sport"><option value="">ทุกกีฬาที่มีสิทธิ์</option>${sportOptions(sports)}</select></label></div><div id="schedule-list" aria-live="polite"></div>`;
    let filtered = [];
    const timeRange = /* สร้างข้อความช่วงเวลาเริ่มและสิ้นสุด */ (r) => `${r.time || 'รอระบุเวลา'}${r.endTime ? '–' + r.endTime : ''}`;
    // วาดตารางหรือรายการใหม่ตามตัวกรอง
    function draw() {
      const q = main.querySelector('#schedule-query').value.trim().toLowerCase();
      const date = main.querySelector('#schedule-date').value;
      const sport = main.querySelector('#schedule-sport').value;
      filtered = rows.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในระบบกีฬา */ (r) => (!date || r.date === date) && (!sport || String(r.sportId) === sport) && (!q || [r.code,r.name,r.category,r.round,r.stadium,r.note].join(' ').toLowerCase().includes(q))).sort(/* เปรียบเทียบรายการเพื่อจัดลำดับในระบบกีฬา */ (a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.code.localeCompare(b.code));
      main.querySelector('#export-schedule').disabled = !filtered.length;
      main.querySelector('#schedule-list').innerHTML = filtered.length ? [...new Set(filtered.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (r) => r.date))].map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (date) => `<section class="schedule-day"><h2>${esc(dateLabel(date))}</h2><div class="table-wrap"><table><thead><tr><th>เวลา</th><th>รายการ / กิจกรรม</th><th>ประเภท / รอบ</th><th>สนาม</th><th>ดำเนินการ</th></tr></thead><tbody>${filtered.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในระบบกีฬา */ (r) => r.date === date).map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (r) => `<tr><td class="schedule-time">${esc(timeRange(r))}</td><td><strong>${esc(r.name)}</strong><small class="event-meta">${esc(r.sport)} · ${esc(r.code)}${r.kind === 'activity' ? ' · กิจกรรม' : ''}</small>${r.note ? `<small class="event-meta">${esc(r.note)}</small>` : ''}</td><td>${esc(r.category || '—')}<small class="event-meta">${esc(r.round)}${r.group ? ' · ' + esc(r.group) : ''}</small></td><td>${esc(r.stadium || 'รอระบุสนาม')}</td><td><a class="button" href="#/matches/${r.id}${can(r.sportId,'technician') && ['draft','returned'].includes(r.status) ? '/edit' : ''}">${r.kind === 'activity' ? 'ดู / แก้ไข' : can(r.sportId,'technician') && ['draft','returned'].includes(r.status) ? 'กรอกผล / แก้ไข' : 'ดูรายการ'}</a></td></tr>`).join('')}</tbody></table></div></section>`).join('') : '<div class="empty"><h2>ยังไม่มีรายการตามตัวกรองนี้</h2><p>เพิ่มการแข่งขันหรือกิจกรรม หรือเปลี่ยนตัวกรอง</p></div>';
    }
    main.querySelector('.toolbar').addEventListener('input', draw);
    main.querySelector('#export-schedule').addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => {
      // Prefix spreadsheet formula characters before CSV quoting.
      const cell = /* จัดรูปแบบค่าแต่ละช่องก่อนแสดงหรือส่งออก */ (value) => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"','""') + '"';
      const records = [['วันที่ (ค.ศ.)','เวลาเริ่ม','เวลาสิ้นสุด','กีฬา','รหัส','ลักษณะ','รายการ','ประเภท','ระดับ','รอบ','กลุ่ม','สนาม','หมายเหตุ'], ...filtered.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (r) => [r.date,r.time,r.endTime,r.sport,r.code,r.kind === 'activity' ? 'กิจกรรม' : 'การแข่งขัน',r.name,r.category,r.level === 'p' ? 'ประถม' : 'มัธยม',r.round,r.group,r.stadium,r.note])];
      const url = URL.createObjectURL(new Blob(['\uFEFF' + records.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'ตารางแข่งขัน.csv'; document.body.append(link); link.click(); link.remove(); setTimeout(/* ทำงานภายหลังตามเวลาที่กำหนดในระบบกีฬา */ () => URL.revokeObjectURL(url), 1000);
    });
    draw();
  }
  // อ่านหรือแสดงรายการแข่งขันตามบริบทของส่วนนี้
  async function matches(current) {
    const data = await api('GET', '/api/matches');
    if (current !== renderId) return;
    const sports = state.me.sports.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในระบบกีฬา */ (s) => admin() || state.me.assignments.some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในระบบกีฬา */ (a) => a.sport_id === s.id));
    const writable = sports.some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในระบบกีฬา */ (s) => can(s.id, 'technician'));
    const needsWork = /* ตรวจรายการที่ฝ่ายเทคนิคยังต้องดำเนินการ */ (r) => r.kind !== 'activity' && can(r.sportId, 'technician') && ['draft','returned'].includes(r.status);
    const queues = [...(writable ? [['work', 'ต้องดำเนินการ', data.matches.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในระบบกีฬา */ (r) => r.kind !== 'activity').filter(needsWork).length]] : []),
      ['pending', 'รอตรวจ', data.matches.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในระบบกีฬา */ (r) => r.status === 'pending').length],
      ['approved', 'อนุมัติแล้ว', data.matches.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในระบบกีฬา */ (r) => r.status === 'approved').length],
      ['all', 'ทั้งหมด', data.matches.length]];
    let selected = writable && !admin() ? 'work' : 'pending';
    const dates = [...new Set(data.matches.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (r) => r.date))].sort();
    main.innerHTML = `<div class="page-heading"><div><span class="eyebrow">${admin() ? 'จัดการผลทุกชนิดกีฬา' : 'พื้นที่ทำงานประจำกีฬา'}</span><h1>ผลการแข่งขัน${sports.length === 1 ? ` · ${esc(sports[0].name)}` : ''}</h1><p class="intro">${writable ? 'เลือกนัดที่ต้องดำเนินการ กรอกผล แล้วส่งให้ผู้ตรวจประจำกีฬา' : 'ตรวจสอบคะแนนและเหรียญ ก่อนอนุมัติผลขึ้นเว็บไซต์'}</p></div>
      ${writable ? `<a class="button primary" href="#/new">${icon('plus')}เพิ่มรายการแข่งขัน</a>` : ''}</div>
      ${!sports.length ? '<p class="feedback">ยังไม่ได้รับมอบหมายกีฬา กรุณาติดต่อแอดมินกลาง</p>' : ''}
      <div class="workflow-tabs" role="group" aria-label="กรองสถานะผลการแข่งขัน">${queues.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ ([key,label,count]) => `<button type="button" data-queue="${key}" aria-pressed="${selected === key}">${label}<span class="tab-count">${count}</span></button>`).join('')}</div>
      <div class="toolbar"><label class="search-field"><span>ค้นหารายการแข่งขัน</span><div class="search-box">${icon('search')}<input id="query" type="search" placeholder="ชื่อรายการ รหัสนัด หรือโรงเรียน"></div></label>
      ${sports.length > 1 ? `<label><span>ชนิดกีฬา</span><select id="sport"><option value="">ทุกกีฬาที่มีสิทธิ์</option>${sportOptions(sports)}</select></label>` : ''}
      <label><span>วันที่แข่งขัน</span><select id="date"><option value="">ทุกวันแข่งขัน</option>${dates.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (date) => option(date, dateLabel(date))).join('')}</select></label></div><div id="match-list" aria-live="polite"></div>`;
    // วาดตารางหรือรายการใหม่ตามตัวกรอง
    function draw() {
      const q = main.querySelector('#query').value.trim().toLowerCase();
      const sport = main.querySelector('#sport')?.value || '';
      const date = main.querySelector('#date').value;
      const rows = data.matches.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในระบบกีฬา */ (r) => r.kind !== 'activity' && (selected === 'all' || (selected === 'work' ? needsWork(r) : r.status === selected)) &&
        (!sport || String(r.sportId) === sport) && (!date || r.date === date) &&
        (!q || [r.code,r.name,r.category,r.round,r.stadium,...r.results.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (e) => `${e.player} ${e.school} ${schoolLabel(e.school)}`)].join(' ').toLowerCase().includes(q)))
        .sort(/* เปรียบเทียบรายการเพื่อจัดลำดับในระบบกีฬา */ (a,b) => (selected === 'work' ? Number(b.status === 'returned') - Number(a.status === 'returned') : 0) || a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      const list = main.querySelector('#match-list');
      if (!rows.length) {
        list.innerHTML = `<div class="empty">${icon('list')}<h2>${selected === 'work' && !q && !date ? 'ไม่มีรายการที่ต้องดำเนินการ' : 'ไม่พบรายการในมุมมองนี้'}</h2><p>${selected === 'work' ? 'ผลที่ส่งตรวจแล้วอยู่ในแท็บ “รอตรวจ” คุณสามารถดูรายการทั้งหมดหรือเพิ่มนัดใหม่ได้' : 'ลองเปลี่ยนวันที่ คำค้น หรือดูรายการทั้งหมด'}</p><button type="button" id="show-all">ดูรายการทั้งหมด</button></div>`;
        list.querySelector('#show-all').addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => { selected = 'all'; main.querySelector('#query').value = ''; main.querySelector('#date').value = ''; const filter = main.querySelector('#sport'); if (filter) filter.value = ''; syncTabs(); draw(); });
        return;
      }
      list.innerHTML = `<div class="list-caption"><span>${rows.length} รายการแข่งขัน</span><span>เวลาแข่งขันเป็นเวลาไทย</span></div><div class="table-wrap"><table class="match-table"><thead><tr><th class="event-column">รายการแข่งขัน</th><th>คู่แข่งขัน / ผล</th><th>วันและเวลา</th><th>สถานะผล</th><th class="match-action">ดำเนินการ</th></tr></thead><tbody>${rows.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (r) => {
        const editable = can(r.sportId, 'technician') && ['draft','returned'].includes(r.status);
        const reviewable = can(r.sportId, 'reviewer') && r.status === 'pending' && r.submittedBy !== state.me.user.id;
        const cta = editable ? (r.status === 'returned' ? 'แก้ไขผล' : 'กรอกผล') : reviewable ? 'ตรวจผล' : r.status === 'pending' ? 'ดูผลที่ส่ง' : 'ดูรายละเอียด';
        return `<tr><td class="event-column"><strong class="event-title">${esc(r.name)}</strong><div class="event-meta">${esc(r.sport)} · ${r.level === 'p' ? 'ประถม' : 'มัธยม'}${r.round ? ` · ${esc(r.round)}` : ''}</div><span class="match-code">${esc(r.code)}</span></td>
          <td><div class="teams">${r.results.slice(0,3).map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (entry) => `<div class="team-line"><span class="team-name" title="${esc(entry.school)}">${esc(schoolLabel(entry.school))}${entry.player ? `<small>${esc(entry.player)}</small>` : ''}</span><strong class="team-score">${esc(entry.result || entry.stat || '–')}</strong></div>`).join('')}${r.results.length > 3 ? `<small>และอีก ${r.results.length - 3} ผู้เข้าแข่งขัน</small>` : ''}</div></td>
          <td class="match-date">${esc(dateLabel(r.date))}<small>${esc(r.time || 'รอระบุเวลา')}${r.time ? ' น.' : ''}</small><small>${esc(r.stadium || 'ยังไม่ระบุสนาม')}</small></td>
          <td>${badge(r.status)}${r.status === 'returned' && r.reviewNote ? `<div class="return-note" title="${esc(r.reviewNote)}">${esc(r.reviewNote.length > 75 ? r.reviewNote.slice(0,75) + '…' : r.reviewNote)}</div>` : `<div class="publication-note">${r.published ? 'เผยแพร่บนเว็บไซต์แล้ว' : 'ยังไม่เผยแพร่'}</div>`}</td>
          <td class="match-action"><a class="button ${editable || reviewable ? 'primary' : ''}" href="#/matches/${r.id}${editable ? '/edit' : ''}">${cta}${icon('arrow')}</a></td></tr>`;
      }).join('')}</tbody></table></div>`;
    }
    // อัปเดตสถานะปุ่มตัวกรองรายการ
    function syncTabs() { main.querySelectorAll('[data-queue]').forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในระบบกีฬา */ (button) => button.setAttribute('aria-pressed', String(button.dataset.queue === selected))); }
    main.querySelector('.workflow-tabs').addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ (event) => {
      const button = event.target.closest('[data-queue]');
      if (button) { selected = button.dataset.queue; syncTabs(); draw(); }
    });
    main.querySelector('.toolbar').addEventListener('input', draw);
    draw();
  }
  // สร้างช่องกรอกผู้เข้าแข่งขันหรือทีมหนึ่งแถว
  function entrant(row = {}) {
    return `<section class="entrant"><div class="entrant-top"><strong>${icon('users')} ผู้เข้าแข่งขัน / ทีม</strong><button type="button" data-remove>ลบผู้เข้าแข่งขัน</button></div><div class="grid">
      <label>โรงเรียน<select name="school" required><option value="">เลือกโรงเรียน</option>${state.me.schools.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (s) => option(s.nameTh, `${s.abbr} · ${s.nameTh}`, row.school)).join('')}</select></label>
      <label>ชื่อผู้เข้าแข่งขัน / ชื่อทีม<input name="player" maxlength="200" value="${esc(row.player)}"></label>
      </div><div class="score-fields"><label>คะแนน / อันดับ<input name="result" maxlength="100" placeholder="–" value="${esc(row.result)}"></label>
      <label>สถิติ<input name="stat" maxlength="100" value="${esc(row.stat)}"></label>
      <label>เหรียญ<select name="medal">${['','ทอง','เงิน','ทองแดง'].map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (v) => option(v, v || 'ไม่ได้เหรียญ', row.medal)).join('')}</select></label>
    </div></section>`;
  }
  // สร้างฟอร์มเพิ่มหรือแก้ไขรายการและผล
  async function editor(id, current) {
    const row = id ? await api('GET', `/api/matches/${id}`) : {};
    if (current !== renderId) return;
    const sports = state.me.sports.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในระบบกีฬา */ (s) => can(s.id, 'technician'));
    if (!sports.length || (id && (!can(row.sportId, 'technician') || row.status === 'pending'))) throw new Error('ไม่มีสิทธิ์แก้ไข หรือรายการกำลังรอตรวจ');
    const field = /* สร้างช่องกรอกพร้อมค่าเริ่มต้นและข้อจำกัด */ (name, title, { type = 'text', required = false, max = 200 } = {}) => `<label>${title}<input name="${name}" type="${type}" value="${esc(row[name])}" ${required ? 'required' : ''} maxlength="${max}" ${name === 'code' && id ? 'readonly' : ''}></label>`;
    main.innerHTML = `<a class="back-link" href="#${id ? `/matches/${id}` : '/matches'}">${icon('back')}กลับ${id ? 'ไปดูรายละเอียด' : 'รายการแข่งขัน'}</a><div class="page-heading"><div><span class="eyebrow">${id ? `${esc(row.code)} · ${esc(row.sport)}` : 'รายการแข่งขันใหม่'}</span><h1>${id ? 'กรอกคะแนนและผลการแข่งขัน' : 'เพิ่มการแข่งขัน / กิจกรรม'}</h1>
      <p class="intro">${id ? esc(row.name) : 'ระบุวัน เวลา และประเภทก่อน สามารถบันทึกตารางไว้แล้วกลับมาเพิ่มผู้เข้าแข่งขันและคะแนนภายหลัง'}</p></div></div>
      ${row.published ? '<p class="feedback">ฉบับอนุมัติเดิมยังแสดงบนเว็บไซต์ การแก้ไขนี้ต้องส่งตรวจและอนุมัติใหม่</p>' : ''}
      ${row.reviewNote ? `<p class="feedback returned"><strong>ผู้ตรวจส่งกลับให้แก้ไข</strong>\n${esc(row.reviewNote)}</p>` : ''}
      <form><details class="panel match-metadata" ${id ? '' : 'open'}><summary><span class="section-label"><span class="section-number">1</span>ข้อมูลการแข่งขัน</span><span class="metadata-toggle">ดู / แก้ไขข้อมูลนัด${icon('arrow')}</span></summary><div class="grid">
      <label>ลักษณะรายการ<select name="kind">${option("competition","การแข่งขัน",row.kind)}${option("activity","กิจกรรม เช่น รายงานตัว / พัก / มอบเหรียญ",row.kind)}</select></label><label>ชนิดกีฬา<select name="sportId" required ${id ? 'disabled' : ''}>${sportOptions(sports, row.sportId)}</select></label>
      ${field('code', 'รหัสการแข่งขัน เช่น FB-01', { required: true, max: 50 })}
      ${field('name', 'ชื่อรายการ', { required: true })}
      <label>ระดับ<select name="level" required>${option('p','ประถม',row.level)}${option('m','มัธยม',row.level)}</select></label>
      ${field('date', 'วันที่แข่งขัน', { type: 'date', required: true })}${field('time', 'เวลาเริ่ม', { type: 'time' })}${field('endTime', 'เวลาสิ้นสุด', { type: 'time' })}
      ${field('category', 'ประเภท เช่น เดี่ยว / คู่ผสม / Shooting')}${field('stadium', 'สนาม')}${field('round', 'รอบ', { max: 100 })}${field('group', 'กลุ่ม', { max: 50 })}${field('note', 'หมายเหตุ เช่น 50 นาที + 1 end', { max: 1000 })}</div></details>
      <fieldset><legend><span class="section-number">2</span> คะแนนและผลการแข่งขัน</legend><p class="intro">ยังไม่ทราบคู่แข่งขันสามารถบันทึกตารางก่อนได้ เมื่อพร้อมให้เพิ่มหนึ่งแถวต่อผู้เข้าแข่งขันหรือทีม กรอกเหรียญเฉพาะนัดที่ตัดสินเหรียญ</p><div id="entrants">${(row.results || []).map(entrant).join('')}</div>
      <button type="button" id="add-row">${icon('plus')}เพิ่มผู้เข้าแข่งขัน / ทีม</button></fieldset>
      <div class="form-footer"><p>บันทึกตารางก่อนได้ แล้วกลับมาเพิ่มผลเมื่อแข่งขันเสร็จ</p><div class="actions"><a class="button" href="#${id ? `/matches/${id}` : '/matches'}">ยกเลิก</a><button class="primary">บันทึกรายการ${icon('arrow')}</button></div></div></form>`;
    const form = main.querySelector('form');
    // ซ่อนและปิดช่องคะแนนเมื่อเลือกรายการเป็นกิจกรรม
    function syncKind() {
      const activity = form.elements.kind.value === 'activity';
      const fieldset = form.querySelector('fieldset');
      fieldset.hidden = activity;
      fieldset.disabled = activity;
    }
    form.elements.kind.addEventListener('change', syncKind);
    syncKind();
    form.querySelector('#add-row').addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => {
      if (form.querySelectorAll('.entrant').length >= 200) return message('เพิ่มได้ไม่เกิน 200 แถว', true);
      form.querySelector('#entrants').insertAdjacentHTML('beforeend', entrant());
      form.querySelector('.entrant:last-child select').focus();
    });
    form.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ (event) => {
      if (!event.target.closest('[data-remove]')) return;
      if (form.querySelectorAll('.entrant').length <= 1) return message('ต้องมีผู้เข้าแข่งขันอย่างน้อย 1 แถว', true);
      event.target.closest('.entrant').remove();
    });
    bindForm(form, /* ประมวลผลข้อมูลเมื่อส่งฟอร์มในระบบกีฬา */ async () => {
      const data = formObject(form);
      data.sportId = id ? row.sportId : Number(data.sportId);
      data.version = row.version;
      data.results = data.kind === 'activity' ? [] : [...form.querySelectorAll('.entrant')].map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (el) => Object.fromEntries([...el.querySelectorAll('input,select')].map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (input) => [input.name, input.value])));
      const saved = await api(id ? 'PUT' : 'POST', id ? `/api/matches/${id}` : '/api/matches', data);
      message('บันทึกรายการแล้ว'); go(data.kind === 'activity' ? '/schedule' : `/matches/${saved.id}`);
    });
  }
  // สร้างรายการประวัติการแก้ไข
  function historyHtml(history) {
    return history.length ? `<ol class="history">${history.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (h) => {
      const snapshot = h.detail.payload || h.detail.published || (Array.isArray(h.detail.results) ? h.detail : null);
      return `<li><strong>${esc(actions[h.action] || h.action)}</strong> · ${esc(h.display_name)}<time>${esc(new Date(`${h.at.replace(' ','T')}Z`).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }))}</time>
      ${h.detail.note ? `<p>${esc(h.detail.note)}</p>` : ''}${h.detail.username ? `<p>บัญชี ${esc(h.detail.username)}</p>` : ''}
      ${snapshot ? `<details><summary>ดูผลที่บันทึกในครั้งนี้</summary><ul>${snapshot.results.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (r) => `<li>${esc(schoolLabel(r.school))} · ${esc(r.player || 'ทีม')} · ผล ${esc(r.result || 'ยังไม่กรอก')}${r.stat ? ` · สถิติ ${esc(r.stat)}` : ''}${r.medal ? ` · เหรียญ${esc(r.medal)}` : ''}</li>`).join('')}</ul></details>` : ''}</li>`;
    }).join('')}</ol>` : '<p class="muted">ยังไม่มีประวัติ</p>';
  }
  // แสดงรายละเอียดผลและคำสั่งส่งตรวจหรืออนุมัติ
  async function detail(id, current) {
    const [row, log] = await Promise.all([api('GET', `/api/matches/${id}`), api('GET', `/api/matches/${id}/history`)]);
    if (current !== renderId) return;
    const edit = can(row.sportId, 'technician') && row.status !== 'pending';
    const submit = row.kind !== 'activity' && row.results.length > 0 && can(row.sportId, 'technician') && ['draft','returned'].includes(row.status);
    const review = can(row.sportId, 'reviewer') && row.status === 'pending' && row.submittedBy !== state.me.user.id;
    main.innerHTML = `<a class="back-link" href="#/matches">${icon('back')}รายการแข่งขัน</a><h1>${esc(row.name)}</h1>
      <p>${esc(row.code)} · ${esc(row.sport)} · ${row.level === 'p' ? 'ประถม' : 'มัธยม'} · ${badge(row.status)}</p>
      <p class="intro">${esc(dateLabel(row.date))} ${esc(row.time)}${row.endTime ? `–${esc(row.endTime)}` : ''} · ${esc(row.category)} · สนาม ${esc(row.stadium || 'ไม่ระบุ')} · รอบ ${esc(row.round || 'ไม่ระบุ')} ${esc(row.group)}</p>${row.note ? `<p>${esc(row.note)}</p>` : ''}
      <p class="feedback">${row.published ? (row.status === 'approved' ? 'เว็บไซต์กำลังแสดงผลฉบับนี้' : 'เว็บไซต์ยังแสดงฉบับอนุมัติเดิม ฉบับที่เห็นด้านล่างยังไม่เผยแพร่') : 'ผลรายการนี้ยังไม่เผยแพร่บนเว็บไซต์'}${row.reviewNote ? `\nข้อความจากผู้ตรวจ: ${esc(row.reviewNote)}` : ''}</p>
      <div class="table-wrap"><table class="results-table"><caption>ผลการแข่งขันที่บันทึกไว้</caption><thead><tr><th>โรงเรียน</th><th>ผู้เข้าแข่งขัน / ทีม</th><th>คะแนน / อันดับ</th><th>สถิติ</th><th>เหรียญ</th></tr></thead><tbody>
      ${row.results.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (r) => `<tr><td>${esc(r.school)}</td><td>${esc(r.player || 'ทีม')}</td><td>${esc(r.result || 'ยังไม่กรอก')}</td><td>${esc(r.stat || '—')}</td><td>${esc(r.medal || '—')}</td></tr>`).join('')}</tbody></table></div>
      <div class="actions">${edit ? `<a class="button" href="#/matches/${id}/edit">${row.kind === 'activity' ? 'แก้ไขกิจกรรม' : 'แก้ไขรายการ / กรอกผล'}</a>` : ''}${submit ? `<button class="primary" id="submit-result">ส่งผลให้ผู้ตรวจ${icon('arrow')}</button>` : ''}</div>
      ${row.status === 'pending' && row.submittedBy === state.me.user.id ? '<p class="muted">รอผู้ตรวจอีกบัญชีตรวจผล ผู้ส่งไม่สามารถอนุมัติผลของตนเองได้</p>' : ''}
      ${review ? `<section class="panel"><h2>ตรวจผลการแข่งขัน</h2><form id="review-form"><label>หมายเหตุ / เหตุผลส่งกลับ<textarea name="note" maxlength="1000"></textarea></label>
      <label>ผลการตรวจ<select name="action"><option value="approve">อนุมัติและเผยแพร่</option><option value="return">ส่งกลับให้แก้ไข</option></select></label>
      <label class="check"><input name="confirmed" type="checkbox" required>ตรวจสอบผลและเหรียญครบแล้ว</label><div class="actions"><button class="approve">ยืนยันผลการตรวจ</button></div></form></section>` : ''}
      ${can(row.sportId, 'reviewer') && row.published ? `<details class="panel"><summary>ถอนผลออกจากเว็บไซต์</summary><p>ผลและเหรียญของรายการนี้จะถูกนำออกจากเว็บไซต์เมื่อข้อมูลอัปเดต</p><form id="withdraw-form"><label>เหตุผลถอนผล<textarea name="note" required maxlength="1000"></textarea></label>
      <label class="check"><input type="checkbox" required>ยืนยันการถอนผลเผยแพร่</label><div class="actions"><button class="danger">ถอนผลเผยแพร่</button></div></form></details>` : ''}
      <section class="panel"><h2>ประวัติรายการ</h2>${historyHtml(log.history)}</section>`;
    const reload = /* โหลดรายการล่าสุดหลังดำเนินการสำเร็จ */ async (text) => { message(text); await render(); };
    main.querySelector('#submit-result')?.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try { await api('POST', `/api/matches/${id}/submit`, { version: row.version }); await reload('ส่งตรวจแล้ว'); }
      catch (err) { message(err.message, true); button.disabled = false; }
    });
    const reviewForm = main.querySelector('#review-form');
    if (reviewForm) bindForm(reviewForm, /* ประมวลผลข้อมูลเมื่อส่งฟอร์มในระบบกีฬา */ async (form) => {
      await api('POST', `/api/matches/${id}/review`, { ...formObject(form), version: row.version }); await reload('บันทึกผลการตรวจแล้ว');
    });
    const withdrawForm = main.querySelector('#withdraw-form');
    if (withdrawForm) bindForm(withdrawForm, /* ประมวลผลข้อมูลเมื่อส่งฟอร์มในระบบกีฬา */ async (form) => {
      await api('POST', `/api/matches/${id}/withdraw`, { ...formObject(form), version: row.version }); await reload('ถอนผลเผยแพร่แล้ว');
    });
  }
  // สร้างแถวเลือกกีฬาและสิทธิ์
  function assignmentRow(a = {}) {
    return `<div class="assignment"><label>ชนิดกีฬา<select data-sport required>${sportOptions(state.me.sports, a.sport_id)}</select></label>
      <label>หน้าที่<select data-permission>${Object.entries(permission).map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ ([v,l]) => option(v,l,a.permission)).join('')}</select></label><button type="button" data-remove-assignment>ลบสิทธิ์</button></div>`;
  }
  // อ่านค่าการมอบหมายกีฬาจากฟอร์ม
  function assignmentData(form) {
    return [...form.querySelectorAll('.assignment')].map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (el) => ({ sport_id: Number(el.querySelector('[data-sport]').value), permission: el.querySelector('[data-permission]').value }));
  }
  // ผูกปุ่มเพิ่มและลบแถวการมอบหมายกีฬา
  function bindAssignments(form) {
    form.querySelector('[data-add-assignment]').addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => {
      form.querySelector('[data-assignments]').insertAdjacentHTML('beforeend', assignmentRow());
    });
    form.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ (event) => { if (event.target.closest('[data-remove-assignment]')) event.target.closest('.assignment').remove(); });
  }
  // แสดงข้อมูลบัญชีที่ระบบสร้างหรือรีเซ็ต
  function credentials(data) {
    const box = document.getElementById('credentials');
    box.innerHTML = `<h2>รหัสผ่านชั่วคราว</h2><p>ชื่อผู้ใช้: <strong>${esc(data.username)}</strong><br>รหัสผ่าน: <strong>${esc(data.password)}</strong></p><p>คัดลอกส่งให้เจ้าของบัญชีโดยตรง ต้องเปลี่ยนรหัสผ่านเมื่อเข้าครั้งแรก</p><button type="button" id="hide-password">ซ่อนรหัสผ่าน</button>`;
    box.hidden = false;
    box.querySelector('button').addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => { box.replaceChildren(); box.hidden = true; });
    box.scrollIntoView({ block: 'center' });
  }
  // แสดงฟอร์มและตารางจัดการผู้ใช้
  async function users(current) {
    if (!admin()) throw new Error('เฉพาะแอดมินกลาง');
    const data = await api('GET', '/api/users');
    if (current !== renderId) return;
    main.innerHTML = `<h1>บัญชีและสิทธิ์กีฬา</h1><p class="intro">หนึ่งบัญชีรับผิดชอบได้หลายกีฬา แต่ในกีฬาเดียวกันเลือกได้หนึ่งหน้าที่ เพื่อแยกผู้กรอกและผู้ตรวจ</p>
      <section id="credentials" class="feedback" hidden></section>
      <details class="panel"><summary>+ สร้างบัญชีเจ้าหน้าที่</summary><form id="new-user"><div class="grid">
      <label>ชื่อผู้ใช้ (อังกฤษ / ตัวเลข)<input name="username" required minlength="3" maxlength="50" pattern="[a-zA-Z0-9._-]{3,50}" autocomplete="off"></label>
      <label>ชื่อ–นามสกุล<input name="display_name" required maxlength="150" placeholder="เช่น สมชาย ใจดี" autocomplete="name"></label></div>
      <fieldset><legend>กีฬาที่มอบหมาย</legend><div data-assignments>${assignmentRow()}</div><button type="button" data-add-assignment>+ เพิ่มกีฬา</button></fieldset>
      <button class="primary">สร้างบัญชีและรหัสผ่าน</button></form></details>
      <div id="users-list">${data.users.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (u) => `<details class="panel"><summary>${esc(u.display_name)} (${esc(u.username)}) · ${u.role === 'admin' ? 'แอดมินกลาง' : u.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</summary>
        ${u.role === 'admin' ? '<p>บัญชีแอดมินกลางจัดการได้ทุกกีฬา</p>' : `<form data-user="${u.id}"><label>ชื่อ–นามสกุล<input name="display_name" required maxlength="150" value="${esc(u.display_name)}" autocomplete="name"></label><fieldset><legend>สิทธิ์กีฬา</legend><div data-assignments>${u.assignments.map(assignmentRow).join('')}</div><button type="button" data-add-assignment>+ เพิ่มกีฬา</button></fieldset>
        <label class="check"><input name="active" type="checkbox" ${u.active ? 'checked' : ''}>เปิดใช้งานบัญชี</label><p class="muted">เมื่อบันทึก เจ้าของบัญชีต้องเข้าสู่ระบบใหม่เพื่อใช้สิทธิ์ล่าสุด</p>
        <div class="actions"><button class="primary">บันทึกสิทธิ์</button><button type="button" data-reset="${u.id}">รีเซ็ตรหัสผ่าน</button></div></form>`}</details>`).join('')}</div>`;
    const newForm = main.querySelector('#new-user');
    bindAssignments(newForm);
    bindForm(newForm, /* ประมวลผลข้อมูลเมื่อส่งฟอร์มในระบบกีฬา */ async (form) => {
      const saved = await api('POST', '/api/users', { ...formObject(form), assignments: assignmentData(form) });
      await render(); credentials(saved); message('สร้างบัญชีแล้ว');
    });
    main.querySelectorAll('[data-user]').forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในระบบกีฬา */ (form) => {
      bindAssignments(form);
      bindForm(form, /* ประมวลผลข้อมูลเมื่อส่งฟอร์มในระบบกีฬา */ async () => {
        await api('PUT', `/api/users/${form.dataset.user}`, { display_name: form.elements.display_name.value, active: form.elements.active.checked, assignments: assignmentData(form) });
        message('บันทึกสิทธิ์แล้ว'); await render();
      });
      form.querySelector('[data-reset]').addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ async (event) => {
        const button = event.target;
        button.disabled = true;
        try { credentials(await api('POST', `/api/users/${button.dataset.reset}/reset`)); message('รีเซ็ตรหัสผ่านแล้ว รหัสผ่านเดิมใช้ไม่ได้'); }
        catch (err) { message(err.message, true); }
        finally { button.disabled = false; }
      });
    });
  }
  // แสดงหน้าจอจากข้อมูลและสถานะปัจจุบัน
  async function render() {
    const current = ++renderId;
    let path = location.hash.slice(1) || '/matches';
    if (!state.me) path = '/login';
    else if (state.me.user.mustChange) path = '/password';
    else if (path === '/login') path = '/matches';
    if (location.hash !== `#${path}`) history.replaceState(null, '', `#${path}`);
    shell(path);
    main.innerHTML = '<div class="loading-skeleton" role="status">กำลังโหลดข้อมูล…</div>';
    try {
      if (path === '/login') login();
      else if (path === '/password') password();
      else if (path === '/settings') settings();
      else if (path === '/schedule') await schedule(current);
      else if (path === '/matches') await matches(current);
      else if (path === '/new') await editor(null, current);
      else if (/^\/matches\/\d+\/edit$/.test(path)) await editor(Number(path.split('/')[2]), current);
      else if (/^\/matches\/\d+$/.test(path)) await detail(Number(path.split('/')[2]), current);
      else if (path === '/users') await users(current);
      else if (path === '/audit') {
        if (!admin()) throw new Error('เฉพาะแอดมินกลาง');
        const data = await api('GET', '/api/audit');
        if (current === renderId) main.innerHTML = `<h1>ประวัติการใช้งาน</h1><p class="intro">500 เหตุการณ์ล่าสุด เวลาไทย</p>${historyHtml(data.history)}`;
      } else main.innerHTML = '<h1>ไม่พบหน้า</h1><a href="#/matches">กลับรายการแข่งขัน</a>';
    } catch (err) {
      if (current === renderId) { main.innerHTML = '<h1>โหลดข้อมูลไม่สำเร็จ</h1><p>กลับรายการแข่งขันเพื่อโหลดข้อมูลล่าสุด หรือลองอีกครั้ง</p><a href="#/matches">กลับรายการแข่งขัน</a>'; message(err.message, true); }
    }
  }
  window.addEventListener('hashchange', /* ตอบสนองเหตุการณ์ 'hashchange' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => { message(''); render(); });
  (/* เริ่มต้นระบบกีฬาและจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ async () => {
    try { state.me = await api('GET', '/api/me'); } catch { state.me = null; }
    render();
  })();
})();
