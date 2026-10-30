import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { ClipboardList, History, LogOut, PanelLeft, Settings, ShieldCheck, Users, X } from "@/components/ui/icons";
import {
  AnimatedSidebar, AnimatedSidebarClose, AnimatedSidebarContent, AnimatedSidebarFooter,
  AnimatedSidebarGroup, AnimatedSidebarGroupContent, AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader, AnimatedSidebarInset, AnimatedSidebarMenu, AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem, AnimatedSidebarProvider, AnimatedSidebarRail, AnimatedSidebarTrigger,
} from "@/components/ui/animated-sidebar";
import { MenuSearch } from "@/admin/menu-search";
import { applyTextSize, textSize } from "@/admin/preferences";
import "@/index.css";
import "./portal.css";
import { startPortal } from "./portal.js";

interface Snapshot {
  path: string;
  user: { display_name: string; username: string; role: string } | null;
  roleLabel: string;
  scope: string;
}
declare global {
  interface Window { ResultsPortal?: { logout: () => Promise<void> }; }
}
const empty: Snapshot = { path: "/matches", user: null, roleLabel: "", scope: "" };
const open = /* เปิดรายการหรือหน้าต่างที่ผู้ใช้เลือก */ (id: string) => { location.hash = `#${id}`; };
const initials = /* สร้างอักษรย่อจากชื่อบุคคล */ (name = "") => name.trim().split(/\s+/).slice(0, 2).map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (part) => part.charAt(0)).join("");

