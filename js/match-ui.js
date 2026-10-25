// การ์ดแสดงผลการแข่งขัน ใช้ร่วมกันในหน้าผลการแข่งขันตามชนิดกีฬา / ประจำวัน
(function () {
  const { esc } = window.UI;
  const MEDAL = {
    'เหรียญทอง': { kind: 'gold', label: 'ทอง' },
    'เหรียญเงิน': { kind: 'silver', label: 'เงิน' },
    'เหรียญทองแดง': { kind: 'bronze', label: 'ทองแดง' },
  };

  function sortMatches(list) {
    return list
      .slice()
      .sort((a, b) => Api.thaiDateKey(a.gameDate) - Api.thaiDateKey(b.gameDate) || (a.gameTime || '').localeCompare(b.gameTime || '') || (a.displayName || '').localeCompare(b.displayName || '', 'th'));
  }

  // แมตช์แบบทีมพบทีม: มีผล 2 ฝั่ง เป็นตัวเลข และไม่มีสถิติรายบุคคล
  function isHeadToHead(m) {
    const r = m.results || [];
    return r.length === 2 && r.every((x) => !x.gameStatistic && !(x.reward || '').trim() && /^\d+$/.test(x.gameResult || ''));
  }

  function badge(text, tone) {
    return text ? `<span class="rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}">${esc(text)}</span>` : '';
  }

  function headToHead(m) {
    const [a, b] = m.results;
    const sa = Number(a.gameResult);
    const sb = Number(b.gameResult);
    const side = (x, win) => `<div class="flex-1 ${win ? 'font-bold text-brand-800 dark:text-white' : 'text-neutral-900 dark:text-gray-300'}">${esc(x.playerName)}</div>`;
    return `
      <div class="mt-4 flex items-center gap-4 rounded-xl bg-gray-50 px-4 py-3 text-center dark:bg-white/5">
        ${side(a, sa > sb)}
        <div class="shrink-0 rounded-lg bg-white px-4 py-1 text-2xl font-bold tabular-nums text-neutral-900 shadow-sm dark:bg-gray-800 dark:text-brand-100">${sa} - ${sb}</div>
        ${side(b, sb > sa)}
      </div>`;
  }

  function ranking(m) {
    const rows = (m.results || []).slice().sort((x, y) => (Number(x.gameResult) || 999) - (Number(y.gameResult) || 999));
    if (!rows.length) return '';
    return `
      <div class="mt-4 overflow-x-auto">
        <table class="w-full min-w-[480px] text-sm">
          <thead class="text-xs text-brand-500 dark:text-gray-400"><tr class="border-b border-gray-100 dark:border-white/10">
            <th class="py-2 pr-2 text-left">อันดับ</th><th class="py-2 text-left">ผู้เข้าแข่งขัน</th><th class="py-2 text-right">ผล/สถิติ</th><th class="py-2 pl-2 text-center">เหรียญ</th>
          </tr></thead>
          <tbody>${rows
            .map((r) => {
              const medal = MEDAL[(r.reward || '').trim()];
              return `<tr class="border-b border-gray-50 last:border-0 dark:border-white/5 ${medal ? 'bg-pink-50/70 dark:bg-pink-500/5' : ''}">
                <td class="py-2 pr-2 font-semibold tabular-nums">${esc(r.gameResult || '-')}</td>
                <td class="py-2">${esc(r.playerName)}</td>
                <td class="py-2 text-right tabular-nums text-neutral-900 dark:text-gray-300">${esc(r.gameStatistic || '')}</td>
                <td class="py-2 pl-2 text-center">${medal ? `<span class="inline-flex items-center gap-1.5 text-xs font-medium">${UI.medalDot(medal.kind)}${medal.label}</span>` : ''}</td>
              </tr>`;
            })
            .join('')}</tbody>
        </table>
      </div>`;
  }

  function card(m) {
    return `
      <article class="${UI.card} p-5">
        <div class="flex items-start gap-4">
          ${UI.sportBadge(m.sportCode || m.sportName.charAt(0), 'h-12 w-12 text-sm')}
          <div class="min-w-0 flex-1">
            <h3 class="font-semibold text-brand-800 dark:text-white">${esc(m.displayName)}</h3>
            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-900 dark:text-gray-300">
              <span>${esc(m.gameDate)}</span><span>เวลา ${esc(m.gameTime)} น.</span>${m.stadium ? `<span>สนาม: ${esc(m.stadium)}</span>` : ''}
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              ${badge(m.gameRound && `รอบ${/^\d+$/.test(m.gameRound) ? ' ' : ''}${m.gameRound}`, 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100')}
              ${badge(m.gameGroup && `กลุ่ม ${m.gameGroup}`, 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100')}
              ${badge(m.gameStatus, 'bg-pink-50 text-pink-700 dark:bg-pink-500/20 dark:text-pink-100')}
            </div>
          </div>
        </div>
        ${isHeadToHead(m) ? headToHead(m) : ranking(m)}
      </article>`;
  }

  // แสดงรายการแบบแบ่งหน้า (กด "แสดงเพิ่มเติม")
  function list(container, matches, { pageSize = 20 } = {}) {
    let shown = 0;
    container.innerHTML = matches.length
      ? `<p class="mb-4 text-sm text-brand-500 dark:text-gray-400">พบ ${matches.length.toLocaleString('th-TH')} รายการ</p><div class="grid gap-4" data-list></div><div class="mt-6 text-center" data-more></div>`
      : UI.empty('ไม่พบผลการแข่งขันตามเงื่อนไขที่เลือก');
    if (!matches.length) return;
    const listEl = container.querySelector('[data-list]');
    const moreEl = container.querySelector('[data-more]');
    const more = () => {
      listEl.insertAdjacentHTML('beforeend', matches.slice(shown, shown + pageSize).map(card).join(''));
      shown += pageSize;
      moreEl.innerHTML = shown < matches.length
        ? `<button type="button" class="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-medium text-white shadow hover:bg-brand-700">แสดงเพิ่มเติม (${(matches.length - shown).toLocaleString('th-TH')})</button>`
        : '';
      moreEl.querySelector('button')?.addEventListener('click', more);
    };
    more();
  }

  window.MatchUI = { sortMatches, card, list, isHeadToHead };
})();
