import { useId, useState, type FormEvent } from "react";
import { KeyRound } from "@/components/ui/icons";
import { changePassword } from "@/admin/account-api";
import { FlowButton } from "@/components/ui/flow-button";

function PasswordField({ label, name, autoComplete, minLength, maxLength, describedBy }: {
  label: string; name: string; autoComplete: string; minLength?: number; maxLength: number; describedBy?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return <div>
    <label htmlFor={id}>{label}</label>
    <div className="relative">
      <input id={id} className="admin-field !pr-20" name={name} type={visible ? "text" : "password"} required autoComplete={autoComplete} minLength={minLength} maxLength={maxLength} aria-describedby={describedBy} />
      <button type="button" aria-controls={id} aria-label={`${visible ? "ซ่อน" : "แสดง"}${label}`} aria-pressed={visible} onClick={() => setVisible(value => !value)} className="absolute inset-y-0 right-1 my-1 min-w-16 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
        {visible ? "ซ่อน" : "แสดง"}
      </button>
    </div>
  </div>;
}

/** ฟอร์มเปลี่ยนรหัสผ่านของตนเอง ใช้ทั้งหน้าตั้งค่าและหน้าบังคับเปลี่ยนรหัสครั้งแรก */
// สร้างฟอร์มเปลี่ยนรหัสผ่านและแสดงผลการบันทึก
export function PasswordForm({ onDone, currentLabel = "รหัสผ่านปัจจุบัน" }: { onDone: () => void; currentLabel?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ruleId = useId();
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
      <PasswordField label={currentLabel} name="current" autoComplete="current-password" maxLength={128} />
      <PasswordField label="รหัสผ่านใหม่" name="next" autoComplete="new-password" minLength={8} maxLength={72} describedBy={ruleId} />
      <PasswordField label="ยืนยันรหัสผ่านใหม่" name="confirm" autoComplete="new-password" minLength={8} maxLength={72} />
      <p id={ruleId} className="text-xs text-muted-foreground">อย่างน้อย 8 ตัว มีตัวอักษรอังกฤษและตัวเลข และต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน</p>
      <FlowButton type="submit" icon={KeyRound} className="justify-self-center">{busy ? "กำลังบันทึก…" : "เปลี่ยนรหัสผ่าน"}</FlowButton>
    </fieldset>
  </form>;
}
