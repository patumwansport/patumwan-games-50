// หน้าแรก: รูป Hero, นับถอยหลัง, ชนิดกีฬา + ค้นหา, ผู้สนับสนุน
(function () {
  const { esc } = UI;
  const app = document.getElementById('app');
  const cfg = SiteConfig;
  const sports = SiteData.sports;
  const sponsors = SiteData.sponsors || [];

  app.className = 'mx-auto max-w-7xl px-4 sm:px-6';
  app.innerHTML = `
    <section class="pb-10 pt-8 lg:pb-12 lg:pt-10">
      <h1 class="sr-only">${esc(cfg.name)}</h1>
      <div id="hero"></div>
    </section>

    <section class="pb-12 text-center" aria-labelledby="countdown-label">
      <p id="countdown-label" class="text-sm font-medium text-[#000] dark:text-white">นับถอยหลังสู่การแข่งขัน</p>
      <p class="mt-3 text-base font-semibold text-brand-600 sm:text-xl dark:text-brand-200">ปทุมวันเกมส์ การแข่งขันกีฬาสาธิตสามัคคี ครั้งที่ 50 ประจำปี 2570</p>
      <div id="countdown" class="mx-auto mt-8 flex max-w-3xl items-start justify-center gap-2 sm:gap-4"></div>
    </section>

    <section class="border-t border-gray-200 py-12 dark:border-white/10">
      <div class="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <h2 class="text-2xl font-semibold tracking-tight text-brand-800 sm:text-3xl dark:text-white">ชนิดกีฬา</h2>
        ${UI.search('sport-search', 'ค้นหา เช่น ฟุตบอล', 'ค้นหาชนิดกีฬา', 'w-full sm:w-72')}
      </div>
      <p id="search-summary" class="-mt-4 mb-8 hidden text-sm text-neutral-900 dark:text-gray-300" aria-live="polite"></p>
      <div id="sport-grid" class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"></div>
    </section>

    <section class="border-t border-gray-200 pb-4 pt-12 dark:border-white/10">
      <h2 class="text-center text-2xl font-semibold tracking-tight text-brand-800 sm:text-3xl dark:text-white">ขอขอบคุณผู้สนับสนุนการแข่งขัน</h2>
      <div class="mt-4 overflow-hidden py-5 [mask-image:linear-gradient(to_right,transparent,#000_7%,#000_93%,transparent)]" aria-label="ผู้สนับสนุนการแข่งขัน">
        <div id="sponsors" class="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none"></div>
      </div>
    </section>`;

  // ---------- รูป Hero (config.js → heroImages) ----------
  const hero = document.getElementById('hero');
  const imgs = (cfg.heroImages || []).filter(Boolean);
  if (!imgs.length) {
    hero.innerHTML = `
      <div class="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 text-center text-brand-400 sm:aspect-[21/9] dark:border-white/15 dark:bg-gray-900 dark:text-gray-500">
        <svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5"/><circle cx="9" cy="9" r="2" stroke-width="1.5"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m21 15-5-5L5 21"/></svg>
        <p class="text-base font-medium text-brand-500 dark:text-gray-400">พื้นที่รูป Hero</p>
        <p class="max-w-md text-sm">2520 × 1080 px</p>
      </div>`;
  } else {
    hero.innerHTML = `
      <div class="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-gray-100 sm:aspect-[21/9] dark:bg-gray-900">
        ${imgs.map((src, i) => `<img src="${UI.safeUrl(src)}" alt="${i ? '' : esc(cfg.name)}" data-slide class="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i ? 'opacity-0' : 'opacity-100'}">`).join('')}
      </div>`;
    if (imgs.length > 1) {
      const slides = hero.querySelectorAll('[data-slide]');
      let cur = 0;
      setInterval(() => {
        slides[cur].classList.replace('opacity-100', 'opacity-0');
        cur = (cur + 1) % slides.length;
        slides[cur].classList.replace('opacity-0', 'opacity-100');
      }, 5000);
    }
  }

  // ---------- นับถอยหลัง (config.js → startDate) ----------
  const countdown = document.getElementById('countdown');
  const target = cfg.startDate ? new Date(cfg.startDate).getTime() : NaN;
  const units = [['วัน', 86400000], ['ชั่วโมง', 3600000], ['นาที', 60000], ['วินาที', 1000]];
  const box = (value, label) => `
    <div class="w-[4.5rem] rounded-2xl border border-gray-200 bg-white py-4 sm:w-32 sm:py-5 dark:border-white/10 dark:bg-gray-900">
      <div class="text-3xl font-semibold leading-none tabular-nums text-[#000] sm:text-6xl dark:text-white">${value}</div>
      <div class="mt-2 text-xs text-[#000] sm:mt-3 sm:text-sm dark:text-gray-300">${label}</div>
    </div>`;
  const sep = '<span class="pt-4 text-2xl font-light text-[#000] sm:pt-7 sm:text-4xl dark:text-gray-500" aria-hidden="true">:</span>';
  let timer;
  function tick() {
    let diff = target - Date.now();
    if (Number.isNaN(diff)) {
      countdown.innerHTML = units.map(([label]) => box('--', label)).join(sep);
      return;
    }
    if (diff <= 0) {
      clearInterval(timer);
      document.getElementById('countdown-label').textContent = 'การแข่งขันเริ่มแล้ว';
      countdown.innerHTML = `<a href="match-result.html" class="rounded-full bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700">ติดตามผลการแข่งขันวันนี้</a>`;
      return;
    }
    countdown.innerHTML = units
      .map(([label, ms]) => {
        const v = Math.floor(diff / ms);
        diff -= v * ms;
        return box(String(v).padStart(2, '0'), label);
      })
      .join(sep);
  }
  tick();
  if (!Number.isNaN(target)) timer = setInterval(tick, 1000);

  // ---------- ชนิดกีฬา + ค้นหา ----------
  const grid = document.getElementById('sport-grid');
  const summary = document.getElementById('search-summary');

  function renderSports(query = '') {
    const q = query.trim().toLowerCase();
    const found = sports.filter((s) => s.name.toLowerCase().includes(q));
    grid.innerHTML = found.length
      ? found
          // การ์ดแบบเดียวกับหน้า "ชนิดกีฬาที่แข่งขัน"
          .map((s) => UI.sportCard({ href: `match-result-sport.html?id=${s.apiId}`, icon: s.icon, title: s.name, code: s.code }))
          .join('')
      : `<div class="col-span-full">${UI.empty(`ไม่พบกีฬา "${query}"`)}</div>`;
    summary.classList.toggle('hidden', !q);
    summary.innerHTML = `ผลการค้นหา <span class="font-bold text-brand-600 dark:text-brand-200">"${esc(query)}"</span> พบ ${found.length} รายการ`;
  }
  document.getElementById('sport-search').addEventListener('input', (e) => renderSports(e.target.value));
  renderSports();

  // ---------- ผู้สนับสนุน (content.js → sponsors) ----------
  const sponsorItem = (sp) => {
    const name = typeof sp === 'string' ? sp : sp.name;
    const logo = typeof sp === 'string' ? '' : sp.logo;
    return `<div class="mx-16 flex h-12 shrink-0 items-center">${
      logo
        ? `<img src="${UI.safeUrl(logo)}" alt="${esc(name)}" class="h-10 w-auto">`
        : `<span class="flex items-center gap-2.5 whitespace-nowrap text-lg font-semibold text-brand-400 dark:text-gray-500"><span class="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-800" aria-hidden="true"></span>${esc(name)}</span>`
    }</div>`;
  };
  // ซ้ำรายการ 2 ชุดให้เลื่อนต่อกันได้ไม่ขาด (animate-marquee เลื่อนไป -50%)
  const set = sponsors.map(sponsorItem).join('').repeat(Math.max(1, Math.ceil(12 / Math.max(1, sponsors.length))));
  document.getElementById('sponsors').innerHTML = `<div class="flex shrink-0">${set}</div><div class="flex shrink-0" aria-hidden="true">${set}</div>`;
})();
