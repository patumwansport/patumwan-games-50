// ส่วนประกอบที่ใช้ร่วมกันทุกหน้า: header, เมนู, footer, โหมดมืด และ helper สำหรับสร้าง UI
(/* เริ่มต้นเว็บไซต์และจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ function () {
  const cfg = window.SiteConfig;

  // ---------- helpers ----------
  const esc = /* แปลงอักขระพิเศษก่อนแสดงข้อมูลเป็น HTML */ (v) =>
    String(v ?? '').replace(/[&<>"']/g, /* ทำงานต่อภายใน Stringv.replace ของเว็บไซต์ */ (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const qs = /* ค้นหาองค์ประกอบในหน้าเว็บด้วยตัวเลือก CSS */ (name) => new URLSearchParams(location.search).get(name);

  // ---------- ความปลอดภัย ----------
  // ลิงก์/รูปจาก API หรือไฟล์ข้อมูล: อนุญาตเฉพาะ http(s), mailto, tel และ path ภายในเว็บ
  // กัน javascript:, data:, vbscript: ที่ใช้ฝังสคริปต์ (XSS) คืนค่าที่ escape แล้ว พร้อมใส่ใน attribute
  const SAFE_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];
  // ตรวจ URL และอนุญาตเฉพาะรูปแบบลิงก์ที่ปลอดภัย
  function safeUrl(v) {
    const raw = String(v ?? '').trim();
    if (!raw) return '';
    try {
      const u = new URL(raw, location.href);
      const local = !/^[a-z][a-z0-9+.-]*:/i.test(raw) && !raw.startsWith('//');
      return local || SAFE_SCHEMES.includes(u.protocol) ? esc(raw) : '';
    } catch {
      return '';
    }
  }

  // iframe ฝังได้เฉพาะ YouTube, Google Maps และวิดีโอ Google Drive (ต้องตรงกับ frame-src ใน CSP)
  const EMBED_HOSTS = ['www.youtube.com', 'www.youtube-nocookie.com', 'www.google.com', 'maps.google.com', 'drive.google.com'];
  // ตรวจโดเมนก่อนนำ URL ไปฝังใน iframe
  function embedUrl(v) {
    try {
      const u = new URL(String(v ?? '').trim());
      return u.protocol === 'https:' && EMBED_HOSTS.includes(u.hostname) ? esc(u.href) : '';
    } catch {
      return '';
    }
  }

  // ลิงก์เปิดแท็บใหม่ต้องมี rel นี้เสมอ (กันหน้าปลายทางควบคุมแท็บเดิม: reverse tabnabbing)
  const NEW_TAB = 'target="_blank" rel="noopener noreferrer"';

  // กันเว็บอื่นฝังหน้านี้ใน iframe เพื่อหลอกให้กด (clickjacking)
  // (meta CSP ใช้ frame-ancestors ไม่ได้ ถ้าโฮสต์ส่ง header ได้ ให้ใช้ vercel.json แทน)
  if (window.top !== window.self) {
    try {
      window.top.location = window.self.location.href;
    } catch {
      document.documentElement.style.display = 'none';
    }
  }

  const icon = {
    chevron: "<svg class=\"h-4 w-4\" fill=\"none\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M7 9.5L12 14.5L17 9.5\" stroke=\"currentColor\" stroke-opacity=\"0.18\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    sun: '<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/></svg>',
    moon: "<svg class=\"h-5 w-5\" fill=\"none\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M3 11.7429C3 16.8554 7.14456 21 12.2571 21C16.6627 21 20.0646 17.9225 21 13.8C19.5911 15.3189 18.0923 15.8571 15.8571 15.8571C11.5967 15.8571 8.14286 12.4033 8.14286 8.14286C8.14286 6.11752 8.92336 4.37637 10.2 3C6.07751 3.93544 3 7.33731 3 11.7429Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    menu: "<svg class=\"h-6 w-6\" fill=\"none\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 12H20M4 18H20M4 6H20\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>",
    search: "<svg class=\"h-5 w-5\" fill=\"none\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M21 21L17.5967 17.5963M20.0385 11.5202C20.0385 16.2258 16.2243 20.0405 11.5192 20.0405C6.8142 20.0405 3 16.2258 3 11.5202C3 6.81464 6.8142 3 11.5192 3C16.2243 3 20.0385 6.81464 20.0385 11.5202Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>",
    close: "<svg class=\"h-6 w-6\" fill=\"none\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M17.657 17.6568L12.0001 12M12.0001 12L6.34326 6.34314M12.0001 12L17.657 6.34314M12.0001 12L6.34326 17.6568\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    up: "<svg class=\"h-6 w-6\" fill=\"none\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 20L12 4M12 4L9 7M12 4L15 7\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    camera: "<svg class=\"h-4 w-4\" fill=\"none\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M21 13.8V10.4444C21 10.0317 21 9.82536 20.9848 9.65138C20.8156 7.71759 19.2824 6.18441 17.3486 6.01522C17.1746 6 16.9683 6 16.5556 6H16.3333C16.1492 6 16 5.85076 16 5.66667C16 4.19391 14.8061 3 13.3333 3H10.6667C9.19391 3 8 4.19391 8 5.66667C8 5.85076 7.85076 6 7.66667 6H7.44444C7.03172 6 6.82536 6 6.65138 6.01522C4.71759 6.18441 3.18441 7.71759 3.01522 9.65138C3 9.82536 3 10.0317 3 10.4444V13.8C3 16.7998 3 18.2997 3.76393 19.3511C4.01065 19.6907 4.30928 19.9893 4.64886 20.2361C5.70032 21 7.20021 21 10.2 21H13.8C16.7998 21 18.2997 21 19.3511 20.2361C19.6907 19.9893 19.9893 19.6907 20.2361 19.3511C21 18.2997 21 16.7998 21 13.8Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/>\n<path d=\"M9 13C9 11.3431 10.3431 10 12 10V10C13.6569 10 15 11.3431 15 13V13C15 14.6569 13.6569 16 12 16V16C10.3431 16 9 14.6569 9 13V13Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/></svg>",
    play: "<svg class=\"h-4 w-4\" fill=\"none\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M13 8.00049L15.0687 9.37977C16.6361 10.4248 17.4198 10.9473 17.5615 11.6591C17.6064 11.8847 17.6064 12.117 17.5614 12.3426C17.4197 13.0544 16.6359 13.5768 15.0684 14.6217L13 16.0005\" stroke=\"currentColor\" stroke-opacity=\"0.18\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n<path d=\"M13 8.00044L11.8974 7.26532C9.99908 5.99961 9.04991 5.36675 8.27397 5.58609C8.03066 5.65487 7.80514 5.77556 7.61294 5.93985C7 6.46377 7 7.60457 7 9.88619L7 14.1145C7 16.3959 7 17.5366 7.61288 18.0605C7.80507 18.2248 8.03057 18.3455 8.27387 18.4143C9.04975 18.6336 9.99889 18.001 11.8972 16.7356L13 16.0004\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    pin: "<svg class=\"h-5 w-5\" fill=\"none\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12.0001 3C7.02956 3 2.99997 7 4.00012 12C4.66541 15.3259 7.98533 18.4306 10.1339 20.1367C10.8361 20.6944 11.1873 20.9732 11.7325 21.0468C11.8836 21.0672 12.1166 21.0672 12.2678 21.0468C12.813 20.9732 13.1641 20.6944 13.8664 20.1368C16.015 18.4306 19.335 15.3259 20.0001 12C21 7 16.9707 3 12.0001 3Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/>\n<path d=\"M15 11.15C15 12.8069 13.6569 14.15 12 14.15C10.3431 14.15 9 12.8069 9 11.15C9 9.49315 10.3431 8.15 12 8.15C13.6569 8.15 15 9.49315 15 11.15Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/></svg>",
    phone: "<svg class=\"h-5 w-5\" fill=\"none\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4.02513 4.0716L3.4949 3.54117L3.4949 3.54117L4.02513 4.0716ZM8.97487 4.0716L9.5051 3.54117L8.97487 4.0716ZM8.97487 9.01942L8.44465 8.48898L8.44465 8.48898L8.97487 9.01942ZM14.9853 15.0275L14.4551 14.497L14.4551 14.497L14.9853 15.0275ZM19.935 19.9753L19.4048 19.4449L19.4048 19.4449L19.935 19.9753ZM7.56066 16.4411L7.03043 16.9716L7.56066 16.4411ZM3.01853 6.90616L3.76852 6.9019C3.76838 6.87764 3.76707 6.8534 3.76458 6.82926L3.01853 6.90616ZM17.0994 20.9815L17.1762 20.2354C17.1521 20.233 17.1279 20.2316 17.1036 20.2315L17.0994 20.9815ZM7.05559 10L6.9372 9.25944C6.69728 9.29779 6.49081 9.44999 6.38319 9.66782C6.27556 9.88565 6.28013 10.1421 6.39544 10.356L7.05559 10ZM14.0043 16.946L13.6486 17.6063C13.8624 17.7215 14.1188 17.726 14.3366 17.6184C14.5543 17.5108 14.7065 17.3043 14.7449 17.0645L14.0043 16.946ZM4.55535 4.60203C5.62932 3.52849 7.37068 3.52849 8.44465 4.60203L9.5051 3.54117C7.8454 1.88211 5.1546 1.88211 3.4949 3.54117L4.55535 4.60203ZM8.44465 4.60203C9.51845 5.67542 9.51845 7.4156 8.44465 8.48898L9.5051 9.54985C11.165 7.89063 11.165 5.20039 9.5051 3.54117L8.44465 4.60203ZM15.5155 15.5579C16.5895 14.4844 18.3308 14.4844 19.4048 15.5579L20.4653 14.497C18.8055 12.838 16.1148 12.838 14.4551 14.497L15.5155 15.5579ZM19.4048 15.5579C20.4786 16.6313 20.4786 18.3715 19.4048 19.4449L20.4653 20.5057C22.1251 18.8465 22.1251 16.1563 20.4653 14.497L19.4048 15.5579ZM8.09089 15.9107C5.26504 13.086 3.78435 9.69148 3.76852 6.9019L2.26854 6.91041C2.28711 10.1813 3.99291 13.9352 7.03043 16.9716L8.09089 15.9107ZM3.76458 6.82926C3.6825 6.03286 3.94644 5.21071 4.55535 4.60203L3.4949 3.54117C2.5532 4.4825 2.14608 5.75662 2.27248 6.98305L3.76458 6.82926ZM19.4048 19.4449C18.7959 20.0536 17.9732 20.3175 17.1762 20.2354L17.0225 21.7275C18.2491 21.8539 19.5236 21.447 20.4653 20.5057L19.4048 19.4449ZM17.1036 20.2315C14.3127 20.2157 10.9167 18.7354 8.09089 15.9107L7.03043 16.9716C10.068 20.0079 13.8232 21.7129 17.0951 21.7315L17.1036 20.2315ZM8.44465 8.48898C8.01844 8.91502 7.48913 9.17121 6.9372 9.25944L7.17398 10.7406C8.02737 10.6042 8.84804 10.2067 9.5051 9.54985L8.44465 8.48898ZM10.5658 13.4368C9.37781 12.2493 8.42284 10.9555 7.71575 9.6441L6.39544 10.356C7.17383 11.7997 8.21742 13.2103 9.50531 14.4977L10.5658 13.4368ZM14.7449 17.0645C14.8331 16.513 15.0893 15.9839 15.5155 15.5579L14.4551 14.497C13.798 15.1539 13.4002 15.9743 13.2637 16.8275L14.7449 17.0645ZM14.36 16.2857C13.048 15.5789 11.7537 14.6243 10.5658 13.4368L9.50531 14.4977C10.7932 15.785 12.2044 16.8282 13.6486 17.6063L14.36 16.2857Z\" fill=\"currentColor\"/></svg>",
    printer: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4"/></svg>',
    mail: "<svg class=\"h-5 w-5\" fill=\"none\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M3 12C3 9.67029 3 8.50544 3.3806 7.58658C3.88807 6.36144 4.86144 5.38807 6.08658 4.8806C7.00544 4.5 8.17029 4.5 10.5 4.5H13.5C15.8297 4.5 16.9946 4.5 17.9134 4.8806C19.1386 5.38807 20.1119 6.36144 20.6194 7.58658C21 8.50544 21 9.67029 21 12V12C21 14.3297 21 15.4946 20.6194 16.4134C20.1119 17.6386 19.1386 18.6119 17.9134 19.1194C16.9946 19.5 15.8297 19.5 13.5 19.5H10.5C8.17029 19.5 7.00544 19.5 6.08658 19.1194C4.86144 18.6119 3.88807 17.6386 3.3806 16.4134C3 15.4946 3 14.3297 3 12V12Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/>\n<path d=\"M3 8L6.47486 10.7025C8.82448 12.5299 9.99929 13.4436 11.3413 13.6221C11.7788 13.6802 12.222 13.6802 12.6595 13.622C14.0015 13.4436 15.1762 12.5298 17.5258 10.7023L21 8\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/></svg>",
    external: "<svg class=\"h-4 w-4\" fill=\"none\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6.34277 17.657L17.6565 6.34326M17.6565 6.34326H13.4138M17.6565 6.34326V10.5859\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
  };

  // ---------- dark mode ----------
  // อ่านการตั้งค่าโหมดมืด
  function isDark() {
    let saved = null;
    try {
      saved = localStorage.getItem('darkMode');
    } catch {}
    // ค่าเริ่มต้นเป็นโหมดสว่าง (พื้นขาว) จนกว่าผู้ใช้จะกดสลับเป็นโหมดมืดเอง
    return saved === 'true';
  }

  // นำสถานะโหมดมืดไปใช้กับหน้าเว็บ
  function applyDark(dark) {
    document.documentElement.classList.toggle('dark', dark);
    document.querySelectorAll('[data-dark-toggle]').forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในเว็บไซต์ */ (b) => {
      b.innerHTML = dark ? icon.sun : icon.moon;
      b.title = `สลับโหมด ${dark ? 'สว่าง' : 'มืด'}`;
    });
  }

  // สลับโหมดสว่างและโหมดมืด
  function toggleDark() {
    const dark = !document.documentElement.classList.contains('dark');
    try {
      localStorage.setItem('darkMode', String(dark));
    } catch {}
    applyDark(dark);
  }

  // ---------- active menu ----------
  // อ่านชื่อหน้าปัจจุบันเพื่อเทียบกับเมนู
  function currentHref() {
    const file = location.pathname.split('/').pop() || 'index.html';
    return file + location.search;
  }

  // ตรวจว่าเมนูตรงกับหน้าปัจจุบันหรือไม่
  function isActive(item) {
    const here = currentHref();
    if (item.children) return item.children.some(isActive);
    if (item.href === here) return true;
    // หน้าที่มี query (เช่น ?id=) ให้ถือว่าอยู่ในเมนูเดียวกับหน้าหลัก
    const [file] = item.href.split('?');
    return !item.href.includes('?') && here.split('?')[0] === file && !cfg.menu.some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในเว็บไซต์ */ (m) => (m.children || []).some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในเว็บไซต์ */ (c) => c.href === here));
  }

  // ---------- header ----------
  // โลโก้เต็ม (ตราสัญลักษณ์ + ชื่องาน) โหมดมืดใช้โลโก้ฉบับสีขาว (ส่วนสีน้ำเงินเปลี่ยนเป็นขาว)
  // สร้างส่วนแสดงตราและชื่อเว็บไซต์
  function brandMark(size = 'md') {
    const img = `${size === 'sm' ? 'h-11' : 'h-12 sm:h-14'} w-auto shrink-0 object-contain`;
    return `<span class="flex items-center">
      <img src="assets/images/logo-full.png" alt="${esc(cfg.name)}" class="${img} dark:hidden">
      <img src="assets/images/logo-full-dark.png" alt="${esc(cfg.name)}" class="${img} hidden dark:block">
    </span>`;
  }

  // เมนูที่ยังไม่มีลิงก์ (href ว่าง) แสดงเป็นข้อความสีจาง กดไม่ได้
  // สร้างรายการเมนูที่ยังไม่เปิดใช้งาน
  function soonItem(item, cls) {
    return `<span class="${cls} cursor-default text-neutral-400 dark:text-gray-500" aria-disabled="true">${esc(item.label)}</span>`;
  }

  // สร้างคุณสมบัติลิงก์ตามชนิดปลายทาง
  function linkAttrs(item) {
    return item.external ? `href="${safeUrl(item.href)}" ${NEW_TAB}` : `href="${safeUrl(item.href)}"`;
  }

  // สร้างเมนูสำหรับหน้าจอขนาดใหญ่
  function desktopItem(item) {
    const active = isActive(item);
    const base = 'flex items-center gap-1 rounded-lg px-3 py-2 text-[15px] font-medium transition-colors whitespace-nowrap';
    const tone = active
      ? 'text-neutral-900 bg-brand-50 dark:bg-white/10 dark:text-brand-100'
      : 'text-neutral-900 hover:bg-black/5 dark:text-gray-100 dark:hover:bg-white/10';
    if (!item.children && !item.href) return soonItem(item, base);
    if (!item.children) return `<a ${linkAttrs(item)} class="${base} ${tone}">${esc(item.label)}</a>`;
    return `
      <div class="group relative" data-dropdown>
        <button type="button" class="${base} ${tone}" aria-haspopup="true" aria-expanded="false">
          <span>${esc(item.label)}</span><span class="transition-transform group-hover:rotate-180">${icon.chevron}</span>
        </button>
        <div class="invisible absolute left-0 top-full z-50 min-w-[280px] translate-y-1 pt-2 opacity-0 transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-[.open]:visible group-[.open]:opacity-100">
          <div class="overflow-hidden rounded-xl border border-gray-100 bg-white py-2 shadow-xl dark:border-white/10 dark:bg-gray-900">
            ${item.children
              .map(
                /* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (c) => `<a ${linkAttrs(c)} class="block px-4 py-2.5 text-sm transition-colors ${
                  isActive(c) ? 'bg-brand-50 text-neutral-900 dark:bg-white/10 dark:text-brand-100' : 'text-neutral-900 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-white/10'
                }">${esc(c.label)}</a>`
              )
              .join('')}
          </div>
        </div>
      </div>`;
  }

  // สร้างเมนูสำหรับมือถือ
  function mobileItem(item) {
    const cls = 'block rounded-lg px-4 py-3 text-base font-medium';
    if (!item.children && !item.href) return soonItem(item, cls);
    if (!item.children) {
      return `<a ${linkAttrs(item)} class="${cls} ${isActive(item) ? 'bg-brand-50 text-neutral-900 dark:bg-white/10 dark:text-white' : 'text-neutral-900 hover:bg-black/5 dark:text-gray-100 dark:hover:bg-white/10'}">${esc(item.label)}</a>`;
    }
    return `
      <details class="group" ${isActive(item) ? 'open' : ''}>
        <summary class="${cls} flex cursor-pointer list-none items-center justify-between text-neutral-900 hover:bg-black/5 dark:text-gray-100 dark:hover:bg-white/10">
          ${esc(item.label)}<span class="transition-transform group-open:rotate-180">${icon.chevron}</span>
        </summary>
        <div class="ml-4 border-l-2 border-brand-100 pl-2 dark:border-white/10">
          ${item.children
            .map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (c) => `<a ${linkAttrs(c)} class="block rounded-lg px-4 py-2 text-sm ${isActive(c) ? 'font-semibold text-neutral-900 dark:text-white' : 'text-neutral-900 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10'}">${esc(c.label)}</a>`)
            .join('')}
        </div>
      </details>`;
  }

  // สร้างส่วนหัวและเชื่อมการทำงานของเมนู
  function renderHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.innerHTML = `
      <header>
        <div class="overflow-hidden bg-white" aria-hidden="true">
          <div class="flex w-max animate-marquee">
            <img src="assets/images/banners/header.png" alt="" class="h-14 w-auto max-w-none sm:h-20">
            <img src="assets/images/banners/header.png" alt="" class="h-14 w-auto max-w-none sm:h-20">
          </div>
        </div>
        <div class="sticky top-0 z-40 bg-white/95 shadow-sm backdrop-blur dark:bg-gray-950/90">
          <div class="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
            <a href="index.html" class="shrink-0" aria-label="${esc(cfg.name)}">${brandMark()}</a>
            <nav class="hidden items-center gap-0.5 xl:flex" aria-label="เมนูหลัก">
              ${cfg.menu.map(desktopItem).join('')}
              <button type="button" data-search-open class="ml-1 rounded-lg p-2 text-neutral-900 hover:bg-black/5 dark:text-gray-100 dark:hover:bg-white/10" aria-label="ค้นหา" title="ค้นหา (Ctrl+K)">${icon.search}</button>
              <button type="button" data-dark-toggle class="rounded-lg p-2 text-neutral-900 hover:bg-black/5 dark:text-gray-100 dark:hover:bg-white/10" aria-label="Toggle dark mode"></button>
            </nav>
            <div class="flex items-center gap-1 xl:hidden">
              <button type="button" data-search-open class="rounded-lg p-2 text-neutral-900 hover:bg-black/5 dark:text-gray-100 dark:hover:bg-white/10" aria-label="ค้นหา">${icon.search}</button>
              <button type="button" data-dark-toggle class="rounded-lg p-2 text-neutral-900 hover:bg-black/5 dark:text-gray-100 dark:hover:bg-white/10" aria-label="Toggle dark mode"></button>
              <button type="button" id="menu-open" class="rounded-lg p-2 text-neutral-900 hover:bg-black/5 dark:text-gray-100 dark:hover:bg-white/10" aria-label="เปิดเมนู">${icon.menu}</button>
            </div>
          </div>
          <div class="accent-bar h-1"></div>
        </div>
        <div id="mobile-menu" class="fixed inset-0 z-50 hidden xl:hidden">
          <div class="absolute inset-0 bg-black/40" data-close></div>
          <div class="absolute right-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-white shadow-2xl dark:bg-gray-950">
            <div class="flex items-center justify-between border-b border-gray-100 p-4 dark:border-white/10">
              ${brandMark('sm')}
              <button type="button" class="rounded-lg p-2 text-neutral-900 hover:bg-black/5 dark:text-gray-200" data-close aria-label="ปิดเมนู">${icon.close}</button>
            </div>
            <nav class="flex-1 space-y-1 overflow-y-auto p-3">${cfg.menu.map(mobileItem).join('')}</nav>
          </div>
        </div>
        <div id="site-search" class="fixed inset-0 z-50 hidden" role="dialog" aria-modal="true" aria-label="ค้นหาในเว็บไซต์">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" data-search-close></div>
          <div class="relative mx-auto mt-16 w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:mt-24 dark:bg-gray-900">
            <div class="flex items-center gap-3 px-4">
              <span class="text-brand-300">${icon.search}</span>
              <input id="site-search-input" type="search" placeholder="ค้นหาหน้าเว็บ หรือชนิดกีฬา" autocomplete="off"
                class="w-full border-0 bg-transparent py-4 text-base text-neutral-900 placeholder-brand-300 outline-none focus:ring-0 dark:text-white dark:placeholder-gray-500">
              <button type="button" class="rounded-lg p-1.5 text-neutral-900 hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10" data-search-close aria-label="ปิดการค้นหา">${icon.close}</button>
            </div>
            <ul id="site-search-results" class="hidden max-h-[60vh] overflow-y-auto border-t border-gray-100 p-2 dark:border-white/10" aria-live="polite"></ul>
          </div>
        </div>
      </header>`;

    const mobile = el.querySelector('#mobile-menu');
    el.querySelector('#menu-open').addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => mobile.classList.remove('hidden'));
    mobile.querySelectorAll('[data-close]').forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในเว็บไซต์ */ (b) => b.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => mobile.classList.add('hidden')));

    // เปิด dropdown ด้วยการคลิก/คีย์บอร์ด (นอกจาก hover)
    // ปิดเมนูที่คลิกเปิดค้างไว้เมื่อเมาส์ออกหรือไปชี้เมนูอื่น เพื่อไม่ให้เปิดซ้อนกัน 2 อัน
    const closeDropdowns = /* ปิดเมนูย่อยที่เปิดอยู่ */ (except) =>
      el.querySelectorAll('[data-dropdown].open').forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในเว็บไซต์ */ (o) => {
        if (o === except) return;
        o.classList.remove('open');
        o.querySelector('button').setAttribute('aria-expanded', 'false');
      });
    el.querySelectorAll('[data-dropdown]').forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในเว็บไซต์ */ (dd) => {
      const btn = dd.querySelector('button');
      btn.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ (e) => {
        e.stopPropagation();
        const open = !dd.classList.contains('open');
        closeDropdowns();
        dd.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
      dd.addEventListener('mouseenter', /* ตอบสนองเหตุการณ์ 'mouseenter' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => closeDropdowns(dd));
      dd.addEventListener('mouseleave', /* ตอบสนองเหตุการณ์ 'mouseleave' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => closeDropdowns());
    });
    document.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => closeDropdowns());
    el.querySelectorAll('[data-dark-toggle]').forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในเว็บไซต์ */ (b) => b.addEventListener('click', toggleDark));
    initSearch(el);
  }

  // ---------- ค้นหาทั้งเว็บ (หน้าในเมนู + ชนิดกีฬา) ----------
  // เตรียมหน้าต่างค้นหาและเหตุการณ์ที่เกี่ยวข้อง
  function initSearch(el) {
    const box = el.querySelector('#site-search');
    const input = box.querySelector('#site-search-input');
    const list = box.querySelector('#site-search-results');

    const pages = cfg.menu
      .flatMap(/* ทำงานต่อภายใน cfg.menu.flatMap ของเว็บไซต์ */ (m) => (m.children ? m.children.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (c) => ({ ...c, group: m.label })) : [m]))
      .filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในเว็บไซต์ */ (m) => m.href)
      .map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (m) => ({ label: m.label, href: m.href, external: m.external, hint: m.group || 'หน้าเว็บ' }));

    // ข้อมูลชนิดกีฬาโหลดแค่บางหน้า ถ้ายังไม่มีให้โหลดเพิ่มตอนเปิดค้นหา
    // โหลดข้อมูลกีฬาสำหรับหน้าค้นหา
    function loadSports() {
      if (window.SiteData?.sports || loadSports.started) return;
      loadSports.started = true;
      const s = document.createElement('script');
      s.src = 'js/data/sports.js';
      s.onload = /* ประมวลผลขั้นตอนย่อยของเว็บไซต์ตามข้อมูลหรือสถานะที่รับมา */ () => render(input.value);
      document.head.appendChild(s);
    }
    const sportItems = /* เตรียมรายการกีฬาที่ตรงกับคำค้น */ () =>
      (window.SiteData?.sports || []).map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (s) => ({ label: s.name, href: `match-result-sport.html?id=${s.apiId}`, hint: `ชนิดกีฬา · ${s.code}` }));

    // แสดงหน้าจอจากข้อมูลและสถานะปัจจุบัน
    function render(query) {
      const q = query.trim().toLowerCase();
      const all = [...pages, ...sportItems()];
      // ยังไม่พิมพ์ = ไม่แสดงรายการ
      list.classList.toggle('hidden', !q);
      if (!q) return (list.innerHTML = '');
      const found = all.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในเว็บไซต์ */ (i) => i.label.toLowerCase().includes(q));
      list.innerHTML = found.length
        ? found
            .map(
              /* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (i) => `<li><a ${linkAttrs(i)} class="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-neutral-900 outline-none hover:bg-brand-50 focus-visible:bg-brand-50 dark:text-gray-100 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
                <span class="text-sm font-medium">${esc(i.label)}</span>
                <span class="shrink-0 text-xs text-brand-400 dark:text-gray-500">${esc(i.hint)}</span>
              </a></li>`
            )
            .join('')
        : `<li class="px-3 py-8 text-center text-sm text-brand-400 dark:text-gray-500">ไม่พบ "${esc(query)}"</li>`;
    }

    // เปิดรายการหรือหน้าต่างที่ผู้ใช้เลือก
    function open() {
      el.querySelector('#mobile-menu').classList.add('hidden');
      box.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      loadSports();
      render(input.value);
      input.focus();
      input.select();
    }
    // ปิดหน้าต่างและคืนสถานะการแสดงผล
    function close() {
      box.classList.add('hidden');
      document.body.style.overflow = '';
    }

    el.querySelectorAll('[data-search-open]').forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในเว็บไซต์ */ (b) => b.addEventListener('click', open));
    box.querySelectorAll('[data-search-close]').forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในเว็บไซต์ */ (b) => b.addEventListener('click', close));
    input.addEventListener('input', /* ตอบสนองเหตุการณ์ 'input' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => render(input.value));
    // Enter = ไปผลลัพธ์แรก
    input.addEventListener('keydown', /* ตอบสนองเหตุการณ์ 'keydown' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ (e) => {
      if (e.key !== 'Enter') return;
      const first = list.querySelector('a');
      if (first) first.click();
    });
    document.addEventListener('keydown', /* ตอบสนองเหตุการณ์ 'keydown' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        box.classList.contains('hidden') ? open() : close();
      } else if (e.key === 'Escape' && !box.classList.contains('hidden')) {
        close();
      }
    });
  }

  // ---------- footer ----------
  // สร้างส่วนท้ายและข้อมูลติดต่อ
  function renderFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    // ลิงก์ด่วน: ดึงจากเมนูตาม id เพื่อให้ชื่อ/ลิงก์ตรงกับเมนูเสมอ
    const allItems = cfg.menu.flatMap(/* ทำงานต่อภายใน cfg.menu.flatMap ของเว็บไซต์ */ (m) => [m, ...(m.children || [])]);
    const quick = ['home', 'sports', 'schedule-official', 'match-result-sport', 'medals-school', 'news']
      .map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (id) => allItems.find(/* ค้นหารายการแรกที่ตรงตามเงื่อนไขในเว็บไซต์ */ (m) => m.id === id))
      .filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในเว็บไซต์ */ (m) => m && m.href);
    // หัวข้อสีทองตามโลโก้ ตัวอักษรรองเป็นขาวโปร่งเล็กน้อยให้มีลำดับความสำคัญ
    const heading = /* สร้างหัวข้อของส่วนเนื้อหา */ (text) => `<h4 class="mb-4 text-sm font-semibold tracking-wide text-[#e9b949]">${esc(text)}</h4>`;
    const contactRow = /* สร้างบรรทัดข้อมูลติดต่อพร้อมไอคอน*/ (ic, html) => `<li class="flex gap-3"><span class="mt-0.5 shrink-0 text-pink-300 [&>svg]:h-4 [&>svg]:w-4">${ic}</span><span>${html}</span></li>`;
    const social = /* สร้างลิงก์ช่องทางโซเชียล*/ (label, svg) =>
      `<span title="${label}" class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-pink-500">${svg}</span>`;

    el.innerHTML = `
      <footer class="mt-16 bg-[#161e4c] text-white/80">
        <div class="accent-bar h-1"></div>

        <div class="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-12">
          <div class="sm:col-span-2 lg:col-span-5">
            <a href="index.html" class="inline-block">
              <img src="assets/images/logo-full-dark.png" alt="${esc(cfg.name)}" class="h-16 w-auto object-contain sm:h-20">
            </a>
            <p class="mt-6 max-w-sm text-sm leading-relaxed">${esc(cfg.tagline)}</p>
            <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span class="rounded-full border border-[#e9b949]/50 px-3 py-1 font-medium text-[#e9b949]">${esc(cfg.period)}</span>
              ${cfg.slogan ? `<span class="rounded-full border border-pink-300/50 px-3 py-1 font-medium italic text-pink-300">${esc(cfg.slogan)}</span>` : ''}
            </div>
          </div>

          <div class="lg:col-span-2">
            ${heading('เมนูลัด')}
            <ul class="space-y-2.5 text-sm">
              ${quick.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (m) => `<li><a href="${safeUrl(m.href)}" class="transition hover:text-pink-300">${esc(m.label)}</a></li>`).join('')}
            </ul>
          </div>

          <div class="lg:col-span-3">
            ${heading('ติดต่อ')}
            <ul class="space-y-3 text-sm leading-relaxed">
              ${contactRow(icon.pin, esc(cfg.contact.address.join(' ')))}
              ${cfg.contact.phone ? contactRow(icon.phone, esc(cfg.contact.phone)) : ''}
              ${cfg.contact.email ? contactRow(icon.mail, `<a href="${safeUrl(`mailto:${cfg.contact.email}`)}" class="break-all hover:underline">${esc(cfg.contact.email)}</a>`) : ''}
            </ul>
          </div>

          <div class="lg:col-span-2">
            ${heading('ติดตาม')}
            <div class="flex gap-3">
              ${social('Facebook', '<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 8.5V6.8c0-.8.5-1 .9-1H17V2.1L14 2c-3.3 0-4 2.4-4 4v2.5H8V12h2v10h4V12h2.7l.4-3.5H14z"/></svg>')}
              ${social('Instagram', icon.camera)}
              ${social('YouTube', icon.play)}
            </div>
          </div>
        </div>

        <div class="border-t border-white/10 bg-black/15">
          <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 text-xs text-white/60 sm:flex-row">
            <p>Copyright © ${cfg.year} ${esc(cfg.shortName)}. All Rights Reserved.</p>
            <div class="flex gap-6">
              <a href="privacy.html" class="transition hover:text-pink-300">นโยบายความเป็นส่วนตัว</a>
              <a href="terms.html" class="transition hover:text-pink-300">เงื่อนไขการใช้งาน</a>
            </div>
          </div>
        </div>
      </footer>
      <button type="button" id="to-top" aria-label="กลับขึ้นด้านบน"
        class="fixed bottom-6 right-6 z-30 hidden h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-pink-500 text-white shadow-lg transition hover:scale-110">${icon.up}</button>`;

    const top = el.querySelector('#to-top');
    top.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => scrollTo({ top: 0 }));
    addEventListener('scroll', /* ตอบสนองเหตุการณ์ 'scroll' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => {
      top.classList.toggle('hidden', scrollY < 400);
      top.classList.toggle('flex', scrollY >= 400);
    }, { passive: true });
  }

  // ---------- UI building blocks ใช้ในแต่ละหน้า ----------
  const UI = {
    esc,
    qs,
    safeUrl,
    embedUrl,
    NEW_TAB,
    icon,

    card: 'rounded-2xl bg-white shadow-md ring-1 ring-black/5 dark:bg-gray-900/80 dark:ring-white/10',

    // สร้างหัวข้อหน้าและคำอธิบาย
    pageTitle(title, subtitle = '') {
      return `
        <div class="mb-10 text-center">
          <h1 class="text-3xl font-bold text-brand-800 sm:text-4xl dark:text-white">${title}</h1>
          ${subtitle ? `<p class="mt-3 text-neutral-900 dark:text-gray-300">${subtitle}</p>` : ''}
          <div class="accent-bar mx-auto mt-4 h-1 w-24 rounded-full"></div>
        </div>`;
    },

    // ช่องค้นหาแบบเส้นใต้ + ไอคอนแว่นขยาย ใช้แบบเดียวกันทุกหน้า
    // สร้างช่องค้นหาพร้อมคำอธิบายสำหรับผู้ใช้
    search(id, placeholder, label = placeholder, cls = '') {
      return `
        <label class="relative block ${cls}">
          <span class="sr-only">${esc(label)}</span>
          <svg class="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input id="${id}" type="search" placeholder="${esc(placeholder)}"
            class="w-full border-0 border-b border-gray-200 bg-transparent py-2 pl-7 pr-0 text-sm text-brand-800 placeholder-brand-300 outline-none transition-colors focus:border-brand-600 focus:ring-0 dark:border-white/15 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-200">
        </label>`;
    },

    // สร้างข้อความระหว่างโหลดข้อมูล
    loading(text = 'กำลังโหลดข้อมูล...') {
      return `
        <div class="flex flex-col items-center justify-center gap-4 py-20 text-brand-500 dark:text-gray-400">
          <div class="h-12 w-12 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600"></div>
          <p>${esc(text)}</p>
        </div>`;
    },

    // สร้างข้อความแจ้งข้อผิดพลาด
    error(message) {
      return `
        <div class="mx-auto max-w-lg rounded-2xl border border-pink-200 bg-pink-50 p-8 text-center text-pink-700 dark:border-pink-900 dark:bg-pink-900/30 dark:text-pink-200">
          <p class="font-semibold">ไม่สามารถโหลดข้อมูลได้</p>
          <p class="mt-1 text-sm opacity-80">${esc(message)}</p>
          <button type="button" data-reload class="mt-5 rounded-lg bg-pink-600 px-5 py-2 text-sm font-medium text-white hover:bg-pink-700">ลองใหม่</button>
        </div>`;
    },

    // สร้างข้อความเมื่อยังไม่มีข้อมูล
    empty(text = 'ไม่พบข้อมูล') {
      return `<div class="py-16 text-center text-brand-500 dark:text-gray-400"><p>${esc(text)}</p></div>`;
    },

    // จุดสีเหรียญ (ใช้แทนไอคอนเหรียญ): kind = gold | silver | bronze | total
    // สร้างสัญลักษณ์สีของเหรียญ
    medalDot(kind, size = 'h-3 w-3') {
      const tone = { gold: 'from-yellow-300 to-amber-500', silver: 'from-gray-200 to-gray-400', bronze: 'from-orange-300 to-orange-600', total: 'from-brand-400 to-brand-600' }[kind];
      return `<span class="inline-block ${size} shrink-0 rounded-full bg-gradient-to-br ${tone} align-middle"></span>`;
    },

    // รูปภาพแบบคลิกขยาย (ใช้กับหน้าที่เป็นแกลเลอรีโปสเตอร์)
    // สร้างกลุ่มรูปภาพสำหรับเนื้อหา
    imageStack(images) {
      return `<div class="mx-auto max-w-5xl space-y-8">${images
        .map(
          /* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (img) => `<a href="${safeUrl(img.src)}" ${NEW_TAB} class="block overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 transition hover:shadow-2xl dark:bg-gray-900">
            <img src="${safeUrl(img.src)}" alt="${esc(img.alt)}" loading="lazy" class="w-full">
          </a>`
        )
        .join('')}</div>`;
    },

    // ตารางเหรียญ: rows = [{rank, name, gold, silver, bronze, total}]
    // สร้างตารางเหรียญจากข้อมูลสรุป
    medalTable(rows, { title = 'อันดับเหรียญรางวัล', unit = 'โรงเรียน', nameLabel = 'โรงเรียน', rankLabel = 'อันดับ', plainRank = false } = {}) {
      if (!rows.length) return UI.empty('ยังไม่มีข้อมูลเหรียญรางวัล');
      const max = Math.max(1, ...rows.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (r) => Math.max(r.gold, r.silver, r.bronze)));
      const maxTotal = Math.max(1, ...rows.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (r) => r.total));
      const sum = rows.reduce(/* รวมค่าจากแต่ละรายการเป็นผลลัพธ์เดียวในเว็บไซต์ */ (a, r) => ({ gold: a.gold + r.gold, silver: a.silver + r.silver, bronze: a.bronze + r.bronze, total: a.total + r.total }), { gold: 0, silver: 0, bronze: 0, total: 0 });
      // สีทอง/เงิน/ทองแดงสำหรับ 3 อันดับแรก เฉพาะเมื่อมีเหรียญแล้ว
      const badge = /* สร้างป้ายสถานะสำหรับแสดงบนหน้าจอ */ (r) => {
        const podium = r.total > 0 ? { 1: 'from-yellow-300 to-amber-500 text-white', 2: 'from-gray-200 to-gray-400 text-white', 3: 'from-orange-300 to-orange-600 text-white' }[r.rank] : '';
        const tone = podium || 'from-gray-100 to-gray-200 text-brand-700 dark:from-gray-700 dark:to-gray-800 dark:text-gray-200';
        return `<span class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${tone} text-sm font-bold shadow">${r.rank}</span>`;
      };
      const th = /* สร้างหัวคอลัมน์ตารางเหรียญพร้อมสัญลักษณ์*/ (kind, label) => `<th class="px-3 py-3"><span class="inline-flex items-center gap-1.5">${UI.medalDot(kind, 'h-2.5 w-2.5')}${label}</span></th>`;
      const cell = /* จัดรูปแบบค่าแต่ละช่องก่อนแสดงหรือส่งออก */ (v, color, m) => `
        <td class="px-3 py-3 text-center">
          <div class="text-lg font-bold ${color}">${v}</div>
          <div class="mx-auto mt-1 h-1 w-12 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div class="h-full rounded-full ${color.replace('text-', 'bg-')}" style="width:${(v / m) * 100}%"></div></div>
        </td>`;
      return `
        <div class="overflow-hidden ${UI.card}">
          <div class="flex items-center justify-between table-head px-5 py-4 text-white">
            <h2 class="font-semibold">${esc(title)}</h2>
            <span class="rounded-full bg-white/20 px-3 py-1 text-xs">${rows.length} ${esc(unit)}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[640px] text-sm">
              <thead class="bg-gray-50 text-xs text-brand-500 dark:bg-gray-800/60 dark:text-gray-400">
                <tr><th class="px-4 py-3 text-left">${rankLabel}</th><th class="px-4 py-3 text-left">${nameLabel}</th>${th('gold', 'ทอง')}${th('silver', 'เงิน')}${th('bronze', 'ทองแดง')}${th('total', 'รวม')}</tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/5">
                ${rows
                  .map(
                    /* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (r) => `<tr class="hover:bg-brand-50/50 dark:hover:bg-white/5">
                      <td class="px-4 py-3">${plainRank ? `<span class="pl-3 font-semibold text-brand-500">${r.rank}</span>` : badge(r)}</td>
                      <td class="px-4 py-3 font-medium text-brand-800 dark:text-gray-100">${esc(r.name)}</td>
                      ${cell(r.gold, 'text-yellow-500', max)}${cell(r.silver, 'text-gray-400', max)}${cell(r.bronze, 'text-orange-500', max)}${cell(r.total, 'text-brand-600', maxTotal)}
                    </tr>`
                  )
                  .join('')}
              </tbody>
              <tfoot class="table-head font-bold text-white">
                <tr><td class="px-4 py-4" colspan="2">รวมทั้งหมด</td><td class="text-center text-yellow-200">${sum.gold}</td><td class="text-center">${sum.silver}</td><td class="text-center text-orange-200">${sum.bronze}</td><td class="text-center">${sum.total}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>`;
    },

    // ปุ่มเลือกแบบ pill (เช่น เลือกชนิดกีฬา/วันที่)
    // สร้างชุดตัวเลือกแบบปุ่ม
    pills(items, activeValue, attr = 'data-value') {
      return `<div class="flex flex-wrap justify-center gap-2">${items
        .map(
          /* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (it) => `<button type="button" ${attr}="${esc(it.value)}" class="rounded-full px-4 py-2 text-sm font-medium shadow-sm ring-1 transition ${
            String(it.value) === String(activeValue)
              ? 'bg-brand-600 text-white ring-brand-600'
              : 'bg-white text-brand-700 ring-black/5 hover:bg-brand-50 dark:bg-gray-900 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-white/10'
          }">${it.label}</button>`
        )
        .join('')}</div>`;
    },

    // การ์ดชนิดกีฬา (หน้าแรก / ชนิดกีฬา / ระเบียบ / สูจิบัตร)
    // วงกลมแทนรูปชนิดกีฬา (ใช้เมื่อยังไม่มีรูป): แสดงรหัสกีฬา เช่น "01"
    // สร้างสัญลักษณ์และชื่อกีฬา
    sportBadge(text, size = 'h-20 w-20 text-2xl') {
      return `<span class="inline-flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-pink-500 font-bold text-white shadow-md">${esc(text)}</span>`;
    },

    // href ว่าง = การ์ดเฉย ๆ ไม่มีลิงก์, icon ว่าง = แสดง sportBadge แทนรูป
    // สร้างรายการกีฬาสำหรับแสดงในหน้าเว็บ
    sportCard({ href, icon: img, title, code: badge = '', external = false, extra = '' }) {
      const code = badge || (/^(\d+)-/.exec(title) || [])[1] || title.charAt(0);
      const tag = href ? 'a' : 'div';
      const attrs = href ? `href="${safeUrl(href)}" ${external ? NEW_TAB : ''}` : '';
      const hover = href ? 'transition hover:-translate-y-1 hover:shadow-xl' : '';
      return `<${tag} ${attrs}
        class="group flex flex-col items-center rounded-2xl bg-white p-5 text-center shadow-md ring-1 ring-black/5 ${hover} dark:bg-gray-900/80 dark:ring-white/10">
        <div class="flex h-28 w-full items-center justify-center sm:h-32">${img ? `<img src="${safeUrl(img)}" alt="${esc(title)}" loading="lazy" class="max-h-full max-w-full object-contain transition group-hover:scale-110">` : `<span class="transition group-hover:scale-110">${UI.sportBadge(code)}</span>`}</div>
        <h3 class="mt-4 font-semibold text-brand-800 dark:text-gray-100">${esc(title)}</h3>${extra}
      </${tag}>`;
    },
  };

  window.UI = UI;

  // ---------- แจ้งการใช้คุกกี้ (ขึ้นครั้งเดียว กด "ยอมรับ" แล้วไม่ขึ้นอีก) ----------
  // แสดงแถบแจ้งการใช้พื้นที่จัดเก็บของเบราว์เซอร์
  function renderCookieBanner() {
    try {
      if (localStorage.getItem('cookieConsent')) return;
    } catch {}
    const box = document.createElement('div');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'การใช้คุกกี้');
    box.className = 'fixed inset-x-4 bottom-4 z-40 animate-slide-up rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 sm:inset-x-auto sm:left-6 sm:bottom-6 sm:max-w-md dark:bg-gray-900 dark:ring-white/10';
    box.innerHTML = `
      <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">คุกกี้บนเว็บไซต์นี้</h2>
      <p class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">เราใช้คุกกี้ที่จำเป็นเพื่อให้เว็บไซต์ทำงานได้อย่างราบรื่นและเพื่อปรับปรุงประสบการณ์การใช้งานของคุณ</p>
      <p data-cookie-more class="mt-2 hidden text-sm leading-relaxed text-gray-600 dark:text-gray-300">เว็บไซต์นี้เก็บเฉพาะข้อมูลที่จำเป็นไว้ในเบราว์เซอร์ของคุณ ได้แก่ การตั้งค่าโหมดมืด/สว่าง และข้อมูลผลการแข่งขันชั่วคราวเพื่อให้เปิดหน้าได้เร็วขึ้น ไม่มีการเก็บข้อมูลส่วนบุคคลหรือติดตามการใช้งาน</p>
      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" data-cookie-accept class="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">ยอมรับ</button>
        <button type="button" data-cookie-toggle aria-expanded="false" class="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-black/5 dark:border-white/15 dark:text-white dark:hover:bg-white/10">เรียนรู้เพิ่มเติม</button>
      </div>`;
    document.body.appendChild(box);

    const more = box.querySelector('[data-cookie-more]');
    const toggle = box.querySelector('[data-cookie-toggle]');
    toggle.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => {
      const open = more.classList.toggle('hidden') === false;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'ซ่อนรายละเอียด' : 'เรียนรู้เพิ่มเติม';
    });
    box.querySelector('[data-cookie-accept]').addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => {
      try {
        localStorage.setItem('cookieConsent', 'accepted');
      } catch {}
      box.remove();
    });
  }

  // ---------- ค่อย ๆ แสดงเนื้อหาเมื่อเลื่อนลงมาถึง ----------
  const REVEAL_TARGETS = 'section, article, ol > li, .grid > *, table';

  // เตรียมการแสดงองค์ประกอบเมื่อเข้าสู่พื้นที่มองเห็น
  function initReveal() {
    const app = document.getElementById('app');
    if (!app || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const io = new IntersectionObserver(
      /* ประมวลผลขั้นตอนย่อยของเว็บไซต์ตามข้อมูลหรือสถานะที่รับมา */ (entries) =>
        entries.forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในเว็บไซต์ */ (e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          el.classList.add('is-visible');
          io.unobserve(el);
          // แสดงเสร็จแล้วคืนสไตล์เดิม (ให้ hover/transition ของการ์ดทำงานตามปกติ)
          setTimeout(/* ทำงานภายหลังตามเวลาที่กำหนดในเว็บไซต์ */ () => {
            el.classList.remove('reveal', 'is-visible');
            el.style.transitionDelay = '';
          }, 1200);
        }),
      { rootMargin: '0px 0px -10% 0px', threshold: 0 }
    );

    // ช่วงเปิดหน้าให้ทุกส่วนค่อย ๆ ขึ้น หลังจากนั้นส่วนที่ถูกวาดใหม่บนจอ (เช่น ตอนกรอง/ค้นหา) แสดงทันที
    let settled = false;
    setTimeout(/* ทำงานภายหลังตามเวลาที่กำหนดในเว็บไซต์ */ () => (settled = true), 1200);

    const tag = /* สร้างป้ายแสดงสถานะที่ส่วนนี้นำไปใช้*/ () =>
      app.querySelectorAll(REVEAL_TARGETS).forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในเว็บไซต์ */ (el) => {
        if (el.dataset.reveal) return;
        el.dataset.reveal = '1';
        if (settled && el.getBoundingClientRect().top < innerHeight) return;
        el.classList.add('reveal');
        const parent = el.parentElement;
        if (parent.classList.contains('grid')) el.style.transitionDelay = `${([...parent.children].indexOf(el) % 5) * 80}ms`;
        io.observe(el);
      });

    tag();
    new MutationObserver(tag).observe(app, { childList: true, subtree: true });
  }

  // ---------- boot ----------
  applyDark(isDark());
  // ปุ่ม "ลองใหม่" ใน UI.error (ใช้ data-reload แทน onclick เพราะ CSP ไม่อนุญาตสคริปต์ inline)
  document.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ (e) => {
    if (e.target.closest('[data-reload]')) location.reload();
  });
  document.addEventListener('DOMContentLoaded', /* ตอบสนองเหตุการณ์ 'DOMContentLoaded' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => {
    renderHeader();
    renderFooter();
    renderCookieBanner();
    applyDark(isDark());
    initReveal();
  });
})();
