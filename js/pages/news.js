// หน้า "ข่าวสารและกิจกรรม" — ข้อมูลจาก API /news, เปิดอ่านข่าวในหน้าต่าง (รองรับ news.html?id=)
(function () {
  const { esc } = UI;
  const app = document.getElementById('app');

  const fmtDate = (iso) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return `${date} เวลา ${time}`;
  };

  app.innerHTML = `${UI.pageTitle('ข่าวสารและกิจกรรม')}<div id="news">${UI.loading()}</div><div id="modal"></div>`;
  const listEl = document.getElementById('news');
  const modalEl = document.getElementById('modal');

  function card(n) {
    return `
      <article class="${UI.card} flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-xl">
        <button type="button" data-open="${esc(n.id)}" class="block aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img src="${UI.safeUrl(n.coverImage)}" alt="${esc(n.title)}" loading="lazy" class="h-full w-full object-cover transition hover:scale-105">
        </button>
        <div class="flex flex-1 flex-col p-5">
          <h2 class="text-lg font-semibold text-brand-800 dark:text-white">${esc(n.title)}</h2>
          <p class="line-clamp-3 mt-2 text-sm text-neutral-900 dark:text-gray-300">${esc(n.content)}</p>
          <div class="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-brand-500 dark:text-gray-400">
            <span>${fmtDate(n.createdAt)}</span>
            <button type="button" data-open="${esc(n.id)}" class="rounded-full bg-brand-50 px-3 py-1.5 font-medium text-brand-700 hover:bg-brand-100 dark:bg-white/10 dark:text-brand-100">อ่านต่อ</button>
          </div>
        </div>
      </article>`;
  }

  function openNews(n) {
    history.replaceState(null, '', `?id=${encodeURIComponent(n.id)}`);
    document.body.style.overflow = 'hidden';
    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" data-overlay>
        <div class="mx-auto my-8 max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900" role="dialog" aria-modal="true" aria-label="${esc(n.title)}">
          <div class="relative">
            <img src="${UI.safeUrl(n.coverImage)}" alt="" class="max-h-[420px] w-full object-cover">
            <button type="button" data-close class="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white hover:bg-black/70" aria-label="ปิด">${UI.icon.close}</button>
          </div>
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
      listEl.innerHTML = `<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${news.map(card).join('')}</div>`;
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
