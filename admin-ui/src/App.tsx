import { ExternalLink, LogOut, PanelLeft, Settings as SettingsIcon, X } from "@/components/ui/icons";
import { useEffect, useRef, useState } from "react";
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarMenuSub,
  AnimatedSidebarMenuSubButton,
  AnimatedSidebarMenuSubItem,
  AnimatedSidebarProvider,
  AnimatedSidebarRail,
  AnimatedSidebarTrigger,
} from "@/components/ui/animated-sidebar";
import { Dashboard } from "@/admin/dashboard";
import { EditorFrame, type EditorFrameHandle } from "@/admin/editor-frame";
import { MEDIA, MEDIA_ROUTE, MEMBERS, ROLES, SETTINGS, NAV, OVERVIEW, PAGES, findPage, pageAllowed, pageForRoute } from "@/admin/nav";
import { canEditContent, canEnterResults, logout, roleLabel, type Session } from "@/admin/session";
import { MenuSearch } from "@/admin/menu-search";
import { Members } from "@/admin/members";
import { Roles } from "@/admin/roles";
import { Settings } from "@/admin/settings";
import { FlowLink } from "@/components/ui/flow-button";
import { SITE_ROOT, siteUrl } from "@/admin/paths";

const FIRST_ROUTE = findPage("news")!.page.route!;

