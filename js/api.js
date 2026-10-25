// ชั้นเชื่อมต่อข้อมูล
//   ข่าวสาร: API ของระบบแข่งขัน (SiteConfig.api)
//   ตารางการแข่งขัน, ผลการแข่งขัน และสรุปเหรียญทุกหน้า: Google Sheet ที่เผยแพร่เป็น CSV (SiteConfig.sheet)
(function () {
  const cfg = window.SiteConfig.api;
  const sheetCfg = window.SiteConfig.sheet;
  const cache = new Map();
  const STORE_PREFIX = 'pw50:';

  // แคชใน sessionStorage เพื่อไม่ต้องโหลดซ้ำเมื่อเปลี่ยนหน้า (หมดอายุตาม minutes)
  function readStore(key, minutes) {
    try {
      const hit = JSON.parse(sessionStorage.getItem(STORE_PREFIX + key));
      return hit && Date.now() - hit.at < minutes * 60000 ? hit.data : null;
    } catch {
      return null;
    }
  }

  function writeStore(key, data) {
    try {
      sessionStorage.setItem(STORE_PREFIX + key, JSON.stringify({ at: Date.now(), data }));
    } catch {
      // พื้นที่เต็มหรือถูกปิดการใช้งาน: ใช้แคชในหน่วยความจำอย่างเดียว
    }
  }

  // โหลดข้อมูลครั้งเดียวต่อ key (หน้าที่เรียกซ้ำจะได้ promise เดิม)
  function cached(key, minutes, load) {
    if (cache.has(key)) return cache.get(key);
    const stored = readStore(key, minutes);
    if (stored) return Promise.resolve(stored);
    const promise = load().then((data) => {
      writeStore(key, data);
      return data;
    });
    cache.set(key, promise);
    promise.catch(() => cache.delete(key));
    return promise;
  }

  // ที่อยู่ API ต้องเป็น https (หรือ path ในเว็บเดียวกัน) กันข้อมูลถูกดักแก้ระหว่างทาง (man-in-the-middle)
  // ยกเว้น localhost ตอนทดสอบในเครื่อง
  function apiBase() {
    try {
      const u = new URL(cfg.base, location.href);
      const local = ['localhost', '127.0.0.1'].includes(u.hostname);
      return u.protocol === 'https:' || (local && u.protocol === 'http:') ? u.href.replace(/\/$/, '') : '';
    } catch {
      return '';
    }
  }

  // คำขอทุกครั้งไม่ส่งคุกกี้และ referrer และมีเวลาหมดอายุ
  async function request(url) {
    try {
      return await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(cfg.timeoutMs) });
    } catch (err) {
      throw new Error(err.name === 'TimeoutError' ? 'โหลดข้อมูลนานเกินไป กรุณาลองใหม่' : 'เชื่อมต่อแหล่งข้อมูลไม่ได้');
    }
  }

  function getJson(path) {
    if (!cfg.enabled || !cfg.base) return Promise.resolve({ data: [] });
    return cached(path, cfg.cacheMinutes, async () => {
      const base = apiBase();
      if (!base) throw new Error('ที่อยู่ API ไม่ปลอดภัย (ต้องขึ้นต้นด้วย https://)');
      const res = await request(base + path);
      if (!res.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ (HTTP ${res.status})`);
      if (!(res.headers.get('content-type') || '').includes('json')) throw new Error('ข้อมูลจาก API ไม่ใช่ JSON');
      const data = await res.json();
      // รับเฉพาะรูปแบบ { data: [...] } ที่หน้าเว็บใช้
      if (!data || typeof data !== 'object' || ('data' in data && !Array.isArray(data.data))) {
        throw new Error('รูปแบบข้อมูลจาก API ไม่ถูกต้อง');
      }
      return data;
    });
  }

  // ---- Google Sheet ----

  // รับเฉพาะลิงก์ https://docs.google.com/spreadsheets/... (ลิงก์ "เผยแพร่ทางเว็บ" แบบ CSV)
  function sheetUrl(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' && u.hostname === 'docs.google.com' && u.pathname.startsWith('/spreadsheets/') ? u.href : '';
    } catch {
      return '';
    }
  }

  // CSV -> [[ช่อง, ...], ...] รองรับช่องที่มี "เครื่องหมายคำพูด", จุลภาค และขึ้นบรรทัดใหม่
  function parseCsv(text) {
    const rows = [[]];
    let field = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c !== '"') field += c;
        else if (text[i + 1] === '"') field += text[++i];
        else quoted = false;
      } else if (c === '"') quoted = true;
      else if (c === ',') {
        rows[rows.length - 1].push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        rows[rows.length - 1].push(field);
        field = '';
        rows.push([]);
      } else field += c;
    }
    rows[rows.length - 1].push(field);
    return rows.filter((r) => r.some((v) => v.trim()));
  }

  async function fetchCsv(url, tab) {
    const safe = sheetUrl(url);
    if (!safe) throw new Error(`ลิงก์แท็บ "${tab}" ต้องเป็นลิงก์ https://docs.google.com/spreadsheets/...`);
    const res = await request(safe);
    if (!res.ok) throw new Error(`โหลดแท็บ "${tab}" ไม่สำเร็จ (HTTP ${res.status})`);
    if ((res.headers.get('content-type') || '').includes('html')) {
      throw new Error(`ลิงก์แท็บ "${tab}" ไม่ใช่ไฟล์ CSV (ใช้ลิงก์จาก "เผยแพร่ทางเว็บ" แบบ CSV)`);
    }
    return parseCsv(await res.text());
  }

  // หัวคอลัมน์ในแถวแรกของแต่ละแท็บ (เรียงคอลัมน์แบบไหนก็ได้)
  const MATCH_COLUMNS = { id: 'รหัส', sport: 'ชนิดกีฬา', level: 'ระดับ', name: 'รายการ', date: 'วันที่', time: 'เวลา', stadium: 'สนาม', round: 'รอบ', group: 'กลุ่ม', status: 'สถานะ' };
  const RESULT_COLUMNS = { id: 'รหัส', player: 'ผู้เข้าแข่งขัน', school: 'โรงเรียน', result: 'ผล', stat: 'สถิติ', medal: 'เหรียญ' };

  // แถวใน CSV -> [{ key: ค่า }] ตามหัวคอลัมน์
  function records(rows, columns, tab, required) {
    const [header = [], ...body] = rows;
    const index = {};
    for (const [key, title] of Object.entries(columns)) index[key] = header.findIndex((h) => h.trim() === title);
    for (const key of required) {
      if (index[key] < 0) throw new Error(`แท็บ "${tab}" ไม่มีคอลัมน์ "${columns[key]}" ในแถวแรก`);
    }
    return body.map((row) => Object.fromEntries(Object.keys(columns).map((k) => [k, index[k] < 0 ? '' : (row[index[k]] || '').trim()])));
  }

  const MEDAL_KEYS = { 'เหรียญทอง': 'gold', 'เหรียญเงิน': 'silver', 'เหรียญทองแดง': 'bronze' };
  const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  // "21 ธันวาคม 2570" -> ตัวเลขสำหรับเรียงลำดับ
  function thaiDateKey(text) {
    const [d, m, y] = (text || '').trim().split(/\s+/);
    const month = THAI_MONTHS.indexOf(m);
    return month < 0 ? 0 : Number(y) * 10000 + (month + 1) * 100 + Number(d);
  }

  // วันที่ที่ Google Sheet แปลงเป็นตัวเลข "18/12/2570", "18/12/2027", "2027-12-18" -> "18 ธันวาคม 2570"
  function thaiDate(text) {
    let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
    let d, mo, y;
    if (m) [, d, mo, y] = m.map(Number);
    else if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text))) [, y, mo, d] = m.map(Number);
    else return text;
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]; // แบบเดือน/วัน/ปี
    if (y < 2400) y += 543;
    return THAI_MONTHS[mo - 1] ? `${d} ${THAI_MONTHS[mo - 1]} ${y}` : text;
  }

  // "ทอง", "เหรียญทอง", "gold" -> "เหรียญทอง" (ช่องว่าง = ไม่ได้เหรียญ)
  function medalLabel(text) {
    if (/ทองแดง|bronze/i.test(text)) return 'เหรียญทองแดง';
    if (/เงิน|silver/i.test(text)) return 'เหรียญเงิน';
    if (/ทอง|gold/i.test(text)) return 'เหรียญทอง';
    return '';
  }

  // "ประถม", "ประถมศึกษา", "p" -> 'p' / "มัธยม", "m" -> 'm'
  function levelOf(text) {
    if (/ประถม|^p$/i.test(text)) return 'p';
    if (/มัธยม|^m$/i.test(text)) return 'm';
    return '';
  }

  // "กรีฑา", "01", "01-กรีฑา" -> ข้อมูลกีฬาใน js/data/sports.js
  function findSport(text) {
    const code = (/^(\d+)/.exec(text) || [])[1];
    return (window.SiteData.sports || []).find((s) => s.name === text || `${s.code}-${s.name}` === text || (code && Number(s.code) === Number(code)));
  }

  // ชื่อเต็ม/อักษรย่อไทย/อักษรย่ออังกฤษ -> ชื่อโรงเรียนเต็มในรายชื่อสถาบัน (ไม่พบ = ใช้ตามที่พิมพ์)
  function schoolKey(text) {
    const low = text.toLowerCase();
    const inst = (window.SiteData.institutions || []).find((s) => [s.nameTh, s.thaiAbbr, s.abbr].some((v) => v && v.toLowerCase() === low));
    return inst ? inst.nameTh : text;
  }

  // 2 แท็บ -> รายการแข่งขันในรูปแบบเดียวกับที่หน้าเว็บใช้
  function buildMatches(matchRows, resultRows) {
    const resultsById = new Map();
    for (const r of resultRows) {
      if (!r.id) continue;
      if (!resultsById.has(r.id)) resultsById.set(r.id, []);
      resultsById.get(r.id).push(r);
    }
    return matchRows
      .filter((m) => m.id && m.sport)
      .map((m) => {
        const sport = findSport(m.sport);
        const sportName = sport ? sport.name : m.sport;
        const results = (resultsById.get(m.id) || []).map((r) => ({
          playerName: r.player && r.school ? `${r.player} (${r.school})` : r.player || r.school,
          school: r.school,
          gameResult: r.result,
          gameStatistic: r.stat,
          reward: medalLabel(r.medal),
        }));
        return {
          matchId: m.id,
          sportId: sport ? sport.apiId : null,
          sportCode: sport ? sport.code : '',
          sportName,
          level: levelOf(m.level),
          displayName: m.name ? `${sportName} : ${m.name}` : sportName,
          gameDate: thaiDate(m.date),
          gameTime: m.time,
          stadium: m.stadium,
          gameRound: m.round,
          gameGroup: m.group,
          gameStatus: m.status,
          schools: [...new Set(results.map((r) => r.school).filter(Boolean))].join(', '),
          results,
        };
      });
  }

  function loadMatches() {
    const { matchesCsv, resultsCsv } = sheetCfg;
    if (!matchesCsv) return Promise.resolve([]);
    return cached(`sheet:${matchesCsv}|${resultsCsv}`, sheetCfg.cacheMinutes, async () => {
      const [matchRows, resultRows] = await Promise.all([
        fetchCsv(matchesCsv, 'ตารางการแข่งขัน'),
        resultsCsv ? fetchCsv(resultsCsv, 'ผลการแข่งขัน') : [],
      ]);
      return buildMatches(records(matchRows, MATCH_COLUMNS, 'ตารางการแข่งขัน', ['id', 'sport']), records(resultRows, RESULT_COLUMNS, 'ผลการแข่งขัน', ['id']));
    });
  }

  // ---- สรุปเหรียญ (คำนวณจากผลการแข่งขัน) ----

  // "ด.ญ.ชื่อ นามสกุล (สาธิตปทุมวัน)" -> "สาธิตปทุมวัน"
  // ทีม "สาธิตปทุมวัน (2)" -> "สาธิตปทุมวัน" (ตัดหมายเลขทีมออกก่อน)
  function schoolOf(playerName) {
    const name = (playerName || '').replace(/\s*\(\d+\)\s*$/, '').trim();
    const m = /\(([^()]*)\)\s*$/.exec(name);
    return (m ? m[1] : name).trim();
  }

  function emptyTally(name) {
    return { name, gold: 0, silver: 0, bronze: 0, total: 0 };
  }

  function addMedal(map, name, kind) {
    if (!map.has(name)) map.set(name, emptyTally(name));
    const t = map.get(name);
    t[kind] += 1;
    t.total += 1;
  }

  function rankTallies(list) {
    return list
      .sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || a.name.localeCompare(b.name, 'th'))
      .map((t, i) => ({ ...t, rank: i + 1 }));
  }

  // ทุกเหรียญที่ได้จากผลการแข่งขัน: [{ sport, sportApiId, level, date, event, school, player, kind }]
  function medalEntries(matches) {
    const out = [];
    for (const m of matches) {
      for (const r of m.results || []) {
        const kind = MEDAL_KEYS[(r.reward || '').trim()];
        if (!kind) continue;
        out.push({
          sport: m.sportName,
          sportApiId: m.sportId,
          level: m.level,
          date: m.gameDate,
          event: m.displayName,
          school: schoolKey(r.school || schoolOf(r.playerName)),
          player: r.playerName,
          kind,
        });
      }
    }
    return out;
  }

  function tallyBy(entries, keyFn) {
    const map = new Map();
    for (const e of entries) addMedal(map, keyFn(e), e.kind);
    return rankTallies([...map.values()]);
  }

  const Api = {
    thaiDateKey,
    schoolOf,

    async getNews() {
      const json = await getJson(cfg.news);
      return (json.data || []).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    },

    async getLatestNews() {
      const list = await Api.getNews();
      return list[list.length - 1];
    },

    // ทุกนัดจาก Google Sheet (โหลดครั้งเดียวแล้วใช้ร่วมกันทุกหน้า)
    getAllMatches: loadMatches,

    async getMatchesBySport(sportApiId) {
      return (await loadMatches()).filter((m) => String(m.sportId) === String(sportApiId));
    },

    async getMedalEntries() {
      return medalEntries(await loadMatches());
    },

    // สรุปเหรียญตามสถาบัน: type = '' | 'p' (ประถม) | 'm' (มัธยม) ตามคอลัมน์ "ระดับ" ของแต่ละนัด
    // แสดงทุกโรงเรียนในระดับนั้น แม้ยังไม่ได้เหรียญ
    async getMedalTable(type = '') {
      const entries = (await Api.getMedalEntries()).filter((e) => !type || e.level === type);
      const map = new Map(Api.zeroSchoolRows(type).map((z) => [z.name, emptyTally(z.name)]));
      for (const e of entries) addMedal(map, e.school, e.kind);
      return { count: map.size, rows: rankTallies([...map.values()]) };
    },

    // ทุกโรงเรียน (ตามระดับ) ที่ยังไม่มีเหรียญ เรียงตามลำดับในรายชื่อสถาบัน
    zeroSchoolRows(type = '') {
      return window.SiteData.institutions
        .filter((s) => !type || s.levels.includes(type))
        .map((s, i) => ({ ...emptyTally(s.nameTh), rank: i + 1 }));
    },

    tallyBy,
  };

  window.Api = Api;
})();
