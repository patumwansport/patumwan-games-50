// จัดการบัญชีหลังบ้าน (หน้า Role manager): สร้างบัญชี, แก้ role/กีฬา/ปิดบัญชี, รีเซ็ตรหัสผ่าน, เปลี่ยนรหัสผ่านของตนเอง
// งานเหล่านี้ต้องใช้ service role จึงทำที่นี่ ส่วนการตรวจสิทธิ์แอดมินและบันทึกประวัติทำในฐานข้อมูล
// โดยเรียก RPC ด้วย JWT ของผู้ใช้ที่ส่งคำขอ (auth.uid() = ผู้ใช้คนนั้น)
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.3';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// origin ของหน้าระบบผลการแข่งขัน คั่นด้วย , (ว่าง = ทุก origin เพราะใช้ Bearer token ไม่ใช้ cookie)
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในบริการบัญชี */ (s) => s.trim()).filter(Boolean);

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, serviceKey, noSession);

class HttpError extends Error {
  // ประมวลผลขั้นตอนย่อยของบริการบัญชีตามข้อมูลหรือสถานะที่รับมา
  constructor(public status: number, message: string) { super(message); }
}

// Supabase Auth ใช้ bcrypt ซึ่งรับได้ไม่เกิน 72 ไบต์
// ตรวจความยาวและรูปแบบรหัสผ่าน
function passwordProblem(pw: unknown): string {
  if (typeof pw !== 'string' || pw.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  if (new TextEncoder().encode(pw).length > 72) return 'รหัสผ่านยาวเกินไป';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข';
  return '';
}

// รหัสผ่านชั่วคราวของบัญชีใหม่และบัญชีที่ถูกรีเซ็ต สุ่มแยกทุกบัญชี แสดงให้แอดมินครั้งเดียว
// ผู้ใช้ต้องตั้งรหัสผ่านใหม่ก่อนใช้งาน (must_change) ไม่ใช้อักษรที่สับสนง่าย เช่น 0/O, 1/l/I
const PASSWORD_LETTERS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const PASSWORD_DIGITS = '23456789';
function temporaryPassword(length = 12): string {
  const chars = PASSWORD_LETTERS + PASSWORD_DIGITS;
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    // 56 ตัวอักษร: ตัดค่าตั้งแต่ 224 ทิ้งเพื่อไม่ให้บางตัวถูกสุ่มบ่อยกว่า
    const out = [...bytes].filter((b) => b < 224).slice(0, length).map((b) => chars[b % chars.length]).join('');
    if (out.length === length && !passwordProblem(out)) return out;
  }
}

