import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { ArrowUpDown, ArrowDown, ArrowUp, Filter, MoreHorizontal, Plus, RefreshCw, Search, Users, X } from "@/components/ui/icons";
import { createMember, listMembers, resetMemberPassword, updateMember, type Credentials, type Member } from "@/admin/account-api";
import { ROLES, needsSports, roleLabel, type Role, type Session } from "@/admin/session";
import { usernameFor } from "@/admin/supabase";
import { cn } from "@/lib/utils";

type SortKey = "name" | "username" | "status" | "role";
type StatusFilter = "all" | "active" | "inactive" | "pending";

const updated = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
const thai = new Intl.Collator("th");
const roleOrder = /* หาลำดับบทบาทสำหรับเรียงตารางสมาชิก*/ (role: Role) => ROLES.findIndex(/* ทำงานต่อภายใน ROLES.findIndex ของหลังบ้าน */ (r) => r.id === role);
const statusOrder = /* กำหนดลำดับจากสถานะบัญชีและการเปลี่ยนรหัสผ่านครั้งแรก*/ (m: Member) => (!m.active ? 2 : m.must_change ? 1 : 0);

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "name", label: "Name" },
  { key: "username", label: "Username" },
  { key: "status", label: "Status", className: "w-40" },
  { key: "role", label: "Role", className: "w-56" },
];

