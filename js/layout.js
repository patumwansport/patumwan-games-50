// ส่วนประกอบที่ใช้ร่วมกันทุกหน้า: header, เมนู, footer, โหมดมืด และ helper สำหรับสร้าง UI
(function () {
  const cfg = window.SiteConfig;

  // ---------- helpers ----------
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const qs = (name) => new URLSearchParams(location.search).get(name);

  // ---------- ความปลอดภัย ----------
  // ลิงก์/รูปจาก API หรือไฟล์ข้อมูล: อนุญาตเฉพาะ http(s), mailto, tel และ path ภายในเว็บ
  // กัน javascript:, data:, vbscript: ที่ใช้ฝังสคริปต์ (XSS) คืนค่าที่ escape แล้ว พร้อมใส่ใน attribute
  const SAFE_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];
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

  // iframe ฝังได้เฉพาะ YouTube และ Google Maps (ต้องตรงกับ frame-src ใน CSP)
  const EMBED_HOSTS = ['www.youtube.com', 'www.youtube-nocookie.com', 'www.google.com', 'maps.google.com'];
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
    chevron: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>',
    sun: '<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/></svg>',
    moon: '<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>',
    menu: '<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>',
    search: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>',
    close: '<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
    up: '<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19V5m-7 7l7-7 7 7"/></svg>',
    camera: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    play: '<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pin: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5" stroke-width="2"/></svg>',
    phone: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.49a1 1 0 01-.5 1.21l-2.26 1.13a11.04 11.04 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.49 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z"/></svg>',
    printer: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4"/></svg>',
    mail: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
    external: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>',
  };

  // ---------- dark mode ----------
  function isDark() {
    let saved = null;
    try {
      saved = localStorage.getItem('darkMode');
    } catch {}
    return saved !== null ? saved === 'true' : matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyDark(dark) {
    document.documentElement.classList.toggle('dark', dark);
    document.querySelectorAll('[data-dark-toggle]').forEach((b) => {
      b.innerHTML = dark ? icon.sun : icon.moon;
      b.title = `สลับโหมด ${dark ? 'สว่าง' : 'มืด'}`;
    });
  }

  function toggleDark() {
    const dark = !document.documentElement.classList.contains('dark');
    try {
      localStorage.setItem('darkMode', String(dark));
    } catch {}
    applyDark(dark);
  }

  // ---------- active menu ----------
  function currentHref() {
    const file = location.pathname.split('/').pop() || 'index.html';
    return file + location.search;
  }

  function isActive(item) {
    const here = currentHref();
    if (item.children) return item.children.some(isActive);
    if (item.href === here) return true;
    // หน้าที่มี query (เช่น ?id=) ให้ถือว่าอยู่ในเมนูเดียวกับหน้าหลัก
    const [file] = item.href.split('?');
    return !item.href.includes('?') && here.split('?')[0] === file && !cfg.menu.some((m) => (m.children || []).some((c) => c.href === here));
  }

  // ---------- header ----------
  // โลโก้เต็ม (ตราสัญลักษณ์ + ชื่องาน) โหมดมืดใช้โลโก้ฉบับสีขาว (ส่วนสีน้ำเงินเปลี่ยนเป็นขาว)
  function brandMark(size = 'md') {
    const img = `${size === 'sm' ? 'h-11' : 'h-12 sm:h-14'} w-auto shrink-0 object-contain`;
    return `<span class="flex items-center">
      <img src="assets/images/logo-full.png" alt="${esc(cfg.name)}" class="${img} dark:hidden">
      <img src="assets/images/logo-full-dark.png" alt="${esc(cfg.name)}" class="${img} hidden dark:block">
    </span>`;
  }

  // เมนูที่ยังไม่มีลิงก์ (href ว่าง) แสดงเป็นข้อความสีจาง กดไม่ได้
  function soonItem(item, cls) {
    return `<span class="${cls} cursor-default text-neutral-400 dark:text-gray-500" aria-disabled="true">${esc(item.label)}</span>`;
  }

  function linkAttrs(item) {
    return item.external ? `href="${safeUrl(item.href)}" ${NEW_TAB}` : `href="${safeUrl(item.href)}"`;
  }

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
                (c) => `<a ${linkAttrs(c)} class="block px-4 py-2.5 text-sm transition-colors ${
                  isActive(c) ? 'bg-brand-50 text-neutral-900 dark:bg-white/10 dark:text-brand-100' : 'text-neutral-900 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-white/10'
                }">${esc(c.label)}</a>`
              )
              .join('')}
          </div>
        </div>
      </div>`;
  }

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
            .map((c) => `<a ${linkAttrs(c)} class="block rounded-lg px-4 py-2 text-sm ${isActive(c) ? 'font-semibold text-neutral-900 dark:text-white' : 'text-neutral-900 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10'}">${esc(c.label)}</a>`)
            .join('')}
        </div>
      </details>`;
  }

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
    el.querySelector('#menu-open').addEventListener('click', () => mobile.classList.remove('hidden'));
    mobile.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => mobile.classList.add('hidden')));

    // เปิด dropdown ด้วยการคลิก/คีย์บอร์ด (นอกจาก hover)
    // ปิดเมนูที่คลิกเปิดค้างไว้เมื่อเมาส์ออกหรือไปชี้เมนูอื่น เพื่อไม่ให้เปิดซ้อนกัน 2 อัน
    const closeDropdowns = (except) =>
      el.querySelectorAll('[data-dropdown].open').forEach((o) => {
        if (o === except) return;
        o.classList.remove('open');
        o.querySelector('button').setAttribute('aria-expanded', 'false');
      });
    el.querySelectorAll('[data-dropdown]').forEach((dd) => {
      const btn = dd.querySelector('button');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = !dd.classList.contains('open');
        closeDropdowns();
        dd.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
      dd.addEventListener('mouseenter', () => closeDropdowns(dd));
      dd.addEventListener('mouseleave', () => closeDropdowns());
    });
    document.addEventListener('click', () => closeDropdowns());
    el.querySelectorAll('[data-dark-toggle]').forEach((b) => b.addEventListener('click', toggleDark));
    initSearch(el);
  }

  // ---------- ค้นหาทั้งเว็บ (หน้าในเมนู + ชนิดกีฬา) ----------
  function initSearch(el) {
    const box = el.querySelector('#site-search');
    const input = box.querySelector('#site-search-input');
    const list = box.querySelector('#site-search-results');

    const pages = cfg.menu
      .flatMap((m) => (m.children ? m.children.map((c) => ({ ...c, group: m.label })) : [m]))
      .filter((m) => m.href)
      .map((m) => ({ label: m.label, href: m.href, external: m.external, hint: m.group || 'หน้าเว็บ' }));

    // ข้อมูลชนิดกีฬาโหลดแค่บางหน้า ถ้ายังไม่มีให้โหลดเพิ่มตอนเปิดค้นหา
    function loadSports() {
      if (window.SiteData?.sports || loadSports.started) return;
      loadSports.started = true;
      const s = document.createElement('script');
      s.src = 'js/data/sports.js';
      s.onload = () => render(input.value);
      document.head.appendChild(s);
    }
    const sportItems = () =>
      (window.SiteData?.sports || []).map((s) => ({ label: s.name, href: `match-result-sport.html?id=${s.apiId}`, hint: `ชนิดกีฬา · ${s.code}` }));

    function render(query) {
      const q = query.trim().toLowerCase();
      const all = [...pages, ...sportItems()];
      // ยังไม่พิมพ์ = ไม่แสดงรายการ
      list.classList.toggle('hidden', !q);
      if (!q) return (list.innerHTML = '');
      const found = all.filter((i) => i.label.toLowerCase().includes(q));
      list.innerHTML = found.length
        ? found
            .map(
              (i) => `<li><a ${linkAttrs(i)} class="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-neutral-900 outline-none hover:bg-brand-50 focus-visible:bg-brand-50 dark:text-gray-100 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
                <span class="text-sm font-medium">${esc(i.label)}</span>
                <span class="shrink-0 text-xs text-brand-400 dark:text-gray-500">${esc(i.hint)}</span>
              </a></li>`
            )
            .join('')
        : `<li class="px-3 py-8 text-center text-sm text-brand-400 dark:text-gray-500">ไม่พบ "${esc(query)}"</li>`;
    }

    function open() {
      el.querySelector('#mobile-menu').classList.add('hidden');
      box.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      loadSports();
      render(input.value);
      input.focus();
      input.select();
    }
    function close() {
      box.classList.add('hidden');
      document.body.style.overflow = '';
    }

    el.querySelectorAll('[data-search-open]').forEach((b) => b.addEventListener('click', open));
    box.querySelectorAll('[data-search-close]').forEach((b) => b.addEventListener('click', close));
    input.addEventListener('input', () => render(input.value));
    // Enter = ไปผลลัพธ์แรก
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const first = list.querySelector('a');
      if (first) first.click();
    });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        box.classList.contains('hidden') ? open() : close();
      } else if (e.key === 'Escape' && !box.classList.contains('hidden')) {
        close();
      }
    });
  }

  // ---------- footer ----------
  function renderFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    // ลิงก์ด่วน: ดึงจากเมนูตาม id เพื่อให้ชื่อ/ลิงก์ตรงกับเมนูเสมอ
    const allItems = cfg.menu.flatMap((m) => [m, ...(m.children || [])]);
    const quick = ['home', 'sports', 'schedule-official', 'match-result-sport', 'medals-school', 'news']
      .map((id) => allItems.find((m) => m.id === id))
      .filter((m) => m && m.href);
    // หัวข้อสีทองตามโลโก้ ตัวอักษรรองเป็นขาวโปร่งเล็กน้อยให้มีลำดับความสำคัญ
    const heading = (text) => `<h4 class="mb-4 text-sm font-semibold tracking-wide text-[#e9b949]">${esc(text)}</h4>`;
    const contactRow = (ic, html) => `<li class="flex gap-3"><span class="mt-0.5 shrink-0 text-pink-300 [&>svg]:h-4 [&>svg]:w-4">${ic}</span><span>${html}</span></li>`;
    const social = (label, svg) =>
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
              ${quick.map((m) => `<li><a href="${safeUrl(m.href)}" class="transition hover:text-pink-300">${esc(m.label)}</a></li>`).join('')}
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
    top.addEventListener('click', () => scrollTo({ top: 0 }));
    addEventListener('scroll', () => {
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

    pageTitle(title, subtitle = '') {
      return `
        <div class="mb-10 text-center">
          <h1 class="text-3xl font-bold text-brand-800 sm:text-4xl dark:text-white">${title}</h1>
          ${subtitle ? `<p class="mt-3 text-neutral-900 dark:text-gray-300">${subtitle}</p>` : ''}
          <div class="accent-bar mx-auto mt-4 h-1 w-24 rounded-full"></div>
        </div>`;
    },

    // ช่องค้นหาแบบเส้นใต้ + ไอคอนแว่นขยาย ใช้แบบเดียวกันทุกหน้า
    search(id, placeholder, label = placeholder, cls = '') {
      return `
        <label class="relative block ${cls}">
          <span class="sr-only">${esc(label)}</span>
          <svg class="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input id="${id}" type="search" placeholder="${esc(placeholder)}"
            class="w-full border-0 border-b border-gray-200 bg-transparent py-2 pl-7 pr-0 text-sm text-brand-800 placeholder-brand-300 outline-none transition-colors focus:border-brand-600 focus:ring-0 dark:border-white/15 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-200">
        </label>`;
    },

    loading(text = 'กำลังโหลดข้อมูล...') {
      return `
        <div class="flex flex-col items-center justify-center gap-4 py-20 text-brand-500 dark:text-gray-400">
          <div class="h-12 w-12 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600"></div>
          <p>${esc(text)}</p>
        </div>`;
    },

    error(message) {
      return `
        <div class="mx-auto max-w-lg rounded-2xl border border-pink-200 bg-pink-50 p-8 text-center text-pink-700 dark:border-pink-900 dark:bg-pink-900/30 dark:text-pink-200">
          <p class="font-semibold">ไม่สามารถโหลดข้อมูลได้</p>
          <p class="mt-1 text-sm opacity-80">${esc(message)}</p>
          <button type="button" data-reload class="mt-5 rounded-lg bg-pink-600 px-5 py-2 text-sm font-medium text-white hover:bg-pink-700">ลองใหม่</button>
        </div>`;
    },

    empty(text = 'ไม่พบข้อมูล') {
      return `<div class="py-16 text-center text-brand-500 dark:text-gray-400"><p>${esc(text)}</p></div>`;
    },

    // จุดสีเหรียญ (ใช้แทนไอคอนเหรียญ): kind = gold | silver | bronze | total
    medalDot(kind, size = 'h-3 w-3') {
      const tone = { gold: 'from-yellow-300 to-amber-500', silver: 'from-gray-200 to-gray-400', bronze: 'from-orange-300 to-orange-600', total: 'from-brand-400 to-brand-600' }[kind];
      return `<span class="inline-block ${size} shrink-0 rounded-full bg-gradient-to-br ${tone} align-middle"></span>`;
    },

    // รูปภาพแบบคลิกขยาย (ใช้กับหน้าที่เป็นแกลเลอรีโปสเตอร์)
    imageStack(images) {
      return `<div class="mx-auto max-w-5xl space-y-8">${images
        .map(
          (img) => `<a href="${safeUrl(img.src)}" ${NEW_TAB} class="block overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 transition hover:shadow-2xl dark:bg-gray-900">
            <img src="${safeUrl(img.src)}" alt="${esc(img.alt)}" loading="lazy" class="w-full">
          </a>`
        )
        .join('')}</div>`;
    },

    // ตารางเหรียญ: rows = [{rank, name, gold, silver, bronze, total}]
    medalTable(rows, { title = 'อันดับเหรียญรางวัล', unit = 'โรงเรียน', nameLabel = 'โรงเรียน', rankLabel = 'อันดับ', plainRank = false } = {}) {
      if (!rows.length) return UI.empty('ยังไม่มีข้อมูลเหรียญรางวัล');
      const max = Math.max(1, ...rows.map((r) => Math.max(r.gold, r.silver, r.bronze)));
      const maxTotal = Math.max(1, ...rows.map((r) => r.total));
      const sum = rows.reduce((a, r) => ({ gold: a.gold + r.gold, silver: a.silver + r.silver, bronze: a.bronze + r.bronze, total: a.total + r.total }), { gold: 0, silver: 0, bronze: 0, total: 0 });
      // สีทอง/เงิน/ทองแดงสำหรับ 3 อันดับแรก เฉพาะเมื่อมีเหรียญแล้ว
      const badge = (r) => {
        const podium = r.total > 0 ? { 1: 'from-yellow-300 to-amber-500 text-white', 2: 'from-gray-200 to-gray-400 text-white', 3: 'from-orange-300 to-orange-600 text-white' }[r.rank] : '';
        const tone = podium || 'from-gray-100 to-gray-200 text-brand-700 dark:from-gray-700 dark:to-gray-800 dark:text-gray-200';
        return `<span class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${tone} text-sm font-bold shadow">${r.rank}</span>`;
      };
      const th = (kind, label) => `<th class="px-3 py-3"><span class="inline-flex items-center gap-1.5">${UI.medalDot(kind, 'h-2.5 w-2.5')}${label}</span></th>`;
      const cell = (v, color, m) => `
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
                    (r) => `<tr class="hover:bg-brand-50/50 dark:hover:bg-white/5">
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
    pills(items, activeValue, attr = 'data-value') {
      return `<div class="flex flex-wrap justify-center gap-2">${items
        .map(
          (it) => `<button type="button" ${attr}="${esc(it.value)}" class="rounded-full px-4 py-2 text-sm font-medium shadow-sm ring-1 transition ${
            String(it.value) === String(activeValue)
              ? 'bg-brand-600 text-white ring-brand-600'
              : 'bg-white text-brand-700 ring-black/5 hover:bg-brand-50 dark:bg-gray-900 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-white/10'
          }">${it.label}</button>`
        )
        .join('')}</div>`;
    },

    // การ์ดชนิดกีฬา (หน้าแรก / ชนิดกีฬา / ระเบียบ / สูจิบัตร)
    // วงกลมแทนรูปชนิดกีฬา (ใช้เมื่อยังไม่มีรูป): แสดงรหัสกีฬา เช่น "01"
    sportBadge(text, size = 'h-20 w-20 text-2xl') {
      return `<span class="inline-flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-pink-500 font-bold text-white shadow-md">${esc(text)}</span>`;
    },

    // href ว่าง = การ์ดเฉย ๆ ไม่มีลิงก์, icon ว่าง = แสดง sportBadge แทนรูป
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
    toggle.addEventListener('click', () => {
      const open = more.classList.toggle('hidden') === false;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'ซ่อนรายละเอียด' : 'เรียนรู้เพิ่มเติม';
    });
    box.querySelector('[data-cookie-accept]').addEventListener('click', () => {
      try {
        localStorage.setItem('cookieConsent', 'accepted');
      } catch {}
      box.remove();
    });
  }

  // ---------- ค่อย ๆ แสดงเนื้อหาเมื่อเลื่อนลงมาถึง ----------
  const REVEAL_TARGETS = 'section, article, ol > li, .grid > *, table';

  function initReveal() {
    const app = document.getElementById('app');
    if (!app || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          el.classList.add('is-visible');
          io.unobserve(el);
          // แสดงเสร็จแล้วคืนสไตล์เดิม (ให้ hover/transition ของการ์ดทำงานตามปกติ)
          setTimeout(() => {
            el.classList.remove('reveal', 'is-visible');
            el.style.transitionDelay = '';
          }, 1200);
        }),
      { rootMargin: '0px 0px -10% 0px', threshold: 0 }
    );

    // ช่วงเปิดหน้าให้ทุกส่วนค่อย ๆ ขึ้น หลังจากนั้นส่วนที่ถูกวาดใหม่บนจอ (เช่น ตอนกรอง/ค้นหา) แสดงทันที
    let settled = false;
    setTimeout(() => (settled = true), 1200);

    const tag = () =>
      app.querySelectorAll(REVEAL_TARGETS).forEach((el) => {
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
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-reload]')) location.reload();
  });
  document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    renderFooter();
    renderCookieBanner();
    applyDark(isDark());
    initReveal();
  });
})();