// ตรวจข้อความและข้อจำกัดของฟิลด์
function text(value: unknown, title: string, max: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${title}ต้องไม่ว่าง`);
  const out = value.trim();
  if (out.length > max) throw new HttpError(400, `${title}ยาวเกิน ${max} ตัวอักษร`);
  return out;
}

// ตรวจรูปแบบรหัส UUID
function uuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, 'บัญชีไม่ถูกต้อง');
  }
  return value;
}

// แปลงข้อผิดพลาดจาก RPC: SQLSTATE PTxxx คือ HTTP status ที่ฐานข้อมูลกำหนด
// เรียกฟังก์ชันฐานข้อมูล Supabase พร้อมตรวจข้อผิดพลาด
async function rpc(client: SupabaseClient, fn: string, args: Record<string, unknown> = {}) {
  const { data, error } = await client.rpc(fn, args);
  if (error) {
    const m = /^PT(\d{3})$/.exec(error.code || '');
    if (m) throw new HttpError(Number(m[1]), error.message);
    console.error(fn, error);
    throw new HttpError(500, 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่');
  }
  return data;
}

// สร้าง header สำหรับ origin ที่อนุญาต
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allow = !allowedOrigins.length ? '*' : allowedOrigins.includes(origin) ? origin : '';
  return {
    ...(allow ? { 'Access-Control-Allow-Origin': allow } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

// สร้าง HTTP response แบบ JSON
function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(/* รับและประมวลผลคำขอของบริการในบริการบัญชี */ async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'ไม่รองรับคำขอนี้');
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: auth } = jwt ? await service.auth.getUser(jwt) : { data: { user: null } };
    if (!auth.user) throw new HttpError(401, 'กรุณาเข้าสู่ระบบ');
    const caller = createClient(url, anonKey, { ...noSession, global: { headers: { Authorization: `Bearer ${jwt}` } } });
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { throw new HttpError(400, 'ข้อมูลไม่ถูกต้อง'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'ข้อมูลไม่ถูกต้อง');

    switch (body.action) {
      case 'create_user': {
        if (!(await rpc(caller, 'is_admin'))) throw new HttpError(403, 'เฉพาะแอดมินกลาง');
        const email = text(body.email, 'อีเมล', 254).toLowerCase();
        if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) throw new HttpError(400, 'อีเมลไม่ถูกต้อง');
        const displayName = text(body.display_name, 'ชื่อ', 150);
        const password = temporaryPassword();
        const { data, error } = await service.auth.admin.createUser({
          email, password, email_confirm: true, app_metadata: { display_name: displayName },
        });
        if (error || !data.user) {
          if (error?.code === 'email_exists' || /already/i.test(error?.message || '')) throw new HttpError(409, 'อีเมลนี้มีบัญชีอยู่แล้ว');
          console.error('createUser', error);
          throw new HttpError(500, 'สร้างบัญชีไม่สำเร็จ กรุณาลองใหม่');
        }
        try {
          const created = await rpc(caller, 'admin_register_user', { p_user: data.user.id, p_role: body.role, p_sports: body.sports ?? [] });
          return json(req, 200, { ...created, password });
        } catch (err) {
          // role/กีฬาไม่ผ่าน: ลบบัญชีที่เพิ่งสร้างเพื่อไม่ให้เหลือบัญชีค้าง
          await service.auth.admin.deleteUser(data.user.id);
          throw err;
        }
      }

      case 'update_user': {
        const user = uuid(body.user_id);
        if (typeof body.active !== 'boolean') throw new HttpError(400, 'สถานะบัญชีไม่ถูกต้อง');
        await rpc(caller, 'admin_update_user', {
          p_user: user, p_display_name: body.display_name, p_role: body.role, p_sports: body.sports ?? [], p_active: body.active,
        });
        // ฐานข้อมูลหยุดบัญชีที่ปิดทันทีแล้ว ส่วนนี้กันไม่ให้เข้าสู่ระบบใหม่ได้
        const { error } = await service.auth.admin.updateUserById(user, { ban_duration: body.active ? 'none' : '876000h' });
        if (error) console.error('ban', error);
        return json(req, 200, { ok: true });
      }

      case 'reset_password': {
        const user = uuid(body.user_id);
        const password = temporaryPassword();
        // ตั้ง must_change ก่อน: session เดิมของบัญชีนั้นใช้งานต่อไม่ได้ทันที
        const { username } = await rpc(caller, 'admin_mark_password_reset', { p_user: user });
        const { error } = await service.auth.admin.updateUserById(user, { password });
        if (error) {
          console.error('reset', error);
          throw new HttpError(500, 'รีเซ็ตรหัสผ่านไม่สำเร็จ กรุณาลองใหม่');
        }
        return json(req, 200, { username, password });
      }

      case 'change_password': {
        if (typeof body.current !== 'string' || body.current.length > 128) throw new HttpError(400, 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
        const problem = passwordProblem(body.next);
        if (problem) throw new HttpError(400, problem);
        if (body.current === body.next) throw new HttpError(400, 'รหัสผ่านใหม่ต้องต่างจากรหัสผ่านเดิม');
        // ตรวจรหัสผ่านเดิมด้วยการเข้าสู่ระบบแยก แล้วออกเฉพาะ session ที่เพิ่งสร้าง
        const check = createClient(url, anonKey, noSession);
        const { error: wrong } = await check.auth.signInWithPassword({ email: auth.user.email!, password: body.current });
        if (wrong) throw new HttpError(400, 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
        await check.auth.signOut({ scope: 'local' });
        const { error } = await service.auth.admin.updateUserById(auth.user.id, { password: body.next as string });
        if (error) {
          console.error('change', error);
          throw new HttpError(500, 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่');
        }
        await rpc(service, 'mark_password_changed', { p_user: auth.user.id });
        return json(req, 200, { ok: true });
      }

      default:
        throw new HttpError(400, 'คำสั่งไม่ถูกต้อง');
    }
  } catch (err) {
    if (err instanceof HttpError) return json(req, err.status, { error: err.message });
    console.error(err);
    return json(req, 500, { error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่' });
  }
});
