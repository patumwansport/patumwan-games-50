import { LogOut } from "@/components/ui/icons";
import { PasswordForm } from "@/admin/password-form";
import { logout, type Session } from "@/admin/session";

/** เข้าสู่ระบบครั้งแรกหรือถูกรีเซ็ตรหัสผ่าน: ต้องตั้งรหัสผ่านใหม่ก่อนใช้งานส่วนอื่น */
// แสดงขั้นตอนเปลี่ยนรหัสผ่านก่อนเข้าใช้งาน
export function FirstPassword({ session }: { session: Session }) {
  return <main className="grid min-h-svh place-items-center bg-canvas px-4 py-8">
    <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 sm:p-7">
      <img src="/assets/images/logo.png" alt="" width={56} height={56} className="mx-auto size-14 object-contain" />
      <h1 className="mt-3 text-center text-xl font-semibold">ตั้งรหัสผ่านใหม่</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">สวัสดี {session.displayName} กรุณาตั้งรหัสผ่านของคุณเองก่อนเริ่มใช้งาน</p>
      <PasswordForm currentLabel="รหัสผ่านชั่วคราว" onDone={/* จัดการ onDone ขององค์ประกอบบนหน้าจอ */ () => location.reload()} />
      <button type="button" onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => void logout()} className="mx-auto mt-5 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <LogOut aria-hidden="true" className="size-4" />ออกจากระบบ
      </button>
    </div>
  </main>;
}
