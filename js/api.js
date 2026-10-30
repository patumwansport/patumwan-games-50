// ชั้นเชื่อมต่อข้อมูล
//   ข่าวสาร: API ของระบบแข่งขัน (SiteConfig.api)
//   ตารางการแข่งขัน, ผลการแข่งขัน และสรุปเหรียญทุกหน้า: Google Sheet ที่เผยแพร่เป็น CSV (SiteConfig.sheet)
(/* เริ่มต้นเว็บไซต์และจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ function () {
  const cfg = window.SiteConfig.api;
  const sheetCfg = window.SiteConfig.sheet;
  const cache = new Map();
  const STORE_PREFIX = 'pw50:';

  // แคชใน sessionStorage เพื่อไม่ต้องโหลดซ้ำเมื่อเปลี่ยนหน้า (หมดอายุตาม minutes)
  // อ่านข้อมูลแคชจากพื้นที่เก็บข้อมูลของเบราว์เซอร์
  function readStore(key, minutes) {
    try {
      const hit = JSON.parse(sessionStorage.getItem(STORE_PREFIX + key));
      return hit && Date.now() - hit.at < minutes * 60000 ? hit.data : null;
    } catch {
      return null;
    }
  }

  // บันทึกข้อมูลแคชพร้อมเวลาที่จัดเก็บ
  function writeStore(key, data) {
    try {
      sessionStorage.setItem(STORE_PREFIX + key, JSON.stringify({ at: Date.now(), data }));
    } catch {
      // พื้นที่เต็มหรือถูกปิดการใช้งาน: ใช้แคชในหน่วยความจำอย่างเดียว
    }
  }

  // โหลดข้อมูลครั้งเดียวต่อ key (หน้าที่เรียกซ้ำจะได้ promise เดิม)
  // ใช้ข้อมูลแคชที่ยังไม่หมดอายุ หรือโหลดข้อมูลใหม่
  function cached(key, minutes, load) {
    if (cache.has(key)) return cache.get(key);
    const stored = readStore(key, minutes);
    if (stored) return Promise.resolve(stored);
    const promise = load().then(/* ประมวลผลต่อเมื่อคำขอก่อนหน้าสำเร็จในเว็บไซต์ */ (data) => {
      writeStore(key, data);
      return data;
    });
    cache.set(key, promise);
    promise.catch(/* จัดการข้อผิดพลาดจากงานแบบ asynchronousในเว็บไซต์ */ () => cache.delete(key));
    return promise;
  }

  // ที่อยู่ API ต้องเป็น https (หรือ path ในเว็บเดียวกัน) กันข้อมูลถูกดักแก้ระหว่างทาง (man-in-the-middle)
  // ยกเว้น localhost ตอนทดสอบในเครื่อง
  // อ่านและตรวจที่อยู่ API จากการตั้งค่า
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
  // ส่งคำขอ HTTP พร้อมกำหนดระยะเวลารอ
  async function request(url, headers) {
    try {
      return await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', headers, signal: AbortSignal.timeout(cfg.timeoutMs) });
    } catch (err) {
      throw new Error(err.name === 'TimeoutError' ? 'โหลดข้อมูลนานเกินไป กรุณาลองใหม่' : 'เชื่อมต่อแหล่งข้อมูลไม่ได้');
    }
  }

  // โหลดข้อมูล JSON จาก API
  function getJson(path) {
    if (!cfg.enabled || !cfg.base) return Promise.resolve({ data: [] });
    return cached(path, cfg.cacheMinutes, /* ทำงานต่อภายใน cached ของเว็บไซต์ */ async () => {
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
  // ตรวจลิงก์เผยแพร่ Google Sheets ก่อนโหลด
  function sheetUrl(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' && u.hostname === 'docs.google.com' && u.pathname.startsWith('/spreadsheets/') ? u.href : '';
    } catch {
      return '';
    }
  }

  // CSV -> [[ช่อง, ...], ...] รองรับช่องที่มี "เครื่องหมายคำพูด", จุลภาค และขึ้นบรรทัดใหม่
  // แยกข้อความ CSV เป็นแถวและคอลัมน์ รวมถึงค่าที่มีเครื่องหมายคำพูด
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
    return rows.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในเว็บไซต์ */ (r) => r.some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในเว็บไซต์ */ (v) => v.trim()));
  }

  // โหลดและแปลงข้อมูล CSV จากตารางที่กำหนด
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
  // จับคู่หัวคอลัมน์กับชื่อฟิลด์และตรวจข้อมูลที่จำเป็น
  function records(rows, columns, tab, required) {
    const [header = [], ...body] = rows;
    const index = {};
    for (const [key, title] of Object.entries(columns)) index[key] = header.findIndex(/* ทำงานต่อภายใน header.findIndex ของเว็บไซต์ */ (h) => h.trim() === title);
    for (const key of required) {
      if (index[key] < 0) throw new Error(`แท็บ "${tab}" ไม่มีคอลัมน์ "${columns[key]}" ในแถวแรก`);
    }
    return body.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (row) => Object.fromEntries(Object.keys(columns).map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (k) => [k, index[k] < 0 ? '' : (row[index[k]] || '').trim()])));
  }

  const MEDAL_KEYS = { 'เหรียญทอง': 'gold', 'เหรียญเงิน': 'silver', 'เหรียญทองแดง': 'bronze' };
  const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  // "21 ธันวาคม 2570" -> ตัวเลขสำหรับเรียงลำดับ
  // แปลงวันที่เป็นค่าสำหรับจัดกลุ่มและเปรียบเทียบ
  function thaiDateKey(text) {
    const [d, m, y] = (text || '').trim().split(/\s+/);
    const month = THAI_MONTHS.indexOf(m);
    return month < 0 ? 0 : Number(y) * 10000 + (month + 1) * 100 + Number(d);
  }

  // วันที่ที่ Google Sheet แปลงเป็นตัวเลข "18/12/2570", "18/12/2027", "2027-12-18" -> "18 ธันวาคม 2570"
  // แปลงวันที่ให้อยู่ในรูปแบบที่ระบบใช้
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
  // ปรับชื่อเหรียญให้เป็นรูปแบบเดียวกัน
  function medalLabel(text) {
    if (/ทองแดง|bronze/i.test(text)) return 'เหรียญทองแดง';
    if (/เงิน|silver/i.test(text)) return 'เหรียญเงิน';
    if (/ทอง|gold/i.test(text)) return 'เหรียญทอง';
    return '';
  }

  // "ประถม", "ประถมศึกษา", "p" -> 'p' / "มัธยม", "m" -> 'm'
  // แปลงชื่อระดับการศึกษาเป็นรหัสมาตรฐาน
  function levelOf(text) {
    if (/ประถม|^p$/i.test(text)) return 'p';
    if (/มัธยม|^m$/i.test(text)) return 'm';
    return '';
  }

  // "กรีฑา", "01", "01-กรีฑา" -> ข้อมูลกีฬาใน js/data/sports.js
  // ค้นหากีฬาจากชื่อหรือรหัส
  function findSport(text) {
    const code = (/^(\d+)/.exec(text) || [])[1];
    return (window.SiteData.sports || []).find(/* ค้นหารายการแรกที่ตรงตามเงื่อนไขในเว็บไซต์ */ (s) => s.name === text || `${s.code}-${s.name}` === text || (code && Number(s.code) === Number(code)));
  }

  // ชื่อเต็ม/อักษรย่อไทย/อักษรย่ออังกฤษ -> ชื่อโรงเรียนเต็มในรายชื่อสถาบัน (ไม่พบ = ใช้ตามที่พิมพ์)
  // ปรับชื่อสถาบันให้ใช้เปรียบเทียบกันได้
  function schoolKey(text) {
    const low = text.toLowerCase();
    const inst = (window.SiteData.institutions || []).find(/* ค้นหารายการแรกที่ตรงตามเงื่อนไขในเว็บไซต์ */ (s) => [s.nameTh, s.thaiAbbr, s.abbr].some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในเว็บไซต์ */ (v) => v && v.toLowerCase() === low));
    return inst ? inst.nameTh : text;
  }

  // 2 แท็บ -> รายการแข่งขันในรูปแบบเดียวกับที่หน้าเว็บใช้
  // เชื่อมตารางแข่งขันกับผลของผู้เข้าแข่งขันโดยใช้รหัสรายการ
  function buildMatches(matchRows, resultRows) {
    const resultsById = new Map();
    for (const r of resultRows) {
      if (!r.id) continue;
      if (!resultsById.has(r.id)) resultsById.set(r.id, []);
      resultsById.get(r.id).push(r);
    }
    return matchRows
      .filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในเว็บไซต์ */ (m) => m.id && m.sport)
      .map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (m) => {
        const sport = findSport(m.sport);
        const sportName = sport ? sport.name : m.sport;
        const results = (resultsById.get(m.id) || []).map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (r) => ({
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
          schools: [...new Set(results.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (r) => r.school).filter(Boolean))].join(', '),
          results,
        };
      });
  }

  // โหลดผลที่อนุมัติจาก feed หรืออ่าน Google Sheets ตามการตั้งค่า
  function loadMatches() {
    const feed = window.SiteConfig.resultsFeed;
    if (feed) {
      return cached(`approved-results:${feed}`, 0.5, /* ทำงานต่อภายใน cached ของเว็บไซต์ */ async () => {
        let url;
        try {
          url = new URL(feed, location.href);
          const local = ['localhost', '127.0.0.1'].includes(url.hostname);
          if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error();
        } catch { throw new Error('ที่อยู่ระบบผลการแข่งขันไม่ถูกต้อง (ต้องใช้ https://)'); }
        // Supabase ต้องมี publishable key ใน header apikey (คีย์สาธารณะ ไม่ใช่ service role)
        const key = window.SiteConfig.resultsFeedKey;
        const res = await request(url.href, key ? { apikey: key } : undefined);
        if (!res.ok) throw new Error(`โหลดผลการแข่งขันไม่สำเร็จ (HTTP ${res.status})`);
        const data = await res.json();
        if (!Array.isArray(data.matches) || !Array.isArray(data.results)) throw new Error('รูปแบบผลการแข่งขันไม่ถูกต้อง');
        // ใช้เส้นทางคำนวณผล/เหรียญเดิมทั้งหมด โดยอ่านเฉพาะ snapshot ที่ผู้ตรวจอนุมัติ
        return buildMatches(data.matches, data.results);
      });
    }
    const { matchesCsv, resultsCsv } = sheetCfg;
    if (!matchesCsv) return Promise.resolve([]);
    return cached(`sheet:${matchesCsv}|${resultsCsv}`, sheetCfg.cacheMinutes, /* ทำงานต่อภายใน cached ของเว็บไซต์ */ async () => {
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
  // ระบุสถาบันจากข้อมูลผู้เข้าแข่งขัน
  function schoolOf(playerName) {
    const name = (playerName || '').replace(/\s*\(\d+\)\s*$/, '').trim();
    const m = /\(([^()]*)\)\s*$/.exec(name);
    return (m ? m[1] : name).trim();
  }

  // สร้างยอดเหรียญเริ่มต้นเป็นศูนย์
  function emptyTally(name) {
    return { name, gold: 0, silver: 0, bronze: 0, total: 0 };
  }

  // เพิ่มจำนวนเหรียญให้รายการสรุป
  function addMedal(map, name, kind) {
    if (!map.has(name)) map.set(name, emptyTally(name));
    const t = map.get(name);
    t[kind] += 1;
    t.total += 1;
  }

  // เรียงอันดับจากจำนวนเหรียญ
  function rankTallies(list) {
    return list
      .sort(/* เปรียบเทียบรายการเพื่อจัดลำดับในเว็บไซต์ */ (a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || a.name.localeCompare(b.name, 'th'))
      .map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (t, i) => ({ ...t, rank: i + 1 }));
  }

  // ทุกเหรียญที่ได้จากผลการแข่งขัน: [{ sport, sportApiId, level, date, event, school, player, kind }]
  // รวบรวมรายการเหรียญจากผลการแข่งขัน
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

  // รวมเหรียญตามเงื่อนไขการจัดกลุ่ม
  function tallyBy(entries, keyFn) {
    const map = new Map();
    for (const e of entries) addMedal(map, keyFn(e), e.kind);
    return rankTallies([...map.values()]);
  }

  const Api = {
    thaiDateKey,
    schoolOf,

    // อ่านข่าวจากข้อมูลเว็บไซต์และแหล่งข่าวที่เปิดใช้งาน
    async getNews() {
      const json = await getJson(cfg.news);
      const local = window.SiteData?.news || [];
      return [...local, ...(json.data || [])].sort(/* เปรียบเทียบรายการเพื่อจัดลำดับในเว็บไซต์ */ (a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    },

    // เลือกข่าวล่าสุดตามจำนวนที่ต้องการ
    async getLatestNews() {
      const list = await Api.getNews();
      return list[list.length - 1];
    },

    // ทุกนัดจาก Google Sheet (โหลดครั้งเดียวแล้วใช้ร่วมกันทุกหน้า)
    getAllMatches: loadMatches,

    // เลือกผลการแข่งขันเฉพาะกีฬาที่ระบุ
    async getMatchesBySport(sportApiId) {
      return (await loadMatches()).filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในเว็บไซต์ */ (m) => String(m.sportId) === String(sportApiId));
    },

    // อ่านรายการเหรียญสำหรับคำนวณสรุป
    async getMedalEntries() {
      return medalEntries(await loadMatches());
    },

    // สรุปเหรียญตามสถาบัน: type = '' | 'p' (ประถม) | 'm' (มัธยม) ตามคอลัมน์ "ระดับ" ของแต่ละนัด
    // แสดงทุกโรงเรียนในระดับนั้น แม้ยังไม่ได้เหรียญ
    // สร้างตารางสรุปเหรียญตามตัวกรอง
    async getMedalTable(type = '') {
      const entries = (await Api.getMedalEntries()).filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในเว็บไซต์ */ (e) => !type || e.level === type);
      const map = new Map(Api.zeroSchoolRows(type).map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (z) => [z.name, emptyTally(z.name)]));
      for (const e of entries) addMedal(map, e.school, e.kind);
      return { count: map.size, rows: rankTallies([...map.values()]) };
    },

    // ทุกโรงเรียน (ตามระดับ) ที่ยังไม่มีเหรียญ เรียงตามลำดับในรายชื่อสถาบัน
    // เพิ่มสถาบันที่ยังไม่มีเหรียญให้แสดงในตาราง
    zeroSchoolRows(type = '') {
      return window.SiteData.institutions
        .filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในเว็บไซต์ */ (s) => !type || s.levels.includes(type))
        .map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในเว็บไซต์ */ (s, i) => ({ ...emptyTally(s.nameTh), rank: i + 1 }));
    },

    tallyBy,
  };

  window.Api = Api;
})();