// สร้างโครงหน้าระบบกีฬาและซิงก์สถานะกับส่วนฟอร์ม
function ResultsWorkspace() {
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(/* เริ่มงานตามสถานะ React และคืนฟังก์ชันล้างงานเมื่อจำเป็นในระบบกีฬา */ () => {
    const update = /* อัปเดตสถานะหรือการแสดงผล */ (event: Event) => {
      const next = (event as CustomEvent<Snapshot>).detail;
      setSnapshot(next);
      if (!next.user) setMobileOpen(false);
    };
    window.addEventListener("results:shell", update);
    // หน้าจอของระบบผลวาดลงใน #main ที่ React สร้างไว้แล้ว จึงเริ่มหลัง mount ครั้งแรกเท่านั้น
    if (!window.ResultsPortal) {
      try { startPortal(); } catch { setError("โหลดระบบผลการแข่งขันไม่สำเร็จ กรุณารีเฟรชหน้า"); }
    }
    return /* ยกเลิกการติดตามหรือคืนทรัพยากรเมื่อส่วนนี้หยุดทำงาน */ () => window.removeEventListener("results:shell", update);
  }, []);
  const isAdmin = snapshot.user?.role === "admin";
  const nav = [
    { id: "/schedule", label: "ตารางแข่งขัน", title: "ตารางแข่งขันรายวัน", description: "จัดเวลา ประเภท และส่งออกตารางแข่งขัน", icon: ClipboardList },
    { id: "/matches", label: "รายการแข่งขัน", title: "รายการแข่งขัน", description: "กรอกคะแนน ส่งตรวจ และดูผลการแข่งขัน", icon: ClipboardList },
    ...(isAdmin ? [
      { id: "/users", label: "Role manager", title: "Role manager", description: "สร้างบัญชีและมอบหมายกีฬาที่หน้าแอดมิน", icon: Users },
      { id: "/audit", label: "ประวัติการใช้งาน", title: "ประวัติการใช้งาน", description: "ดูการเปลี่ยนแปลงผลการแข่งขันและบัญชี", icon: History },
    ] : []),
    { id: "/password", label: "บัญชีและความปลอดภัย", title: "บัญชีและความปลอดภัย", description: "เปลี่ยนรหัสผ่าน", icon: ShieldCheck },
    { id: "/settings", label: "ตั้งค่า (Settings)", title: "ตั้งค่า", description: "ขนาดตัวอักษรและข้อมูลบัญชี", icon: Settings },
  ];
  const active = snapshot.path.startsWith("/matches") || snapshot.path === "/new" ? "/matches" : snapshot.path;
  const current = nav.find(/* ค้นหารายการแรกที่ตรงตามเงื่อนไขในระบบกีฬา */ (item) => item.id === active);
  const signOut = /* ออกจากระบบพร้อมจัดการสถานะระหว่างดำเนินการ */ async () => {
    if (!window.ResultsPortal || signingOut) return;
    setSigningOut(true); setError("");
    try { await window.ResultsPortal.logout(); }
    catch (err) { setError(err instanceof Error ? err.message : "ออกจากระบบไม่สำเร็จ"); }
    finally { setSigningOut(false); }
  };
  return <AnimatedSidebarProvider className="h-svh min-h-0 overflow-hidden bg-background" style={{ "--sidebar-width": "16rem" }} openMobile={mobileOpen} onOpenMobileChange={setMobileOpen}>
    <a className="skip" href="#main" onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ (event) => { event.preventDefault(); document.getElementById("main")?.focus(); }}>ข้ามไปเนื้อหา</a>
    <div className={snapshot.user ? "contents" : "hidden"}>
      <AnimatedSidebar ariaLabel="เมนูระบบผลการแข่งขัน" collapsible="icon" className="min-h-0" panelClassName="border-border bg-canvas">
        <AnimatedSidebarHeader className="p-3 pb-2"><div className="flex min-h-11 items-center gap-3 overflow-hidden px-1.5">
          <img src="/assets/images/logo.png" alt="" width={32} height={32} className="size-8 shrink-0 object-contain" />
          <div className="min-w-0 flex-1 leading-tight group-data-[state=collapsed]/sidebar:hidden"><p className="truncate text-base font-semibold text-foreground">ปทุมวันเกมส์ 50</p><p className="truncate text-xs text-muted-foreground">ระบบผลการแข่งขัน</p></div>
          <AnimatedSidebarClose aria-label="ปิดเมนู" className="ml-auto text-muted-foreground hover:bg-muted md:hidden"><X aria-hidden="true" className="size-4" /></AnimatedSidebarClose>
        </div></AnimatedSidebarHeader>
        <AnimatedSidebarContent className="px-2 pt-1">
          {[
            { label: "การแข่งขัน", items: nav.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในระบบกีฬา */ (item) => ["/matches", "/schedule"].includes(item.id)) },
            { label: "จัดการระบบ", items: nav.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในระบบกีฬา */ (item) => !["/matches", "/schedule"].includes(item.id)) },
          ].map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (group) => <AnimatedSidebarGroup key={group.label} className="pt-1"><AnimatedSidebarGroupLabel className="text-xs normal-case tracking-normal">{group.label}</AnimatedSidebarGroupLabel><AnimatedSidebarGroupContent><AnimatedSidebarMenu>
            {group.items.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ ({ id, label, icon: Icon }) => <AnimatedSidebarMenuItem key={id}><AnimatedSidebarMenuButton isActive={active === id} icon={<Icon className="size-4" />} onSelect={/* จัดการ onSelect ขององค์ประกอบบนหน้าจอ */ () => open(id)}>{label}</AnimatedSidebarMenuButton></AnimatedSidebarMenuItem>)}
          </AnimatedSidebarMenu></AnimatedSidebarGroupContent></AnimatedSidebarGroup>)}
        </AnimatedSidebarContent>
        <AnimatedSidebarFooter className="border-t border-border p-3"><div className="flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-xl p-1 group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:gap-0">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm uppercase text-primary group-data-[state=collapsed]/sidebar:hidden">{initials(snapshot.user?.display_name)}</span>
          <span className="min-w-0 flex-1 group-data-[state=collapsed]/sidebar:hidden"><span className="block truncate text-sm text-foreground" title={snapshot.user?.display_name}>{snapshot.user?.display_name}</span><span className="block truncate text-xs text-muted-foreground">{snapshot.roleLabel}</span></span>
          <button type="button" disabled={signingOut} onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => void signOut()} aria-label="ออกจากระบบ" title="ออกจากระบบ" className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><LogOut aria-hidden="true" className="size-5" /></button>
        </div></AnimatedSidebarFooter>
        <AnimatedSidebarRail aria-label="ย่อ/ขยายเมนู" />
      </AnimatedSidebar>
    </div>
    <AnimatedSidebarInset className={`min-h-0 ${snapshot.user ? "bg-background" : "bg-canvas"}`}>
      <header className={`${snapshot.user ? "flex" : "hidden"} min-h-16 shrink-0 flex-wrap items-center gap-3 border-b border-border px-3 py-3 sm:px-6 xl:flex-nowrap`}>
        <AnimatedSidebarTrigger aria-label="ย่อ/ขยายเมนู" className="text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><PanelLeft aria-hidden="true" className="size-4" /></AnimatedSidebarTrigger><div className="h-5 w-px bg-border" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium"><span className="text-foreground">{current?.title || "รายการแข่งขัน"}</span>{snapshot.scope ? <span className="ml-2 text-muted-foreground">/ {snapshot.scope}</span> : null}</p>
        <div className="order-last w-full xl:order-none xl:w-64"><MenuSearch onOpen={open} canManage={!!isAdmin} pages={nav.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในระบบกีฬา */ (page) => ({ page, icon: page.icon }))} /></div>
        <button type="button" className="admin-button shrink-0 px-3 text-sm" onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => open("/settings")} aria-label="ตั้งค่า Settings"><Settings aria-hidden="true" className="size-5" /><span className="hidden sm:inline">ตั้งค่า</span></button>
      </header>
      {error ? <p role="alert" className="bg-accent-soft px-5 py-3 text-accent">{error}</p> : null}
      <div className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-7xl px-4 sm:px-7 lg:px-9"><div id="notice" role="status" aria-live="polite" /></div>
        <div id="main" tabIndex={-1} className="results-content mx-auto w-full max-w-7xl px-4 py-6 sm:px-7 sm:py-8 lg:px-9" />
      </div>
    </AnimatedSidebarInset>
  </AnimatedSidebarProvider>;
}
applyTextSize(textSize());
createRoot(document.getElementById("root")!).render(<ResultsWorkspace />);
