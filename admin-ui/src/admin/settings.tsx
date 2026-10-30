import { useState } from "react";
import { Save, Type, KeyRound, UserCircle } from "@/components/ui/icons";
import { PasswordForm } from "@/admin/password-form";
import { saveTextSize, textSize, TEXT_SIZES } from "@/admin/preferences";
import { roleLabel, type Session } from "@/admin/session";
import { FlowButton } from "@/components/ui/flow-button";

// แสดงหน้าตั้งค่าบัญชีและขนาดตัวอักษร
export function Settings({ session }: { session: Session }) {
  const [size, setSize] = useState(textSize);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const mySports = session.sports.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหลังบ้าน */ (s) => session.sportIds.includes(s.id));
  return <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-7"><div className="mx-auto max-w-4xl">
    <h1 className="text-2xl font-semibold">ตั้งค่า (Settings)</h1><p className="mt-2 mb-6 text-muted-foreground">ปรับการอ่านและดูแลบัญชีของคุณ</p>
    {notice ? <p role="status" className="mb-5 rounded-lg bg-muted p-4">{notice}</p> : null}{error ? <p role="alert" className="mb-5 rounded-lg bg-accent-soft p-4 text-accent">{error}</p> : null}
    <section className="mb-6 rounded-xl border border-border p-5"><h2 className="flex items-center gap-2 text-xl font-semibold"><Type aria-hidden="true" className="size-5" />ขนาดตัวอักษร</h2>
      <p className="mt-2 text-muted-foreground">ใช้กับเมนู ตาราง และฟอร์มแก้ไข บันทึกเฉพาะเบราว์เซอร์นี้</p><label className="mt-4 block max-w-sm">เลือกขนาด<select className="admin-field" value={size} onChange={/* จัดการ onChange ขององค์ประกอบบนหน้าจอ */ (event) => setSize(Number(event.target.value))}>{TEXT_SIZES.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (n) => <option key={n} value={n}>{n === 20 ? "มาตรฐาน" : n === 22 ? "ใหญ่" : "ใหญ่มาก"} · {n}px</option>)}</select></label>
      <FlowButton icon={Save} className="mt-4" onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => { try { saveTextSize(size); setNotice("บันทึกขนาดตัวอักษรแล้ว"); setError(""); } catch { setError("เบราว์เซอร์ไม่อนุญาตให้บันทึกการตั้งค่า"); } }}>บันทึกการแสดงผล</FlowButton>
    </section>
    <section className="mb-6 rounded-xl border border-border p-5"><h2 className="flex items-center gap-2 text-xl font-semibold"><UserCircle aria-hidden="true" className="size-5" />บัญชีของคุณ</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr]"><dt className="text-muted-foreground">ชื่อ</dt><dd>{session.displayName}</dd><dt className="text-muted-foreground">ชื่อผู้ใช้</dt><dd>{session.username}</dd><dt className="text-muted-foreground">อีเมล</dt><dd className="break-all">{session.email}</dd><dt className="text-muted-foreground">Role</dt><dd>{roleLabel(session.role)}</dd>
        {mySports.length ? <><dt className="text-muted-foreground">กีฬาที่รับผิดชอบ</dt><dd>{mySports.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (s) => s.name).join(", ")}</dd></> : null}</dl></section>
    <section className="mb-6 rounded-xl border border-border p-5"><h2 className="flex items-center gap-2 text-xl font-semibold"><KeyRound aria-hidden="true" className="size-5" />เปลี่ยนรหัสผ่าน</h2>
      <PasswordForm onDone={/* จัดการ onDone ขององค์ประกอบบนหน้าจอ */ () => { setError(""); setNotice("เปลี่ยนรหัสผ่านแล้ว"); }} />
    </section>
  </div></div>;
}
