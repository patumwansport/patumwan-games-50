// หน้า "ข่าวสารและกิจกรรม" — ข้อมูลจาก API /news, เปิดอ่านข่าวในหน้าต่าง (รองรับ news.html?id=)
(function () {
  const { esc } = UI;
  const app = document.getElementById('app');

  // วันที่แบบไม่มีเวลา (เช่น '2026-10-25') แสดงเฉพาะวันที่
  const fmtDate = (iso) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!String(iso).includes('T')) return date;
    const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return `${date} เวลา ${time}`;
  };
  const playIcon = '<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5.14v13.72a1 1 0 001.52.85l10.6-6.86a1 1 0 000-1.7L9.52 4.29A1 1 0 008 5.14z"/></svg>';
  const arrowIcon = '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-6-6l6 6-6 6"/></svg>';

  app.innerHTML = `${UI.pageTitle('ข่าวสารและกิจกรรม')}<div id="news">${UI.loading()}</div><div id="modal"></div>`;
  const listEl = document.getElementById('news');
  const modalEl = document.getElementById('modal');

  // การ์ดแนวตั้ง: รูปเต็มการ์ด + ไล่เงาดำด้านล่างให้อ่านตัวอักษรได้
  // ชี้เมาส์ (จอ sm ขึ้นไป): รูปซูม การ์ดลอยขึ้น และปุ่มเลื่อนขึ้นมา / มือถือแสดงปุ่มตลอด
  function card(n) {
    const action = n.video ? 'ดูวิดีโอ' : 'อ่านต่อ';
    return `
      <article class="group relative h-[28rem] overflow-hidden rounded-2xl bg-brand-800 shadow-lg ring-1 ring-black/5 transition duration-300 hover:-translate-y-2 hover:shadow-2xl sm:h-[32rem] dark:ring-white/10">
        <img src="${UI.safeUrl(n.coverImage)}" alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110">
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
        <button type="button" data-open="${esc(n.id)}" aria-label="${esc(`${action}: ${n.title}`)}" class="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300"></button>
        ${n.video ? `<span class="pointer-events-none absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/40 backdrop-blur-sm">${playIcon}วิดีโอ</span>` : ''}
        <div class="pointer-events-none absolute inset-x-0 bottom-0 p-6">
          <div class="transition-transform duration-500 sm:translate-y-16 sm:group-hover:translate-y-0 sm:group-focus-within:translate-y-0">
            <p class="text-xs text-white/70">${fmtDate(n.createdAt)}</p>
            <h2 class="mt-1 text-2xl font-bold leading-snug text-white">${esc(n.title)}</h2>
            <p class="line-clamp-3 mt-2 text-sm leading-relaxed text-white/80">${esc(n.content)}</p>
            <span class="mt-5 inline-flex items-center gap-2 rounded-full bg-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-opacity duration-500 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">${n.video ? playIcon : ''}${action}${n.video ? '' : arrowIcon}</span>
          </div>
        </div>
      </article>`;
  }

  // ส่วนหัวของหน้าต่างข่าว: วิดีโอ (ถ้ามี) หรือรูปปก
  // วิดีโอวางปุ่มปิดไว้ในแถบด้านบน ไม่ให้ทับปุ่มของตัวเล่น Google Drive ที่มุมขวาบน
  function media(n) {
    const closeBtn = (cls) => `<button type="button" data-close class="${cls} rounded-full p-2 text-white" aria-label="ปิด">${UI.icon.close}</button>`;
    const src = n.video && UI.embedUrl(n.video);
    return src
      ? `<div class="bg-black">
          <div class="flex justify-end p-2">${closeBtn('hover:bg-white/15')}</div>
          <div class="aspect-video w-full"><iframe src="${src}" title="${esc(n.title)}" class="h-full w-full" allow="autoplay; fullscreen" allowfullscreen></iframe></div>
        </div>`
      : `<div class="relative">
          <img src="${UI.safeUrl(n.coverImage)}" alt="" class="max-h-[420px] w-full object-cover">
          ${closeBtn('absolute right-3 top-3 bg-black/50 hover:bg-black/70')}
        </div>`;
  }

  function openNews(n) {
    history.replaceState(null, '', `?id=${encodeURIComponent(n.id)}`);
    document.body.style.overflow = 'hidden';
    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" data-overlay>
        <div class="mx-auto my-8 max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900" role="dialog" aria-modal="true" aria-label="${esc(n.title)}">
          ${media(n)}
          <div class="p-6 sm:p-8">
            <p class="text-sm text-brand-500 dark:text-gray-400">${fmtDate(n.createdAt)}</p>
            <h2 class="mt-1 text-2xl font-bold text-brand-800 dark:text-white">${esc(n.title)}</h2>
            <div class="prose-news mt-4 text-neutral-900 dark:text-gray-300">${esc(n.content)}</div>
            ${n.pictures?.length ? `
              <h3 class="mb-3 mt-8 font-semibold text-brand-800 dark:text-white">ภาพกิจกรรม (${n.pictures.length} ภาพ)</h3>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">${n.pictures
                .map((p) => `<a href="${UI.safeUrl(p.url)}" ${UI.NEW_TAB} class="block aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"><img src="${UI.safeUrl(p.url)}" alt="" loading="lazy" class="h-full w-full object-cover transition hover:scale-110"></a>`)
                .join('')}</div>` : ''}
          </div>
        </div>
      </div>`;
    const close = () => {
      modalEl.innerHTML = '';
      document.body.style.overflow = '';
      history.replaceState(null, '', location.pathname);
      removeEventListener('keydown', onKey);
    };
    const onKey = (e) => e.key === 'Escape' && close();
    addEventListener('keydown', onKey);
    const overlay = modalEl.querySelector('[data-overlay]');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('[data-close]')) close();
    });
  }

  Api.getNews()
    .then((news) => {
      if (!news.length) return (listEl.innerHTML = UI.empty('ยังไม่มีข่าวสาร'));
      // ข่าวใหม่สุดก่อน ข่าวเดียวให้อยู่กลางหน้า
      const layout = news.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'mx-auto max-w-md';
      listEl.innerHTML = `<div class="grid gap-6 ${layout}">${news.slice().reverse().map(card).join('')}</div>`;
      listEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-open]');
        if (btn) openNews(news.find((n) => String(n.id) === btn.dataset.open));
      });
      const id = UI.qs('id');
      const target = id && news.find((n) => String(n.id) === id);
      if (target) openNews(target);
    })
    .catch((err) => (listEl.innerHTML = UI.error(err.message)));
})();
