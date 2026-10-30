// หน้า "ข่าวสารและกิจกรรม" — ข้อมูลจาก API /news, เปิดอ่านข่าวในหน้าต่าง (รองรับ news.html?id=)
(/* เริ่มต้นหน้าnewsและจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ function () {
  const { esc } = UI;
  const app = document.getElementById('app');

  // วันที่แบบไม่มีเวลา (เช่น '2026-10-25') แสดงเฉพาะวันที่
  const fmtDate = /* จัดรูปแบบวันที่สำหรับแสดงข่าว */ (iso) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!String(iso).includes('T')) return date;
    const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return `${date} เวลา ${time}`;
  };
  const playIcon = "<svg class=\"h-4 w-4\" viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\"><path d=\"M13 8.00049L15.0687 9.37977C16.6361 10.4248 17.4198 10.9473 17.5615 11.6591C17.6064 11.8847 17.6064 12.117 17.5614 12.3426C17.4197 13.0544 16.6359 13.5768 15.0684 14.6217L13 16.0005\" stroke=\"currentColor\" stroke-opacity=\"0.18\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n<path d=\"M13 8.00044L11.8974 7.26532C9.99908 5.99961 9.04991 5.36675 8.27397 5.58609C8.03066 5.65487 7.80514 5.77556 7.61294 5.93985C7 6.46377 7 7.60457 7 9.88619L7 14.1145C7 16.3959 7 17.5366 7.61288 18.0605C7.80507 18.2248 8.03057 18.3455 8.27387 18.4143C9.04975 18.6336 9.99889 18.001 11.8972 16.7356L13 16.0004\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";
  const arrowIcon = "<svg class=\"h-4 w-4\" viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\"><path d=\"M4 12H20M20 12L17 9M20 12L17 15\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";

  app.innerHTML = `${UI.pageTitle('ข่าวสารและกิจกรรม')}<div id="news">${UI.loading()}</div><div id="modal"></div>`;
  const listEl = document.getElementById('news');
  const modalEl = document.getElementById('modal');

  // การ์ดแนวตั้ง: รูปเต็มการ์ด + ไล่เงาดำด้านล่างให้อ่านตัวอักษรได้
  // ชี้เมาส์ (จอ sm ขึ้นไป): รูปซูม การ์ดลอยขึ้น และปุ่มเลื่อนขึ้นมา / มือถือแสดงปุ่มตลอด
  // สร้างการ์ดแสดงข้อมูลหนึ่งรายการ
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
  // สร้างส่วนแสดงรูปหรือวิดีโอของข่าว
  function media(n) {
    const src = n.video && UI.embedUrl(n.video);
    return src
      ? `<div class="aspect-video w-full bg-black"><iframe src="${src}" title="${esc(n.title)}" class="h-full w-full" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`
      : `<img src="${UI.safeUrl(n.coverImage)}" alt="" class="max-h-[420px] w-full object-cover">`;
  }

  // เปิดรายละเอียดข่าวที่เลือก
  function openNews(n) {
    history.replaceState(null, '', `?id=${encodeURIComponent(n.id)}`);
    document.body.style.overflow = 'hidden';
    modalEl.innerHTML = `
      <div class="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" data-overlay>
        <!-- ปุ่มปิดอยู่มุมจอ นอกหน้าต่าง: ไม่ทับปุ่มของตัวเล่นวิดีโอที่มุมขวาบน -->
        <button type="button" data-close class="fixed right-4 top-4 z-10 rounded-full bg-white/15 p-2 text-white ring-1 ring-white/30 transition hover:bg-white/30" aria-label="ปิด">${UI.icon.close}</button>
        <div class="mx-auto mb-8 mt-16 max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900" role="dialog" aria-modal="true" aria-label="${esc(n.title)}">
          ${media(n)}
          <div class="p-6 sm:p-8">
            <p class="text-sm text-brand-500 dark:text-gray-400">${fmtDate(n.createdAt)}</p>
            <h2 class="mt-1 text-2xl font-bold text-brand-800 dark:text-white">${esc(n.title)}</h2>
            <div class="prose-news mt-4 text-neutral-900 dark:text-gray-300">${esc(n.content)}</div>
            ${n.pictures?.length ? `
              <h3 class="mb-3 mt-8 font-semibold text-brand-800 dark:text-white">ภาพกิจกรรม (${n.pictures.length} ภาพ)</h3>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">${n.pictures
                .map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหน้าnews */ (p) => `<a href="${UI.safeUrl(p.url)}" ${UI.NEW_TAB} class="block aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"><img src="${UI.safeUrl(p.url)}" alt="" loading="lazy" class="h-full w-full object-cover transition hover:scale-110"></a>`)
                .join('')}</div>` : ''}
          </div>
        </div>
      </div>`;
    const close = /* ปิดหน้าต่างและคืนสถานะการแสดงผล */ () => {
      modalEl.innerHTML = '';
      document.body.style.overflow = '';
      history.replaceState(null, '', location.pathname);
      removeEventListener('keydown', onKey);
    };
    const onKey = /* จัดการปุ่มคีย์บอร์ดของหน้าต่างที่เปิดอยู่ */ (e) => e.key === 'Escape' && close();
    addEventListener('keydown', onKey);
    const overlay = modalEl.querySelector('[data-overlay]');
    overlay.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ (e) => {
      if (e.target === overlay || e.target.closest('[data-close]')) close();
    });
  }

  Api.getNews()
    .then(/* ประมวลผลต่อเมื่อคำขอก่อนหน้าสำเร็จในหน้าnews */ (news) => {
      if (!news.length) return (listEl.innerHTML = UI.empty('ยังไม่มีข่าวสาร'));
      // ข่าวใหม่สุดก่อน ข่าวเดียวให้อยู่กลางหน้า
      const layout = news.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'mx-auto max-w-md';
      listEl.innerHTML = `<div class="grid gap-6 ${layout}">${news.slice().reverse().map(card).join('')}</div>`;
      listEl.addEventListener('click', /* ตอบสนองเหตุการณ์ 'click' และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ (e) => {
        const btn = e.target.closest('[data-open]');
        if (btn) openNews(news.find(/* ค้นหารายการแรกที่ตรงตามเงื่อนไขในหน้าnews */ (n) => String(n.id) === btn.dataset.open));
      });
      const id = UI.qs('id');
      const target = id && news.find(/* ค้นหารายการแรกที่ตรงตามเงื่อนไขในหน้าnews */ (n) => String(n.id) === id);
      if (target) openNews(target);
    })
    .catch(/* จัดการข้อผิดพลาดจากงานแบบ asynchronousในหน้าnews */ (err) => (listEl.innerHTML = UI.error(err.message)));
})();