// แสดงตารางสมาชิกและคำสั่งจัดการบัญชี
export function Members({ session }: { session: Session }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [query, setQuery] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean } | null>(null);
  const [editing, setEditing] = useState<Member | "new" | null>(null);
  const [confirm, setConfirm] = useState<{ member: Member; action: "reset" | "toggle" } | null>(null);
  const sportName = useMemo(/* คำนวณค่าจากสถานะโดยใช้ผลเดิมเมื่อข้อมูลไม่เปลี่ยนในหลังบ้าน */ () => new Map(session.sports.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (s) => [s.id, s.name])), [session.sports]);

  // โหลดข้อมูลล่าสุดและอัปเดตสถานะหน้าจอ
  async function load() {
    setLoading(true); setError("");
    try { setMembers(await listMembers()); }
    catch (err) { setError(err instanceof Error ? err.message : "โหลดรายชื่อไม่สำเร็จ"); }
    finally { setLoading(false); }
  }
  useEffect(/* เริ่มงานตามสถานะ React และคืนฟังก์ชันล้างงานเมื่อจำเป็นในหลังบ้าน */ () => { void load(); }, []);

  const rows = useMemo(/* คำนวณค่าจากสถานะโดยใช้ผลเดิมเมื่อข้อมูลไม่เปลี่ยนในหลังบ้าน */ () => {
    const q = query.trim().toLowerCase();
    const list = members.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหลังบ้าน */ (m) =>
      (!q || `${m.display_name} ${m.username} ${m.email} ${roleLabel(m.role)}`.toLowerCase().includes(q)) &&
      (!roles.length || roles.includes(m.role)) &&
      (status === "all" || (status === "active" ? m.active && !m.must_change : status === "inactive" ? !m.active : m.active && m.must_change)));
    if (!sort) return list;
    const compare: Record<SortKey, (a: Member, b: Member) => number> = {
      name: /* เปรียบเทียบชื่อบุคคลโดยใช้การเรียงภาษาไทย*/ (a, b) => thai.compare(a.display_name, b.display_name),
      username: /* เปรียบเทียบชื่อผู้ใช้สำหรับเรียงตาราง*/ (a, b) => a.username.localeCompare(b.username),
      status: /* เปรียบเทียบลำดับสถานะบัญชี*/ (a, b) => statusOrder(a) - statusOrder(b),
      role: /* เปรียบเทียบลำดับบทบาทสมาชิก*/ (a, b) => roleOrder(a.role) - roleOrder(b.role),
    };
    return [...list].sort(/* เปรียบเทียบรายการเพื่อจัดลำดับในหลังบ้าน */ (a, b) => compare[sort.key](a, b) * (sort.desc ? -1 : 1));
  }, [members, query, roles, status, sort]);

  const toggleSort = /* สลับการเรียงจากน้อยไปมาก มากไปน้อย หรือยกเลิกการเรียง*/ (key: SortKey) => setSort(/* ทำงานต่อภายใน setSort ของหลังบ้าน */ (s) => (s?.key !== key ? { key, desc: false } : s.desc ? null : { key, desc: true }));
  const filterCount = roles.length + (status === "all" ? 0 : 1);

  // ดำเนินการที่ผู้ใช้ยืนยันแล้วและโหลดตารางสมาชิกใหม่
  async function runConfirm() {
    if (!confirm) return;
    const { member, action } = confirm;
    if (action === "reset") {
      setCredentials(await resetMemberPassword(member.id));
      setNotice(`รีเซ็ตรหัสผ่านของ ${member.username} แล้ว รหัสผ่านเดิมใช้ไม่ได้ทันที`);
    } else {
      await updateMember(member.id, { display_name: member.display_name, role: member.role, sports: member.sports, active: !member.active });
      setNotice(`${member.active ? "ปิด" : "เปิด"}ใช้งานบัญชี ${member.username} แล้ว`);
    }
    setConfirm(null);
    await load();
  }

  return <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
    <div className="rounded-2xl border border-border bg-background shadow-[0_1px_3px_oklch(27%_0.035_270/0.06)]">
      <div className="flex flex-wrap items-center gap-2.5 p-4 sm:p-5">
        <label className="relative min-w-0 flex-1 basis-60">
          <span className="sr-only">ค้นหาผู้ใช้งาน</span>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={query} onChange={/* จัดการ onChange ขององค์ประกอบบนหน้าจอ */ (e) => setQuery(e.target.value)} placeholder="ค้นหาผู้ใช้งาน…"
            className="h-11 w-full rounded-lg border border-border bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-ring/15" />
        </label>
        <FilterMenu roles={roles} setRoles={setRoles} status={status} setStatus={setStatus} count={filterCount} />
        <button type="button" onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => void load()} disabled={loading} aria-label="โหลดรายชื่อใหม่" title="โหลดรายชื่อใหม่"
          className="grid size-11 place-items-center rounded-lg border border-border text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          <RefreshCw aria-hidden="true" className={cn("size-4", loading && "animate-spin motion-reduce:animate-none")} />
        </button>
        <button type="button" onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => { setEditing("new"); setNotice(""); }}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-semibold text-background outline-none hover:bg-foreground/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <Plus aria-hidden="true" className="size-4" />Add
        </button>
      </div>

      {error ? <p role="alert" className="mx-4 mb-4 rounded-lg bg-accent-soft p-4 text-accent sm:mx-5">{error}</p> : null}
      {notice ? <p role="status" className="mx-4 mb-4 rounded-lg bg-muted p-4 sm:mx-5">{notice}</p> : null}
      {credentials ? <CredentialsBox credentials={credentials} onHide={() => setCredentials(null)} /> : null}

      <div className="overflow-x-auto border-t border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              {COLUMNS.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (c) => {
                const active = sort?.key === c.key;
                const Icon = !active ? ArrowUpDown : sort.desc ? ArrowDown : ArrowUp;
                return <th key={c.key} scope="col" aria-sort={active ? (sort.desc ? "descending" : "ascending") : "none"} className={cn("px-5 py-3 font-normal", c.className)}>
                  <button type="button" onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => toggleSort(c.key)} className="-mx-1 inline-flex items-center gap-1.5 rounded px-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                    {c.label}<Icon aria-hidden="true" className="size-3.5" />
                  </button>
                </th>;
              })}
              <th scope="col" className="w-14 px-3 py-3"><span className="sr-only">จัดการ</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && !members.length ? Array.from({ length: 4 }, /* ทำงานต่อภายใน Array.from ของหลังบ้าน */ (_, i) => <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-9 animate-pulse rounded bg-muted motion-reduce:animate-none" /></td></tr>) : null}
            {rows.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (m) => {
              const self = m.id === session.id;
              return <tr key={m.id} className="hover:bg-canvas">
                <td className="px-5 py-3.5 font-medium">{m.display_name}{self ? <span className="ml-2 text-xs font-normal text-muted-foreground">(คุณ)</span> : null}</td>
                <td className="px-5 py-3.5"><span className="block">@{m.username}</span><span className="block text-xs text-muted-foreground">Updated {updated.format(new Date(m.updated_at))}</span></td>
                <td className="px-5 py-3.5"><StatusBadge member={m} /></td>
                <td className="px-5 py-3.5">
                  <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{roleLabel(m.role)}</span>
                  {needsSports(m.role) ? <span className="mt-1 block max-w-56 truncate text-xs text-muted-foreground" title={m.sports.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (id) => sportName.get(id)).join(", ")}>
                    {m.sports.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (id) => sportName.get(id) ?? id).join(", ")}
                  </span> : null}
                </td>
                <td className="px-3 py-3.5 text-right">
                  <RowMenu label={m.display_name} items={[
                    { label: "แก้ไข", onSelect: /* ดำเนินการตามเมนูจัดการสมาชิกที่เลือก*/ () => { setEditing(m); setNotice(""); } },
                    { label: "รีเซ็ตรหัสผ่าน", disabled: self, onSelect: /* ดำเนินการตามเมนูจัดการสมาชิกที่เลือก*/ () => setConfirm({ member: m, action: "reset" }) },
                    { label: m.active ? "ปิดใช้งาน" : "เปิดใช้งาน", disabled: self, danger: m.active, onSelect: /* ดำเนินการตามเมนูจัดการสมาชิกที่เลือก*/ () => setConfirm({ member: m, action: "toggle" }) },
                  ]} />
                </td>
              </tr>;
            })}
            {!loading && !rows.length ? <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
              <Users aria-hidden="true" className="mx-auto mb-2 size-7" />{members.length ? "ไม่พบผู้ใช้ที่ตรงกับการค้นหา" : "ยังไม่มีบัญชีผู้ใช้"}
            </td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-5 py-3.5 text-right text-sm text-muted-foreground">Show {rows.length} / {members.length} items</p>
    </div>

    {editing ? <MemberDialog session={session} member={editing === "new" ? null : editing} onClose={/* จัดการ onClose ขององค์ประกอบบนหน้าจอ */ () => setEditing(null)}
      onSaved={/* จัดการ onSaved ขององค์ประกอบบนหน้าจอ */ async (message, created) => { setEditing(null); setNotice(message); setCredentials(created ?? null); await load(); }} /> : null}
    {confirm ? <ConfirmDialog
      title={confirm.action === "reset" ? "รีเซ็ตรหัสผ่าน" : confirm.member.active ? "ปิดใช้งานบัญชี" : "เปิดใช้งานบัญชี"}
      confirmLabel={confirm.action === "reset" ? "รีเซ็ตรหัสผ่าน" : confirm.member.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      danger={confirm.action === "toggle" && confirm.member.active}
      onCancel={/* จัดการ onCancel ขององค์ประกอบบนหน้าจอ */ () => setConfirm(null)} onConfirm={runConfirm}>
      {confirm.action === "reset"
        ? <>สุ่มรหัสผ่านชั่วคราวใหม่ให้ <b>{confirm.member.display_name}</b> รหัสผ่านเดิมใช้ไม่ได้ทันที ผู้ใช้ต้องเข้าสู่ระบบด้วยรหัสชั่วคราวแล้วตั้งรหัสผ่านใหม่ก่อนใช้งานต่อ</>
        : confirm.member.active
          ? <><b>{confirm.member.display_name}</b> จะเข้าสู่ระบบไม่ได้ และหยุดใช้งานได้ทันทีแม้เปิดหน้าค้างไว้ ประวัติการทำงานยังเก็บไว้ครบ</>
          : <><b>{confirm.member.display_name}</b> จะกลับมาเข้าสู่ระบบได้ด้วยรหัสผ่านเดิม</>}
    </ConfirmDialog> : null}
  </div>;
}

// แสดงป้ายสถานะบัญชีสมาชิก
// รหัสผ่านชั่วคราวแสดงครั้งเดียว: ปิดกล่องหรือออกจากหน้านี้แล้วดูซ้ำไม่ได้ (รีเซ็ตใหม่ได้)
function CredentialsBox({ credentials, onHide }: { credentials: Credentials; onHide: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `ชื่อผู้ใช้: ${credentials.username}\nรหัสผ่านชั่วคราว: ${credentials.password}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); }
    catch { setCopied(false); }
  };
  return <section aria-label="รหัสผ่านชั่วคราว" className="mx-4 mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:mx-5">
    <h2 className="font-semibold">รหัสผ่านชั่วคราว (แสดงครั้งเดียว)</h2>
    <p className="mt-2">ชื่อผู้ใช้ <b>{credentials.username}</b> · รหัสผ่าน <code className="rounded bg-background px-2 py-0.5 text-base tracking-wider">{credentials.password}</code></p>
    <p className="mt-2 text-sm text-muted-foreground">ส่งให้เจ้าของบัญชีโดยตรง ผู้ใช้ต้องตั้งรหัสผ่านใหม่เมื่อเข้าสู่ระบบครั้งแรก</p>
    <div className="mt-3 flex gap-2">
      <button type="button" onClick={() => void copy()} className="admin-button px-3 text-sm">{copied ? "คัดลอกแล้ว" : "คัดลอก"}</button>
      <button type="button" onClick={onHide} className="admin-button px-3 text-sm">ซ่อนรหัสผ่าน</button>
    </div>
  </section>;
}

function StatusBadge({ member }: { member: Member }) {
  if (!member.active) return <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inactive</span>;
  return <span className="inline-flex flex-wrap gap-1">
    <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs text-success">Active</span>
    {member.must_change ? <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs text-warning">รอเปลี่ยนรหัสผ่าน</span> : null}
  </span>;
}

/** ปิดเมนู/ป๊อปอัปเมื่อคลิกนอกพื้นที่หรือกด Escape แล้วคืนโฟกัสให้ปุ่มที่เปิด */
// จัดการเปิดปิดเมนูย่อยรวมถึงคลิกภายนอกและปุ่ม Escape
function usePopover() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(/* เริ่มงานตามสถานะ React และคืนฟังก์ชันล้างงานเมื่อจำเป็นในหลังบ้าน */ () => {
    if (!open) return;
    const outside = /* ปิดเมนูเมื่อคลิกนอกพื้นที่ขององค์ประกอบ*/ (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const escape = /* ปิดเมนูด้วย Escape และคืนโฟกัสให้ปุ่มเปิดเมนู*/ (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return /* ยกเลิกการติดตามหรือคืนทรัพยากรเมื่อส่วนนี้หยุดทำงาน */ () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return { open, setOpen, root, trigger };
}

// แสดงตัวกรองตารางสมาชิก
function FilterMenu({ roles, setRoles, status, setStatus, count }: {
  roles: Role[]; setRoles: (r: Role[]) => void; status: StatusFilter; setStatus: (s: StatusFilter) => void; count: number;
}) {
  const { open, setOpen, root, trigger } = usePopover();
  const id = useId();
  const statuses: [StatusFilter, string][] = [["all", "ทั้งหมด"], ["active", "Active"], ["pending", "รอเปลี่ยนรหัสผ่าน"], ["inactive", "Inactive"]];
  return <div ref={root} className="relative">
    <button ref={trigger} type="button" aria-expanded={open} aria-controls={id} onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => setOpen(!open)}
      className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-3.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
      <Filter aria-hidden="true" className="size-4" />Filter{count ? <span className="grid size-5 place-items-center rounded-full bg-foreground text-[0.7rem] text-background">{count}</span> : null}
    </button>
    {open ? <div id={id} className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-border bg-background p-4 shadow-lg">
      <fieldset><legend className="mb-2 text-xs text-muted-foreground">Role</legend>
        {ROLES.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (r) => <label key={r.id} className="flex items-center gap-2.5 py-1 text-sm">
          <input type="checkbox" className="size-4" checked={roles.includes(r.id)} onChange={/* จัดการ onChange ขององค์ประกอบบนหน้าจอ */ (e) => setRoles(e.target.checked ? [...roles, r.id] : roles.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหลังบ้าน */ (x) => x !== r.id))} />{r.label}
        </label>)}
      </fieldset>
      <fieldset className="mt-3 border-t border-border pt-3"><legend className="sr-only">Status</legend><p aria-hidden="true" className="mb-2 text-xs text-muted-foreground">Status</p>
        {statuses.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ ([value, label]) => <label key={value} className="flex items-center gap-2.5 py-1 text-sm">
          <input type="radio" name={`${id}-status`} className="size-4" checked={status === value} onChange={/* จัดการ onChange ขององค์ประกอบบนหน้าจอ */ () => setStatus(value)} />{label}
        </label>)}
      </fieldset>
      {count ? <button type="button" onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => { setRoles([]); setStatus("all"); }} className="mt-3 text-sm text-primary underline-offset-2 hover:underline">ล้างตัวกรอง</button> : null}
    </div> : null}
  </div>;
}

// แสดงเมนูคำสั่งของสมาชิกหนึ่งแถว
function RowMenu({ label, items }: { label: string; items: { label: string; onSelect: () => void; disabled?: boolean; danger?: boolean }[] }) {
  const { open, setOpen, root, trigger } = usePopover();
  const menu = useRef<HTMLDivElement>(null);
  useEffect(/* เริ่มงานตามสถานะ React และคืนฟังก์ชันล้างงานเมื่อจำเป็นในหลังบ้าน */ () => { if (open) menu.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus(); }, [open]);
  const move = /* เลื่อนโฟกัสระหว่างคำสั่งด้วยคีย์บอร์ด*/ (e: ReactKeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const buttons = [...(menu.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
  };
  return <div ref={root} className="relative inline-block">
    <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} aria-label={`จัดการบัญชี ${label}`} onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => setOpen(!open)}
      className="grid size-9 place-items-center rounded-lg outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
      <MoreHorizontal aria-hidden="true" className="size-5" />
    </button>
    {open ? <div ref={menu} role="menu" onKeyDown={move} className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-border bg-background p-1 text-left shadow-lg">
      {items.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (item) => <button key={item.label} type="button" role="menuitem" disabled={item.disabled}
        onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => { setOpen(false); item.onSelect(); }}
        className={cn("block w-full rounded-md px-3 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-40", item.danger && "text-accent")}>
        {item.label}
      </button>)}
    </div> : null}
  </div>;
}

/** กล่องโต้ตอบแบบ modal ใช้ <dialog> ของเบราว์เซอร์ (กัก focus และปิดด้วย Escape ให้เอง) */
// สร้างหน้าต่างฟอร์มพร้อมจัดการโฟกัส
function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(/* เริ่มงานตามสถานะ React และคืนฟังก์ชันล้างงานเมื่อจำเป็นในหลังบ้าน */ () => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={/* จัดการ onCancel ขององค์ประกอบบนหน้าจอ */ (e) => { e.preventDefault(); onClose(); }}
    className={cn("m-auto max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-border bg-background p-0 text-foreground shadow-xl backdrop:bg-foreground/30", wide ? "max-w-2xl" : "max-w-md")}>
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
      <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
      <button type="button" onClick={onClose} aria-label="ปิด" className="grid size-9 place-items-center rounded-lg outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><X aria-hidden="true" className="size-4" /></button>
    </div>
    {children}
  </dialog>;
}

// แสดงรายละเอียดก่อนยืนยันคำสั่งจัดการบัญชี
function ConfirmDialog({ title, confirmLabel, danger, children, onCancel, onConfirm }: {
  title: string; confirmLabel: string; danger?: boolean; children: ReactNode; onCancel: () => void; onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = /* ดำเนินการคำสั่งหรือยืนยันงานที่เลือก */ async () => {
    setBusy(true); setError("");
    try { await onConfirm(); }
    catch (err) { setError(err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ"); setBusy(false); }
  };
  return <Dialog title={title} onClose={onCancel}>
    <div className="px-5 py-4">
      <p className="text-sm leading-relaxed">{children}</p>
      {error ? <p role="alert" className="mt-3 rounded-lg bg-accent-soft p-3 text-sm text-accent">{error}</p> : null}
    </div>
    <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
      <button type="button" className="h-10 rounded-lg border border-border px-4 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" onClick={onCancel} disabled={busy}>ยกเลิก</button>
      <button type="button" onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => void run()} disabled={busy}
        className={cn("h-10 rounded-lg px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60", danger ? "bg-accent text-primary-foreground" : "bg-foreground text-background")}>
        {busy ? "กำลังดำเนินการ…" : confirmLabel}
      </button>
    </div>
  </Dialog>;
}

// แสดงฟอร์มสร้างหรือแก้ข้อมูลสมาชิกและกีฬาที่มอบหมาย
function MemberDialog({ session, member, onClose, onSaved }: { session: Session; member: Member | null; onClose: () => void; onSaved: (message: string, created?: Credentials) => Promise<void> }) {
  const [email, setEmail] = useState(member?.email ?? "");
  const [role, setRole] = useState<Role>(member?.role ?? "technician");
  const [sports, setSports] = useState<number[]>(member?.sports ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const self = member?.id === session.id;
  const roleName = useId();

  // ตรวจและบันทึกข้อมูลที่กรอก
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    const input = { display_name: String(form.get("display_name") ?? "").trim(), role, sports: needsSports(role) ? sports : [] };
    if (needsSports(role) && !sports.length) { setError("กรุณาเลือกกีฬาที่รับผิดชอบอย่างน้อยหนึ่งชนิด"); return; }
    setBusy(true); setError("");
    try {
      if (member) {
        await updateMember(member.id, { ...input, active: member.active });
        await onSaved(`บันทึกบัญชี ${member.username} แล้ว`);
      } else {
        const created = await createMember({ ...input, email: email.trim() });
        await onSaved(`สร้างบัญชี ${created.username} แล้ว`, { username: created.username, password: created.password });
      }
    } catch (err) { setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ"); setBusy(false); }
  }

  const login = usernameFor(email);
  return <Dialog title={member ? "แก้ไขบัญชี" : "เพิ่มบัญชีผู้ใช้"} onClose={onClose} wide>
    <form onSubmit={save}>
      <fieldset disabled={busy} className="grid gap-4 px-5 py-4">
        {error ? <p role="alert" className="rounded-lg bg-accent-soft p-3 text-sm text-accent">{error}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">อีเมล
            <input className="admin-field" type="email" name="email" required readOnly={!!member} value={email} onChange={/* จัดการ onChange ขององค์ประกอบบนหน้าจอ */ (e) => setEmail(e.target.value)}
              autoComplete="off" maxLength={254} placeholder="kittiya.kul@satitpatumwan.ac.th" aria-describedby="login-name" />
            <span id="login-name" className="mt-1 block text-xs text-muted-foreground">{login ? <>ชื่อผู้ใช้สำหรับเข้าสู่ระบบ: <b className="font-semibold text-foreground">{login}</b></> : "ชื่อผู้ใช้สำหรับเข้าสู่ระบบคือส่วนหน้า @ ของอีเมลโรงเรียน"}</span>
          </label>
          <label className="text-sm">ชื่อ-นามสกุล
            <input className="admin-field" name="display_name" required maxLength={150} defaultValue={member?.display_name} autoComplete="off" />
          </label>
        </div>

        <fieldset disabled={self} className="grid gap-2">
          <legend className="mb-1 text-sm">Role</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLES.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (r) => <label key={r.id} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring", role === r.id ? "border-foreground bg-canvas" : "border-border hover:bg-canvas")}>
              <input type="radio" name={roleName} value={r.id} checked={role === r.id} onChange={/* จัดการ onChange ขององค์ประกอบบนหน้าจอ */ () => setRole(r.id)} className="mt-1 size-4" />
              <span><span className="block font-semibold">{r.label}</span><span className="block text-xs text-muted-foreground">{r.description}</span></span>
            </label>)}
          </div>
          {self ? <p className="text-xs text-muted-foreground">เปลี่ยน Role ของตนเองไม่ได้ ให้ IT Admin อีกคนดำเนินการ</p> : null}
        </fieldset>

        {needsSports(role) ? <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm">กีฬาที่รับผิดชอบ <span className="text-muted-foreground">(เลือกได้หลายชนิด)</span></legend>
          <div className="grid max-h-64 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
            {session.sports.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (s) => <label key={s.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-canvas">
              <input type="checkbox" className="size-4" checked={sports.includes(s.id)}
                onChange={/* จัดการ onChange ขององค์ประกอบบนหน้าจอ */ (e) => setSports(e.target.checked ? [...sports, s.id] : sports.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหลังบ้าน */ (x) => x !== s.id))} />
              <span className="text-muted-foreground tabular-nums">{s.code}</span>{s.name}
            </label>)}
          </div>
          <p className="text-xs text-muted-foreground">เลือกแล้ว {sports.length} ชนิด</p>
        </fieldset> : null}

        {!member ? <p className="rounded-lg bg-muted p-3 text-sm">ระบบจะสุ่มรหัสผ่านชั่วคราวให้บัญชีนี้และแสดงครั้งเดียว ผู้ใช้ต้องตั้งรหัสผ่านใหม่เมื่อเข้าสู่ระบบครั้งแรก</p> : null}
      </fieldset>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
        <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-lg border border-border px-4 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">ยกเลิก</button>
        <button type="submit" disabled={busy} className="h-10 rounded-lg bg-foreground px-4 text-sm font-semibold text-background outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60">
          {busy ? "กำลังบันทึก…" : member ? "บันทึก" : "สร้างบัญชี"}
        </button>
      </div>
    </form>
  </Dialog>;
}
