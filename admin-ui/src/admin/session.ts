// การเข้าสู่ระบบหน้าแอดมิน (Supabase Auth) และข้อมูลบัญชีจาก rpc("me")
import { LOGIN_PAGE, initSupabase, rpc, supabase } from "@/admin/supabase";

export { LOGIN_PAGE };

export type Role = "admin" | "editor" | "technician" | "reviewer";

export const ROLES: { id: Role; label: string; description: string }[] = [
  { id: "admin", label: "IT Admin", description: "จัดการทุกอย่าง รวมถึงบัญชีและ Role" },
  { id: "editor", label: "CMS Editor", description: "แก้ไขและเผยแพร่เนื้อหาเว็บไซต์" },
  { id: "technician", label: "ฝ่ายเทคนิคกีฬา", description: "กรอกผลการแข่งขันของกีฬาที่รับผิดชอบ" },
  { id: "reviewer", label: "ผู้ตรวจผลกีฬา", description: "ตรวจและอนุมัติผลของกีฬาที่รับผิดชอบ" },
];
export const roleLabel = /* แปลงรหัสบทบาทเป็นชื่อที่แสดง */ (role: Role) => ROLES.find(/* ค้นหารายการแรกที่ตรงตามเงื่อนไขในหลังบ้าน */ (r) => r.id === role)?.label ?? role;
/** role ที่ต้องระบุกีฬา */
export const needsSports = /* ตรวจว่าบทบาทต้องได้รับมอบหมายกีฬาหรือไม่ */ (role: Role) => role === "technician" || role === "reviewer";
/** role ที่แก้เนื้อหาเว็บไซต์ (CMS) ได้ ต้องตรงกับ CMS_ROLES ใน api/_auth.js */
export const canEditContent = /* ตรวจสิทธิ์แก้เนื้อหาเว็บไซต์ */ (role: Role) => role === "admin" || role === "editor";
/** role ที่ใช้ระบบผลการแข่งขัน (/admin/results/) ได้ */
export const canEnterResults = /* ตรวจสิทธิ์เข้าสู่ระบบกีฬา */ (role: Role) => role !== "editor";

export interface Sport { id: number; code: string; name: string }

export interface Session {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: Role;
  mustChange: boolean;
  /** กีฬาทั้งหมด (ใช้เลือกกีฬาในหน้า Role manager) */
  sports: Sport[];
  /** กีฬาที่บัญชีนี้รับผิดชอบ */
  sportIds: number[];
}

interface Me {
  user: { id: string; email: string; username: string; display_name: string; role: Role; mustChange: boolean };
  sports: Sport[];
  assignments: { sport_id: number }[];
}

/** null = ต้องล็อกอิน */
// อ่านบัญชีปัจจุบันและข้อมูลสิทธิ์ล่าสุด
export async function currentUser(): Promise<Session | null> {
  const client = await initSupabase();
  if (!client) throw new Error("ยังไม่ได้ตั้งค่า Supabase ใน admin/supabase.json");
  const { data } = await client.auth.getSession();
  if (!data.session) return null;
  try {
    const me = await rpc<Me>("me");
    return { id: me.user.id, username: me.user.username, email: me.user.email, displayName: me.user.display_name,
      role: me.user.role, mustChange: me.user.mustChange, sports: me.sports, sportIds: me.assignments.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (a) => a.sport_id) };
  } catch {
    // บัญชีถูกปิดหรือ token ใช้ไม่ได้แล้ว
    await client.auth.signOut({ scope: "local" });
    return null;
  }
}

/** token ล่าสุดสำหรับเรียก api/cms (supabase-js ต่ออายุให้เมื่อใกล้หมด) */
// อ่าน access token ของ session ปัจจุบัน
export async function accessToken(): Promise<string | null> {
  return (await supabase().auth.getSession()).data.session?.access_token ?? null;
}

// ยุติการเข้าสู่ระบบและนำกลับหน้าล็อกอิน
export async function logout() {
  await supabase().auth.signOut({ scope: "local" });
  try {
    localStorage.removeItem("decap-cms-user");
  } catch {
    // ไม่มี localStorage ก็ออกจากระบบได้ตามปกติ
  }
  location.replace(LOGIN_PAGE);
}
