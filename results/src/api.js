import { randomBytes } from 'node:crypto';
import { HttpError, bad, conflict, forbidden, notFound, readJson } from './http.js';
import { tx } from './db.js';
import {
  hashPassword, verifyPassword, generatePassword, passwordProblem, createSession,
  destroySession, sessionCookie, loginBlocked, recordLoginFailure, clearLoginFailures,
} from './auth.js';

// ลงทะเบียน API และกฎสิทธิ์ของระบบผล
export function registerRoutes(router, { db, sports, schools }) {
  const all = /* อ่านทุกแถวที่ตรงกับคำสั่งฐานข้อมูล */ (sql, ...args) => db.prepare(sql).all(...args);
  const get = /* อ่านข้อมูลหนึ่งรายการจากฐานข้อมูล */ (sql, ...args) => db.prepare(sql).get(...args);
  const run = /* ดำเนินการคำสั่งหรือยืนยันงานที่เลือก */ (sql, ...args) => db.prepare(sql).run(...args);
  const assignments = /* อ่านกีฬาที่ได้รับมอบหมายของบัญชี */ (id) => all('SELECT sport_id, permission FROM assignments WHERE user_id=?', id);
  const audit = /* อ่านหรือบันทึกประวัติการดำเนินการ */ (ctx, action, matchId, detail) => run(
    'INSERT INTO audit_log(user_id,match_id,action,detail) VALUES(?,?,?,?)',
    ctx.user?.id ?? null, matchId, action, JSON.stringify(detail),
  );
  const isAdmin = /* ตรวจว่าบัญชีเป็นแอดมินกลางหรือไม่ */ (ctx) => ctx.user.role === 'admin';
  // ตรวจหรือบังคับสิทธิ์แอดมินตามบริบท
  function admin(ctx) { if (!isAdmin(ctx)) throw forbidden('เฉพาะแอดมินกลาง'); }
  // ตรวจว่าบัญชีมีสิทธิ์ที่ต้องการในกีฬานี้หรือไม่
  function permitted(ctx, sportId, permission) {
    return isAdmin(ctx) || !!get('SELECT 1 FROM assignments WHERE user_id=? AND sport_id=? AND permission=?', ctx.user.id, sportId, permission);
  }
  // ตรวจสิทธิ์ทำงานกับกีฬาที่ระบุ
  function requireSport(ctx, sportId, permission) {
    if (!permitted(ctx, sportId, permission)) throw forbidden('ไม่มีสิทธิ์ดำเนินการกับกีฬานี้');
  }
  // ค้นหารายการที่ตรงกับรหัสหรือเส้นทางคำขอ
  function match(ctx) {
    const row = get('SELECT * FROM matches WHERE id=?', ctx.params.id);
    if (!row) throw notFound();
    if (!isAdmin(ctx) && !get('SELECT 1 FROM assignments WHERE user_id=? AND sport_id=?', ctx.user.id, row.sport_id)) throw forbidden();
    return row;
  }
  // ป้องกันการบันทึกทับข้อมูลที่ถูกแก้ไขไปแล้ว
  function version(row, body) {
    if (body.version !== row.version) throw conflict('ข้อมูลถูกเปลี่ยนโดยผู้ใช้อื่น กรุณาโหลดรายการใหม่ก่อนทำต่อ');
  }
  // ตรวจข้อความและข้อจำกัดของฟิลด์
  function text(value, title, max = 200, required = false) {
    if (typeof value !== 'string') {
      if (value == null && !required) return '';
      throw bad(`${title}ไม่ถูกต้อง`);
    }
    const out = value.trim();
    if ((required && !out) || out.length > max) throw bad(`${title}${!out ? 'ต้องไม่ว่าง' : `ยาวเกิน ${max} ตัวอักษร`}`);
    return out;
  }
  // ตรวจและจัดรูปแบบข้อมูลรายการก่อนบันทึก
  function payload(body, sportId) {
    const sport = sports.find(/* ค้นหารายการแรกที่ตรงตามเงื่อนไขในระบบกีฬา */ (s) => s.id === sportId);
    if (!sport) throw bad('ชนิดกีฬาไม่ถูกต้อง');
    const code = text(body.code, 'รหัสการแข่งขัน', 50, true);
    if (!/^[A-Za-z0-9_-]+$/.test(code)) throw bad('รหัสการแข่งขันใช้ตัวอักษรอังกฤษ ตัวเลข - และ _ เท่านั้น');
    const level = text(body.level, 'ระดับ', 10, true);
    if (!['p', 'm'].includes(level)) throw bad('กรุณาเลือกระดับประถมหรือมัธยม');
    const date = text(body.date, 'วันที่', 10, true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number(date.slice(0, 4)) < 2000 || Number(date.slice(0, 4)) > 2200 ||
        !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw bad('วันที่แข่งขันไม่ถูกต้อง (ใช้ปี ค.ศ.)');
    const time = text(body.time, 'เวลา', 5);
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw bad('เวลาไม่ถูกต้อง');
    const kind = text(body.kind || 'competition', 'ลักษณะรายการ', 20);
    if (!['competition', 'activity'].includes(kind)) throw bad('ลักษณะรายการไม่ถูกต้อง');
    const endTime = text(body.endTime, 'เวลาสิ้นสุด', 5);
    if (endTime && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || !time || endTime <= time)) throw bad('เวลาสิ้นสุดต้องหลังเวลาเริ่มภายในวันเดียวกัน');
    if (!Array.isArray(body.results) || body.results.length > 200) throw bad('เพิ่มผู้เข้าแข่งขันได้ไม่เกิน 200 แถว');
    if (kind === 'activity' && body.results.length) throw bad('กิจกรรมไม่มีผลการแข่งขัน');
    const results = body.results.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (r) => {
      if (!r || typeof r !== 'object' || Array.isArray(r)) throw bad('รูปแบบผู้เข้าแข่งขันไม่ถูกต้อง');
      const school = text(r.school, 'โรงเรียน', 250, true);
      if (!schools.some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในระบบกีฬา */ (s) => s.nameTh === school)) throw bad('กรุณาเลือกโรงเรียนจากรายชื่อสถาบัน');
      const medal = text(r.medal, 'เหรียญ', 20);
      if (!['', 'ทอง', 'เงิน', 'ทองแดง'].includes(medal)) throw bad('เหรียญไม่ถูกต้อง');
      return { school, player: text(r.player, 'ผู้เข้าแข่งขัน', 200), result: text(r.result, 'ผล', 100), stat: text(r.stat, 'สถิติ', 100), medal };
    });
    return {
      code, sportId, sport: sport.name, level, name: text(body.name, 'รายการ', 200, true), date, time, endTime, kind, category: text(body.category, 'ประเภทการแข่งขัน', 100), note: text(body.note, 'หมายเหตุ', 1000),
      stadium: text(body.stadium, 'สนาม', 200), round: text(body.round, 'รอบ', 100),
      group: text(body.group, 'กลุ่ม', 50), results,
    };
  }
  // แปลงแถวฐานข้อมูลเป็นข้อมูลที่ส่งให้หน้าจอ
  function view(row) {
    return { id: row.id, ...JSON.parse(row.payload), status: row.status, version: row.version,
      reviewNote: row.review_note, submittedBy: row.submitted_by, published: !!row.published, updatedAt: row.updated_at };
  }
  // อ่านข้อมูลบัญชีและขอบเขตสิทธิ์
  function me(ctx) {
    const u = get('SELECT id,username,display_name,role,must_change FROM users WHERE id=?', ctx.user.id);
    return { user: { ...u, mustChange: !!u.must_change }, assignments: assignments(u.id), sports, schools };
  }

  router.add('POST', '/api/login', 'public', /* รับคำขอ POST /api/login แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ async (ctx) => {
    const body = await readJson(ctx.req);
    const username = text(body.username, 'ชื่อผู้ใช้', 50, true).toLowerCase();
    if (typeof body.password !== 'string' || !body.password || body.password.length > 128) throw bad('รหัสผ่านไม่ถูกต้อง');
    const password = body.password;
    const key = `${ctx.ip}:${username}`;
    if (loginBlocked(key)) throw new HttpError(429, 'กรุณารอ 15 นาทีแล้วลองใหม่');
    const user = get('SELECT * FROM users WHERE username=? AND active=1', username);
    // คำนวณ scrypt แม้ไม่พบบัญชี เพื่อลดการแยกแยะชื่อผู้ใช้จากเวลาในการตอบ
    const valid = verifyPassword(password, user?.password_hash || dummyHash);
    if (!user || !valid) {
      recordLoginFailure(key);
      throw new HttpError(401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    clearLoginFailures(key);
    ctx.user = user;
    const token = createSession(db, user.id);
    ctx.setCookie(sessionCookie(token, ctx.secure));
    audit(ctx, 'login', null, {});
    return me(ctx);
  });
  const dummyHash = hashPassword(randomBytes(24).toString('hex'));
  router.add('POST', '/api/logout', 'session', /* รับคำขอ POST /api/logout แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ (ctx) => {
    destroySession(db, ctx.req);
    ctx.setCookie(sessionCookie('', ctx.secure, true));
    return { ok: true };
  });
  router.add('GET', '/api/me', 'session', me);
  router.add('POST', '/api/password', 'session', /* รับคำขอ POST /api/password แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ async (ctx) => {
    const body = await readJson(ctx.req);
    const old = get('SELECT password_hash FROM users WHERE id=?', ctx.user.id);
    if (typeof body.current !== 'string' || body.current.length > 128 || !verifyPassword(body.current, old.password_hash)) throw bad('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    const problem = passwordProblem(body.next);
    if (problem) throw bad(problem);
    if (body.current === body.next) throw bad('รหัสผ่านใหม่ต้องต่างจากรหัสผ่านเดิม');
    tx(db, /* ทำคำสั่งที่ต้องสำเร็จหรือย้อนกลับพร้อมกันในระบบกีฬา */ () => {
      run('UPDATE users SET password_hash=?,must_change=0 WHERE id=?', hashPassword(body.next), ctx.user.id);
      run('DELETE FROM sessions WHERE user_id=?', ctx.user.id);
      audit(ctx, 'password_changed', null, {});
    });
    ctx.setCookie(sessionCookie(createSession(db, ctx.user.id), ctx.secure));
    return { ok: true };
  });

  // ตรวจรูปแบบและสิทธิ์การมอบหมายกีฬา
  function checkedAssignments(body) {
    if (!Array.isArray(body.assignments) || body.assignments.length > sports.length) throw bad('สิทธิ์กีฬาไม่ถูกต้อง');
    const seen = new Set();
    return body.assignments.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (a) => {
      if (!a || !sports.some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในระบบกีฬา */ (s) => s.id === a.sport_id) || !['technician','reviewer'].includes(a.permission) || seen.has(a.sport_id)) throw bad('สิทธิ์กีฬาซ้ำหรือไม่ถูกต้อง');
      seen.add(a.sport_id);
      return { sport_id: a.sport_id, permission: a.permission };
    });
  }
  // บันทึกรายการกีฬาที่มอบหมายให้ผู้ใช้
  function setAssignments(userId, list) {
    run('DELETE FROM assignments WHERE user_id=?', userId);
    list.forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในระบบกีฬา */ (a) => run('INSERT INTO assignments(user_id,sport_id,permission) VALUES(?,?,?)', userId, a.sport_id, a.permission));
  }
  router.add('GET', '/api/users', 'session', /* รับคำขอ GET /api/users แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ (ctx) => {
    admin(ctx);
    return { users: all('SELECT id,username,display_name,role,active FROM users ORDER BY id').map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (u) => ({ ...u, assignments: assignments(u.id) })) };
  });
  router.add('POST', '/api/users', 'session', /* รับคำขอ POST /api/users แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ async (ctx) => {
    admin(ctx);
    const body = await readJson(ctx.req);
    const username = text(body.username, 'ชื่อผู้ใช้', 50, true).toLowerCase();
    if (!/^[a-z0-9._-]{3,50}$/.test(username)) throw bad('ชื่อผู้ใช้ต้องเป็นอักษรอังกฤษ ตัวเลข . _ - อย่างน้อย 3 ตัว');
    const name = text(body.display_name, 'ชื่อ–นามสกุล', 150, true);
    const list = checkedAssignments(body);
    if (get('SELECT 1 FROM users WHERE username=?', username)) throw conflict('ชื่อผู้ใช้นี้มีอยู่แล้ว');
    const password = generatePassword(14);
    const id = tx(db, /* ทำคำสั่งที่ต้องสำเร็จหรือย้อนกลับพร้อมกันในระบบกีฬา */ () => {
      const id = Number(run("INSERT INTO users(username,display_name,password_hash,role) VALUES(?,?,?,'staff')", username, name, hashPassword(password)).lastInsertRowid);
      setAssignments(id, list);
      audit(ctx, 'user_created', null, { id, username, assignments: list });
      return id;
    });
    return { id, username, password };
  });
  router.add('PUT', '/api/users/:id', 'session', /* รับคำขอ PUT /api/users/:id แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ async (ctx) => {
    admin(ctx);
    const body = await readJson(ctx.req);
    const user = get('SELECT * FROM users WHERE id=?', ctx.params.id);
    if (!user || user.role === 'admin') throw bad('แก้สิทธิ์ได้เฉพาะบัญชีเจ้าหน้าที่');
    const name = body.display_name === undefined ? user.display_name : text(body.display_name, 'ชื่อ–นามสกุล', 150, true);
    const list = checkedAssignments(body);
    if (typeof body.active !== 'boolean') throw bad('สถานะบัญชีไม่ถูกต้อง');
    tx(db, /* ทำคำสั่งที่ต้องสำเร็จหรือย้อนกลับพร้อมกันในระบบกีฬา */ () => {
      setAssignments(user.id, list);
      run('UPDATE users SET display_name=?,active=? WHERE id=?', name, body.active ? 1 : 0, user.id);
      run('DELETE FROM sessions WHERE user_id=?', user.id);
      audit(ctx, 'user_updated', null, { id: user.id, display_name: name, active: body.active, assignments: list });
    });
    return { ok: true };
  });
  router.add('POST', '/api/users/:id/reset', 'session', /* รับคำขอ POST /api/users/:id/reset แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ (ctx) => {
    admin(ctx);
    const user = get("SELECT * FROM users WHERE id=? AND role='staff'", ctx.params.id);
    if (!user) throw notFound();
    const password = generatePassword(14);
    tx(db, /* ทำคำสั่งที่ต้องสำเร็จหรือย้อนกลับพร้อมกันในระบบกีฬา */ () => {
      run('UPDATE users SET password_hash=?,must_change=1 WHERE id=?', hashPassword(password), user.id);
      run('DELETE FROM sessions WHERE user_id=?', user.id);
      audit(ctx, 'password_reset', null, { id: user.id });
    });
    return { username: user.username, password };
  });

  router.add('GET', '/api/matches', 'session', /* รับคำขอ GET /api/matches แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ (ctx) => ({ matches: (isAdmin(ctx)
    ? all('SELECT * FROM matches ORDER BY updated_at DESC,id DESC')
    : all('SELECT m.* FROM matches m JOIN assignments a ON a.sport_id=m.sport_id WHERE a.user_id=? ORDER BY m.updated_at DESC,m.id DESC', ctx.user.id)).map(view) }));
  router.add('GET', '/api/matches/:id', 'session', /* รับคำขอ GET /api/matches/:id แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ (ctx) => view(match(ctx)));
  router.add('POST', '/api/matches', 'session', /* รับคำขอ POST /api/matches แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ async (ctx) => {
    const body = await readJson(ctx.req);
    requireSport(ctx, body.sportId, 'technician');
    const data = payload(body, body.sportId);
    if (get('SELECT 1 FROM matches WHERE code=?', data.code)) throw conflict('รหัสการแข่งขันนี้มีอยู่แล้ว');
    const id = tx(db, /* ทำคำสั่งที่ต้องสำเร็จหรือย้อนกลับพร้อมกันในระบบกีฬา */ () => {
      const id = Number(run('INSERT INTO matches(code,sport_id,payload) VALUES(?,?,?)', data.code, data.sportId, JSON.stringify(data)).lastInsertRowid);
      audit(ctx, 'created', id, data);
      return id;
    });
    return view(get('SELECT * FROM matches WHERE id=?', id));
  });
  router.add('PUT', '/api/matches/:id', 'session', /* รับคำขอ PUT /api/matches/:id แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ async (ctx) => {
    const body = await readJson(ctx.req);
    return tx(db, /* ทำคำสั่งที่ต้องสำเร็จหรือย้อนกลับพร้อมกันในระบบกีฬา */ () => {
      const row = match(ctx);
      requireSport(ctx, row.sport_id, 'technician');
      version(row, body);
      if (row.status === 'pending') throw conflict('รายการอยู่ระหว่างตรวจ ต้องให้ผู้ตรวจส่งกลับก่อนแก้ไข');
      const data = payload(body, row.sport_id);
      if (row.published && data.kind === 'activity') throw bad('รายการที่เคยเผยแพร่ผลแล้วไม่สามารถเปลี่ยนเป็นกิจกรรมได้');
      if (data.code !== row.code || body.sportId !== row.sport_id) throw bad('เปลี่ยนรหัสหรือชนิดกีฬาของรายการเดิมไม่ได้');
      run("UPDATE matches SET payload=?,status='draft',version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?", JSON.stringify(data), row.id);
      audit(ctx, 'edited', row.id, data);
      return view(get('SELECT * FROM matches WHERE id=?', row.id));
    });
  });
  router.add('POST', '/api/matches/:id/submit', 'session', /* รับคำขอ POST /api/matches/:id/submit แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ async (ctx) => {
    const body = await readJson(ctx.req);
    return tx(db, /* ทำคำสั่งที่ต้องสำเร็จหรือย้อนกลับพร้อมกันในระบบกีฬา */ () => {
      const row = match(ctx);
      requireSport(ctx, row.sport_id, 'technician');
      version(row, body);
      if (!['draft','returned'].includes(row.status)) throw conflict('ส่งตรวจได้เฉพาะฉบับร่างหรือรายการที่ส่งกลับ');
      const data = JSON.parse(row.payload);
      if (data.kind === 'activity' || !data.results.length) throw bad('ส่งตรวจได้เฉพาะรายการแข่งขันที่มีผู้เข้าแข่งขันและผลครบแล้ว');
      if (data.results.some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในระบบกีฬา */ (r) => !r.result && !r.stat)) throw bad('กรุณากรอกผลหรือสถิติให้ครบทุกผู้เข้าแข่งขันก่อนส่งตรวจ');
      run("UPDATE matches SET status='pending',submitted_by=?,review_note='',version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?", ctx.user.id, row.id);
      audit(ctx, 'submitted', row.id, { version: row.version, payload: data });
      return { ok: true };
    });
  });
  router.add('POST', '/api/matches/:id/review', 'session', /* รับคำขอ POST /api/matches/:id/review แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ async (ctx) => {
    const body = await readJson(ctx.req);
    return tx(db, /* ทำคำสั่งที่ต้องสำเร็จหรือย้อนกลับพร้อมกันในระบบกีฬา */ () => {
      const row = match(ctx);
      requireSport(ctx, row.sport_id, 'reviewer');
      version(row, body);
      if (row.status !== 'pending') throw conflict('รายการนี้ไม่ได้อยู่ระหว่างตรวจ');
      if (row.submitted_by === ctx.user.id) throw forbidden('ผู้ส่งผลตรวจผลของตนเองไม่ได้ ให้ผู้ตรวจอีกบัญชีดำเนินการ');
      if (!['approve','return'].includes(body.action)) throw bad('คำสั่งตรวจผลไม่ถูกต้อง');
      const note = text(body.note, 'เหตุผล', 1000, body.action === 'return');
      const status = body.action === 'approve' ? 'approved' : 'returned';
      run('UPDATE matches SET status=?,review_note=?,published=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?',
        status, note, body.action === 'approve' ? row.payload : row.published, row.id);
      audit(ctx, status, row.id, { note, payload: JSON.parse(row.payload), version: row.version });
      return { ok: true };
    });
  });
  router.add('POST', '/api/matches/:id/withdraw', 'session', /* รับคำขอ POST /api/matches/:id/withdraw แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ async (ctx) => {
    const body = await readJson(ctx.req);
    return tx(db, /* ทำคำสั่งที่ต้องสำเร็จหรือย้อนกลับพร้อมกันในระบบกีฬา */ () => {
      const row = match(ctx);
      requireSport(ctx, row.sport_id, 'reviewer');
      version(row, body);
      if (!row.published) throw conflict('รายการนี้ยังไม่เผยแพร่');
      const note = text(body.note, 'เหตุผลถอนผล', 1000, true);
      run("UPDATE matches SET published=NULL,status='returned',review_note=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?", note, row.id);
      audit(ctx, 'withdrawn', row.id, { note, published: JSON.parse(row.published) });
      return { ok: true };
    });
  });
  router.add('GET', '/api/matches/:id/history', 'session', /* รับคำขอ GET /api/matches/:id/history แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ (ctx) => {
    const row = match(ctx);
    return { history: all('SELECT a.id,a.at,a.action,a.detail,u.display_name FROM audit_log a LEFT JOIN users u ON u.id=a.user_id WHERE match_id=? ORDER BY a.id DESC', row.id).map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (a) => ({ ...a, detail: JSON.parse(a.detail) })) };
  });
  router.add('GET', '/api/audit', 'session', /* รับคำขอ GET /api/audit แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ (ctx) => {
    admin(ctx);
    return { history: all('SELECT a.id,a.at,a.action,a.detail,u.display_name,a.match_id FROM audit_log a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 500').map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (a) => ({ ...a, detail: JSON.parse(a.detail) })) };
  });
  router.add('GET', '/api/public/results', 'public', /* รับคำขอ GET /api/public/results แล้วตรวจสิทธิ์และดำเนินการตามเส้นทาง */ () => {
    const matches = [], results = [];
    for (const row of all('SELECT published FROM matches WHERE published IS NOT NULL ORDER BY id')) {
      const data = JSON.parse(row.published);
      const { results: entries, code, sportId, ...fields } = data;
      matches.push({ id: code, ...fields, status: 'แข่งขันแล้ว' });
      entries.forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในระบบกีฬา */ (r) => results.push({ id: code, ...r }));
    }
    return { matches, results };
  });
}
