// หน้า "เพลงประจำการแข่งขัน"
(function () {
  const { esc } = UI;
  const a = SiteData.anthem;
  const videoSrc = UI.embedUrl(a.youtubeEmbed); // ว่าง = ลิงก์ไม่ใช่ YouTube จึงไม่แสดง

  const lyrics = a.lyrics.length
    ? `<section class="${UI.card} p-6 sm:p-8">
        <h2 class="mb-6 text-2xl font-bold text-brand-800 dark:text-white">เนื้อเพลงและคอร์ด</h2>
        <div class="space-y-6">${a.lyrics
          .map((part) => `<div><h3 class="mb-2 font-semibold text-brand-600 dark:text-brand-100">${esc(part.title)}</h3>
            <pre class="overflow-x-auto whitespace-pre font-sans text-sm leading-7 text-neutral-900 dark:text-gray-300">${esc(part.lines.join('\n'))}</pre></div>`)
          .join('')}</div>
      </section>`
    : '';

  document.getElementById('app').innerHTML = `
    ${UI.pageTitle('เพลงประจำการแข่งขัน', `<span class="text-xl font-semibold text-brand-600 dark:text-brand-100">${esc(a.title)}</span><br><span class="italic">${esc(a.subtitle)}</span>`)}
    <div class="mx-auto max-w-4xl space-y-8">
      <section class="${UI.card} p-4 sm:p-6">
        <h2 class="mb-4 text-xl font-bold text-brand-800 dark:text-white">ฟังเพลงประจำการแข่งขัน</h2>
        ${videoSrc ? `<div class="aspect-video overflow-hidden rounded-xl bg-black">
          <iframe class="h-full w-full" src="${videoSrc}" referrerpolicy="strict-origin-when-cross-origin" title="${esc(a.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
        <a href="${UI.safeUrl(a.youtubeUrl)}" ${UI.NEW_TAB} class="mt-4 inline-flex items-center gap-2 rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white hover:bg-pink-600">${UI.icon.play} ดูบน YouTube</a>` : `<div class="flex aspect-video items-center justify-center rounded-xl border-2 border-dashed border-pink-200 bg-pink-50/50 text-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">ยังไม่มีวิดีโอเพลงประจำการแข่งขัน</div>`}
      </section>

      ${a.about.length ? `<section class="${UI.card} p-6 sm:p-8">
        <h2 class="mb-4 text-2xl font-bold text-brand-800 dark:text-white">เกี่ยวกับเพลง</h2>
        ${a.about.map((p) => `<p class="mb-3 leading-relaxed text-neutral-900 dark:text-gray-300">${esc(p)}</p>`).join('')}
      </section>` : ''}

      ${a.structure.length ? `<section class="${UI.card} p-6 sm:p-8">
        <h2 class="mb-5 text-2xl font-bold text-brand-800 dark:text-white">โครงสร้างเพลง</h2>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">${a.structure
          .map((s, i) => `<div class="rounded-xl bg-gradient-to-br from-brand-50 to-pink-50 p-5 text-center dark:from-white/5 dark:to-white/5">
              <div class="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">${i + 1}</div><h3 class="mt-2 font-semibold text-brand-800 dark:text-white">${esc(s.name)}</h3>
              <p class="mt-1 text-sm text-neutral-900 dark:text-gray-300">${esc(s.desc)}</p></div>`)
          .join('')}</div>
      </section>` : ''}
      ${lyrics}
    </div>`;
})();
