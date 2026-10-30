import { useState, type FormEvent } from "react";
import { KeyRound } from "@/components/ui/icons";
import { changePassword } from "@/admin/account-api";
import { FlowButton } from "@/components/ui/flow-button";

/** ฟอร์มเปลี่ยนรหัสผ่านของตนเอง ใช้ทั้งหน้าตั้งค่าและหน้าบังคับเปลี่ยนรหัสครั้งแรก */
// สร้างฟอร์มเปลี่ยนรหัสผ่านและแสดงผลการบันทึก
export function PasswordForm({ onDone, currentLabel = "รหัสผ่านปัจจุบัน" }: { onDone: () => void; currentLabel?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // ส่งข้อมูลที่ตรวจครบแล้วไปดำเนินการ
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (data.next !== data.confirm) { setError("รหัสผ่านใหม่สองช่องไม่ตรงกัน"); return; }
    setBusy(true); setError("");
    try { await changePassword(data.current, data.next); form.reset(); onDone(); }
    catch (err) { setError(err instanceof Error ? err.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-4">
    {error ? <p role="alert" className="mb-4 rounded-lg bg-accent-soft p-4 text-accent">{error}</p> : null}
    <fieldset disabled={busy} className="grid gap-4">
      <label>{currentLabel}<input className="admin-field" name="current" type="password" required autoComplete="current-password" maxLength={128} /></label>
      <label>รหัสผ่านใหม่<input className="admin-field" name="next" type="password" required autoComplete="new-password" minLength={8} maxLength={72} aria-describedby="password-rule" /></label>
      <label>ยืนยันรหัสผ่านใหม่<input className="admin-field" name="confirm" type="password" required autoComplete="new-password" minLength={8} maxLength={72} /></label>
      <p id="password-rule" className="text-xs text-muted-foreground">อย่างน้อย 8 ตัว มีตัวอักษรอังกฤษและตัวเลข และต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน</p>
      <FlowButton type="submit" icon={KeyRound} className="justify-self-start">{busy ? "กำลังบันทึก…" : "เปลี่ยนรหัสผ่าน"}</FlowButton>
    </fieldset>
  </form>;
}