// สร้างหน้าหลังบ้านหลักและควบคุมการนำทาง
export default function App({ session }: { session: Session }) {
  const username = session.username;
  const canManage = session.role === "admin";
  // ฝ่ายเทคนิคและผู้ตรวจผลไม่เห็นเมนูเนื้อหาเว็บไซต์ (api/cms ตรวจซ้ำ)
  const canEdit = canEditContent(session.role);
  const canScore = canEnterResults(session.role);
  const allowed = /* ตรวจว่าผู้ใช้เปิดเมนูที่ระบุได้หรือไม่*/ (id: string) => { const target = findPage(id); return !!target && pageAllowed(target.page, canManage, canEdit, canScore); };
  const [active, setActive] = useState(/* ทำงานต่อภายใน useState ของหลังบ้าน */ () => {
    const id = location.hash.slice(1);
    return allowed(id) && !findPage(id)?.page.href ? id : canEdit ? OVERVIEW : SETTINGS;
  });
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [editorMounted, setEditorMounted] = useState(/* ทำงานต่อภายใน useState ของหลังบ้าน */ () => active === MEDIA || !!findPage(active)?.page.route);
  const [openSection, setOpenSection] = useState<string | null>(null);
  // หน้าที่ฟอร์มด้านขวาเปิดอยู่ (คลังไฟล์สื่อเปิดทับหน้านี้)
  const [route, setRoute] = useState(active === MEDIA ? MEDIA_ROUTE : findPage(active)?.page.route || FIRST_ROUTE);
  const editor = useRef<EditorFrameHandle>(null);

  const current = findPage(active);
  const showEditor = active === MEDIA || !!current?.page.route;
  useEffect(/* เริ่มงานตามสถานะ React และคืนฟังก์ชันล้างงานเมื่อจำเป็นในหลังบ้าน */ () => {
    if (active === MEDIA && editorMounted) editor.current?.openMediaLibrary();
  }, [active, editorMounted]);
  const signOut = /* ออกจากระบบพร้อมจัดการสถานะระหว่างดำเนินการ */ async () => {
    setSigningOut(true); setAccountError("");
    try { await logout(); }
    catch (err) { setAccountError(err instanceof Error ? err.message : "ออกจากระบบไม่สำเร็จ"); setSigningOut(false); }
  };

  const open = /* เปิดรายการหรือหน้าต่างที่ผู้ใช้เลือก */ (id: string) => {
    const target = findPage(id);
    if (!target || !allowed(id)) return;
    if (target.page.href) { location.assign(target.page.href); return; }
    setActive(id);
    history.replaceState(null, "", `#${id}`);
    if (target.parent) setOpenSection(target.parent.id);
    if (target.page.route) { setEditorMounted(true); setRoute(target.page.route); }
    if (id === MEDIA) {
      setEditorMounted(true);
      setRoute(MEDIA_ROUTE);
    }
  };

  return (
    <AnimatedSidebarProvider className="h-svh min-h-0 overflow-hidden bg-background" style={{ "--sidebar-width": "16rem" }}>
      <AnimatedSidebar ariaLabel="เมนูระบบจัดการเนื้อหา" collapsible="icon" className="min-h-0" panelClassName="border-border bg-canvas">
        <AnimatedSidebarHeader className="p-3 pb-2">
          <div className="flex min-h-11 items-center gap-3 overflow-hidden px-1.5">
            <img src={siteUrl("assets/images/logo.png")} alt="" width={32} height={32} className="size-8 shrink-0 object-contain" />
            <div className="min-w-0 flex-1 leading-tight group-data-[state=collapsed]/sidebar:hidden">
              <p className="truncate text-base font-semibold text-foreground">ปทุมวันเกมส์ 50</p>
              <p className="truncate text-xs text-muted-foreground">ระบบจัดการเนื้อหา</p>
            </div>
            <AnimatedSidebarClose aria-label="ปิดเมนู" className="ml-auto text-muted-foreground hover:bg-muted md:hidden">
              <X aria-hidden="true" className="size-4" />
            </AnimatedSidebarClose>
          </div>
        </AnimatedSidebarHeader>

        <AnimatedSidebarContent className="px-2 pt-1">
          {NAV.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (group) => ({ ...group, items: group.items
            .map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (item) => (item.children ? { ...item, children: item.children.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหลังบ้าน */ (c) => allowed(c.id)) } : item))
            .filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหลังบ้าน */ (item) => (item.children ? item.children.length > 0 : allowed(item.id))) }))
            .filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหลังบ้าน */ (group) => group.items.length > 0).map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (group, g) => (
            <AnimatedSidebarGroup key={group.label ?? g} className={group.label ? "pt-1" : "pb-2"}>
              {group.label ? (
                <AnimatedSidebarGroupLabel className="text-xs normal-case tracking-normal">{group.label}</AnimatedSidebarGroupLabel>
              ) : null}
              <AnimatedSidebarGroupContent>
                <AnimatedSidebarMenu>
                  {group.items.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ ({ id, label, icon: Icon, children }) => (
                    <AnimatedSidebarMenuItem key={id}>
                      <AnimatedSidebarMenuButton
                        isActive={active === id || children?.some(/* ตรวจว่ามีรายการที่ตรงเงื่อนไขหรือไม่ในหลังบ้าน */ (c) => c.id === active) === true}
                        ariaExpanded={children ? openSection === id : undefined}
                        icon={<Icon className="size-4" />}
                        onSelect={/* จัดการ onSelect ขององค์ประกอบบนหน้าจอ */ () => {
                          if (children) setOpenSection(/* ทำงานต่อภายใน setOpenSection ของหลังบ้าน */ (s) => (s === id ? null : id));
                          else open(id);
                        }}
                      >
                        {label}
                      </AnimatedSidebarMenuButton>
                      {children ? (
                        <AnimatedSidebarMenuSub open={openSection === id}>
                          {children.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (child) => (
                            <AnimatedSidebarMenuSubItem key={child.id}>
                              <AnimatedSidebarMenuSubButton
                                className="text-sm"
                                isActive={active === child.id}
                                onSelect={/* จัดการ onSelect ขององค์ประกอบบนหน้าจอ */ () => open(child.id)}
                              >
                                {child.label}
                              </AnimatedSidebarMenuSubButton>
                            </AnimatedSidebarMenuSubItem>
                          ))}
                        </AnimatedSidebarMenuSub>
                      ) : null}
                    </AnimatedSidebarMenuItem>
                  ))}
                </AnimatedSidebarMenu>
              </AnimatedSidebarGroupContent>
            </AnimatedSidebarGroup>
          ))}

          <AnimatedSidebarGroup className="pt-1">
            <AnimatedSidebarGroupLabel className="text-xs normal-case tracking-normal">ทางลัด</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu>
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton href={SITE_ROOT} target="_blank" icon={<ExternalLink className="size-4" />}>
                    ดูหน้าเว็บไซต์
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        </AnimatedSidebarContent>

        <AnimatedSidebarFooter className="border-t border-border p-3">
          <div className="flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-xl p-1 group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:gap-0">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm uppercase text-primary group-data-[state=collapsed]/sidebar:hidden"
            >
              {(username ?? "ท").slice(0, 2)}
            </span>
            <span className="min-w-0 flex-1 group-data-[state=collapsed]/sidebar:hidden">
              <span className="block truncate text-sm text-foreground">{session.displayName}</span>
              <span className="block truncate text-xs text-muted-foreground">{roleLabel(session.role)}</span>
            </span>
            <button
              type="button"
              disabled={signingOut}
              onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => void signOut()}
              aria-label={signingOut ? "กำลังออกจากระบบ" : "ออกจากระบบ"}
              title={signingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
              className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <LogOut aria-hidden="true" className="size-5" />
            </button>
          </div>
        </AnimatedSidebarFooter>

        <AnimatedSidebarRail aria-label="ย่อ/ขยายเมนู" />
      </AnimatedSidebar>

      <AnimatedSidebarInset className="min-h-0 bg-background">
        <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-3 border-b border-border px-3 py-3 sm:px-6 xl:flex-nowrap">
          <AnimatedSidebarTrigger aria-label="ย่อ/ขยายเมนู" className="text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <PanelLeft aria-hidden="true" className="size-4" />
          </AnimatedSidebarTrigger>
          <div className="h-5 w-px bg-border" />
          <p className="min-w-0 flex-1 truncate text-sm font-medium">
            {current?.parent ? <span className="text-muted-foreground">{current.parent.label} / </span> : null}
            <span className="text-foreground">{current?.page.title}</span>
          </p>
          <div className="order-last w-full xl:order-none xl:w-64"><MenuSearch onOpen={open} canManage={canManage} pages={PAGES.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหลังบ้าน */ ({ page }) => allowed(page.id))} /></div>
          <button type="button" className="admin-button shrink-0 px-3 text-sm" onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => open(SETTINGS)} aria-label="ตั้งค่า Settings" title="ตั้งค่า Settings"><SettingsIcon aria-hidden="true" className="size-5" /><span className="hidden sm:inline">ตั้งค่า</span></button>
          <FlowLink href={SITE_ROOT} target="_blank" size="sm" icon={ExternalLink} className="hidden lg:inline-flex">
            ดูหน้าเว็บไซต์
          </FlowLink>
        </header>
        {accountError ? <p role="alert" className="bg-accent-soft px-5 py-3 text-accent">{accountError}</p> : null}

        {active === OVERVIEW && canEdit ? <Dashboard username={session.displayName} onOpen={open} /> : null}
        {active === MEMBERS && canManage ? <Members session={session} /> : null}
        {active === ROLES ? <Roles canManage={canManage} onMembers={/* จัดการ onMembers ขององค์ประกอบบนหน้าจอ */ () => open(MEMBERS)} /> : null}
        {active === SETTINGS ? <Settings session={session} /> : null}
        {editorMounted ? <EditorFrame
          ref={editor}
          route={route}
          hidden={!showEditor}
          onRouteChange={/* จัดการ onRouteChange ขององค์ประกอบบนหน้าจอ */ (next) => {
            setRoute(next);
            const page = pageForRoute(next);
            if (page && showEditor) {
              setActive(page.page.id);
              if (page.parent) setOpenSection(page.parent.id);
            }
          }}
        /> : null}
      </AnimatedSidebarInset>
    </AnimatedSidebarProvider>
  );
}
