// เชื่อม Supabase ของหน้าแอดมิน: ค่า url / publishable key อ่านจาก admin/supabase.json ตอนเปิดหน้า (ไม่ฝังตอน build)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_ROOT } from "@/admin/paths";

export const LOGIN_PAGE = `${ADMIN_ROOT}login.html`;

/** หน้า login.html ส่ง token มาทาง sessionStorage ครั้งเดียว (ต้องตรงกับ HANDOFF_KEY ใน admin/login.js) */
const HANDOFF_KEY = "pw50-admin-login";

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  /** อีเมลโดเมนนี้เข้าสู่ระบบด้วยส่วนหน้า @ ได้ */
  loginDomain: string;
}

let client: SupabaseClient | null = null;
export let config: SupabaseConfig = { url: "", publishableKey: "", loginDomain: "" };

/** null = ยังไม่ได้ตั้งค่า Supabase ใน admin/supabase.json */
// โหลดการตั้งค่าและสร้างตัวเชื่อม Supabase
export async function initSupabase(): Promise<SupabaseClient | null> {
  config = await (await fetch(`${ADMIN_ROOT}supabase.json`, { cache: "no-cache" })).json();
  if (!config.url || !config.publishableKey) return null;
  client = createClient(config.url, config.publishableKey);
  let handoff: string | null = null;
  try {
    handoff = sessionStorage.getItem(HANDOFF_KEY);
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    // ไม่มี sessionStorage: ใช้ session เดิมใน localStorage ของ supabase-js
  }
  if (handoff) await client.auth.setSession(JSON.parse(handoff));
  return client;
}

// เรียกบริการ Supabase ตามการตั้งค่าของส่วนนี้
export function supabase(): SupabaseClient {
  if (!client) throw new Error("ยังไม่ได้เชื่อมต่อ Supabase");
  return client;
}

/** ชื่อผู้ใช้สำหรับเข้าสู่ระบบ (ตรงกับ private.username_for ในฐานข้อมูล) */
// แปลงอีเมลเป็นชื่อผู้ใช้สำหรับแสดง
export function usernameFor(email: string): string {
  const value = email.trim().toLowerCase();
  return config.loginDomain && value.endsWith(`@${config.loginDomain}`) ? value.split("@")[0] : value;
}

/** เรียกฟังก์ชันในฐานข้อมูล ข้อผิดพลาด PTxxx มีข้อความภาษาไทยจากฐานข้อมูล */
// เรียกฟังก์ชันฐานข้อมูล Supabase พร้อมตรวจข้อผิดพลาด
export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) {
    if (error.code === "PT401") location.replace(LOGIN_PAGE);
    throw new Error(/^PT\d{3}$/.test(error.code) ? error.message : "เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่");
  }
  return data as T;
}

/** เรียก Edge Function "accounts" (สร้าง/แก้บัญชี รีเซ็ตและเปลี่ยนรหัสผ่าน) */
// เรียกบริการจัดการบัญชีของ Supabase
export async function accounts<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase().functions.invoke("accounts", { body });
  if (error) {
    let message = "ดำเนินการไม่สำเร็จ กรุณาลองใหม่";
    try {
      message = (await (error as { context: Response }).context.json()).error || message;
    } catch {
      // ไม่มีข้อความจากเซิร์ฟเวอร์ ใช้ข้อความทั่วไป
    }
    throw new Error(message);
  }
  return data as T;
}
