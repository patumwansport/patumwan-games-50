// หน้า "ประวัติการแข่งขัน" — แบบเปิดโล่ง ไม่มีกล่อง (เส้นเวลาวาดตามการเลื่อน)
(function () {
  const { esc } = UI;
  const h = SiteData.history;
  // สีจุด/หัวข้อบนเส้นเวลา วนสลับน้ำเงิน-ชมพู
  const TONES = [
    { dot: 'bg-brand-600', title: 'text-brand-600 dark:text-brand-200' },
    { dot: 'bg-pink-500', title: 'text-pink-600 dark:text-pink-300' },
    { dot: 'bg-brand-400', title: 'text-brand-500 dark:text-brand-200' },
    { dot: 'bg-pink-700', title: 'text-pink-700 dark:text-pink-300' },
  ];

  // ขนาด/ระยะเดียวกับหน้าแรก: ส่วนคั่นด้วยเส้นบน + py-12, หัวข้อชิดซ้าย
  const section = (title, body) => `
    <section class="py-12">
      <div class="mb-8 flex items-center gap-6">
        <h2 class="shrink-0 text-2xl font-semibold tracking-tight text-brand-800 sm:text-3xl dark:text-white">${title}</h2>
        <span class="h-px flex-1 bg-gray-200 dark:bg-white/10" aria-hidden="true"></span>
      </div>
      ${body}
    </section>`;

  const paragraphs = (list) => list.map((p) => `<p class="mb-4 text-base leading-loose text-neutral-900 last:mb-0 dark:text-gray-300">${esc(p)}</p>`).join('');

  // รูปในแต่ละครั้ง: 'path' หรือ { src, caption } (caption = ชื่อใต้รูป)
  const images = (t) =>
    t.images.length
      ? `<div class="mt-5 flex flex-wrap items-start gap-x-8 gap-y-6">${t.images
          .map((img) => {
            const { src, caption = '' } = typeof img === 'string' ? { src: img } : img;
            // กรอบขนาดเท่ากันทุกรูป ให้รูปและชื่อเรียงตรงแนวเดียวกัน
            return `<figure class="w-36 text-center sm:w-40">
              <a href="${UI.safeUrl(src)}" ${UI.NEW_TAB} class="flex h-36 items-center justify-center transition hover:scale-105 sm:h-40"><img src="${UI.safeUrl(src)}" alt="${esc(caption || t.title)}" loading="lazy" class="max-h-full max-w-full object-contain"></a>
              ${caption ? `<figcaption class="mt-3 text-sm font-semibold text-brand-800 dark:text-gray-200">${esc(caption)}</figcaption>` : ''}
            </figure>`;
          })
          .join('')}</div>`
      : '';

  const timelineItem = (t, i) => {
    const tone = TONES[i % TONES.length];
    const [head, sub = ''] = t.title.split(' - ');
    const dot = t.current ? 'bg-pink-500 ring-4 ring-pink-200 dark:ring-pink-500/30' : t.postponed ? 'bg-pink-700' : tone.dot;
    const ping = t.current ? '<span class="absolute inset-0 hidden animate-ping rounded-full bg-pink-400 opacity-60 group-data-[on]:block"></span>' : '';
    const title = t.current || t.postponed ? 'text-pink-600 dark:text-pink-300' : tone.title;
    const pill = t.current
      ? 'border-pink-200 bg-pink-50 text-pink-600 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-200'
      : 'border-gray-200 bg-white text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400';
    return `
      <li class="relative pl-12">
        <span data-dot="${dot}" class="group absolute left-[7px] top-1.5 z-10 h-4 w-4 scale-75 rounded-full border-2 border-white bg-gray-300 transition-all duration-500 dark:border-gray-900 dark:bg-gray-700">${ping}</span>
        ${sub ? `<span class="inline-block rounded-full border px-3 py-1 text-xs font-medium tracking-wide ${pill}">${esc(sub)}</span>` : ''}
        <h3 class="mt-3 text-2xl font-bold ${title}">${esc(head)}</h3>
        <div class="mt-3 space-y-3 text-base leading-loose text-neutral-900 dark:text-gray-300">${t.text.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
        ${images(t)}
        ${t.current ? '<p class="mt-5 inline-block rounded-full bg-pink-500 px-4 py-1 text-sm font-semibold text-white">การแข่งขันครั้งปัจจุบัน</p>' : ''}
      </li>`;
  };

  const app = document.getElementById('app');
  app.className = 'mx-auto max-w-7xl px-4 sm:px-6'; // เท่ากับหน้าแรก
  app.innerHTML = `
    <div class="pt-10">${UI.pageTitle('ประวัติการแข่งขัน', esc(h.subtitle))}</div>
    <div>
      ${section('ความเป็นมา', paragraphs(h.background))}

      ${section('คณะกรรมการอำนวยการถาวร', `<div class="grid gap-x-10 gap-y-6 sm:grid-cols-2">${h.committee
        .map((c) => `<div class="border-l-2 border-pink-300 pl-4 dark:border-pink-500/50">
            <h3 class="font-semibold text-brand-800 dark:text-white">${esc(c.name)}</h3>
            <p class="mt-1 text-sm leading-relaxed text-neutral-900 dark:text-gray-300">${esc(c.role)}</p></div>`)
        .join('')}</div>`)}

      ${section('วัตถุประสงค์', `<ol class="grid gap-x-10 gap-y-6 sm:grid-cols-2">${h.objectives
        .map((o) => {
          // รูปแบบเดียวกับคณะกรรมการ: บรรทัดหลัก + หมายเหตุในวงเล็บเป็นบรรทัดเล็ก
          const [, text, note] = /^(.*?)\s*(?:\((.+)\))?$/.exec(o);
          return `<li class="self-start border-l-2 border-pink-300 pl-4 dark:border-pink-500/50">
            <h3 class="font-semibold text-brand-800 dark:text-white">${esc(text)}</h3>
            ${note ? `<p class="mt-1 text-sm leading-relaxed text-neutral-900 dark:text-gray-300">${esc(note)}</p>` : ''}
          </li>`;
        })
        .join('')}</ol>`)}

      ${section('ถ้วยเกียรติยศและสัญลักษณ์', paragraphs(h.trophy))}

      ${section('ประวัติการจัดการแข่งขัน', `
        <ol id="timeline" class="relative space-y-16 pt-2">
          <span class="absolute bottom-0 left-[14px] top-0 w-0.5 rounded-full bg-gray-200 dark:bg-white/10" aria-hidden="true"></span>
          <span id="timeline-progress" class="absolute left-[14px] top-0 w-0.5 rounded-full bg-gradient-to-b from-brand-600 to-pink-500" style="height:0" aria-hidden="true"></span>
          ${h.timeline.map(timelineItem).join('')}
        </ol>`)}
    </div>`;

  // ---------- เส้นเวลาวาดตามการเลื่อน + จุดสว่างขึ้นเมื่อเส้นมาถึง ----------
  const list = document.getElementById('timeline');
  const progress = document.getElementById('timeline-progress');
  const dots = [...list.querySelectorAll('[data-dot]')];
  let ticking = false;

  function update() {
    ticking = false;
    const rect = list.getBoundingClientRect();
    // ใช้กึ่งกลางจอเป็นจุดอ้างอิง เหมือน scroll-timeline ต้นแบบ
    // เลื่อนถึงท้ายหน้าแล้ว = วาดเส้นจนสุด (รายการสุดท้ายอาจเลื่อนไม่ถึงกลางจอ)
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    const reached = atBottom ? rect.height : Math.max(0, Math.min(rect.height, innerHeight / 2 - rect.top));
    progress.style.height = `${reached}px`;
    dots.forEach((dot) => {
      const on = dot.offsetTop + dot.offsetParent.offsetTop <= reached;
      if (on === dot.hasAttribute('data-on')) return;
      dot.toggleAttribute('data-on', on);
      dot.classList.toggle('scale-75', !on);
      dot.classList.toggle('scale-125', on);
      dot.dataset.dot.split(' ').forEach((c) => dot.classList.toggle(c, on));
      ['bg-gray-300', 'dark:bg-gray-700'].forEach((c) => dot.classList.toggle(c, !on));
    });
  }

  const schedule = () => {
    if (!ticking) requestAnimationFrame(update);
    ticking = true;
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  list.addEventListener('load', schedule, true); // รูปโหลดเสร็จแล้วความสูงเปลี่ยน
  update();
})();
