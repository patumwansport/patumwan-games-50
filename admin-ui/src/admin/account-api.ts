// บัญชีผู้ใช้หลังบ้าน: อ่านรายชื่อจากฐานข้อมูล ส่วนสร้าง/แก้/รีเซ็ตผ่าน Edge Function "accounts"
import { accounts, rpc } from "@/admin/supabase";
import type { Role } from "@/admin/session";

export interface Member {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: Role;
  active: boolean;
  must_change: boolean;
  updated_at: string;
  sports: number[];
}

export interface MemberInput { display_name: string; role: Role; sports: number[] }

export const listMembers = /* อ่านรายชื่อสมาชิกพร้อมสิทธิ์ */ () => rpc<Member[]>("admin_list_users");

/** รหัสผ่านชั่วคราวที่ Edge Function สุ่มให้ แสดงให้แอดมินครั้งเดียว ไม่ได้เก็บไว้ที่ใด */
export interface Credentials { username: string; password: string }

export const createMember = /* ส่งคำขอสร้างสมาชิกใหม่ */ (input: MemberInput & { email: string }) =>
  accounts<Credentials & { id: string }>({ action: "create_user", ...input });

export const updateMember = /* ส่งคำขอแก้ข้อมูลและสิทธิ์สมาชิก */ (id: string, input: MemberInput & { active: boolean }) =>
  accounts<{ ok: true }>({ action: "update_user", user_id: id, ...input });

export const resetMemberPassword = /* ส่งคำขอรีเซ็ตรหัสผ่านสมาชิก */ (id: string) => accounts<Credentials>({ action: "reset_password", user_id: id });

export const changePassword = /* ส่งคำขอเปลี่ยนรหัสผ่านของบัญชี */ (current: string, next: string) => accounts<{ ok: true }>({ action: "change_password", current, next });
