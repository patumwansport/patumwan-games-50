import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { ArrowRight, ArrowUpRight, Calendar, History, Images, Newspaper, Trophy, UserCog, Users } from "@/components/ui/icons";
import { MEDIA, MEMBERS, PAGES, RESULTS_PAGE } from "@/admin/nav";
import { SITE_ROOT, siteUrl } from "@/admin/paths";
import { rpc } from "@/admin/supabase";
import { cn } from "@/lib/utils";

const TZ = "Asia/Bangkok";
const weekday = new Intl.DateTimeFormat("th-TH", { weekday: "long", timeZone: TZ });
const monthName = new Intl.DateTimeFormat("th-TH", { month: "long", timeZone: TZ });
const dayShort = new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
const shortDate = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit", timeZone: TZ });
const shortDateTime = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });

interface NewsItem { id: string; title: string; createdAt: string }
interface Match { id: number; code: string; sport: string; name: string; date: string; time: string; kind: string; status: string; published: boolean }
interface AuditRow { id: number; at: string; action: string; display_name: string | null; detail: { code?: string; username?: string } | null }
interface Member { active: boolean; must_change: boolean }

// ชื่อเหตุการณ์ในประวัติ (ตรงกับระบบผลการแข่งขัน admin-ui/src/results/portal.js)
const ACTIONS: Record<string, string> = {
  created: "สร้างรายการแข่งขัน", edited: "แก้ไขผล", submitted: "ส่งตรวจผล", returned: "ส่งกลับแก้ไข", approved: "อนุมัติและเผยแพร่ผล",
  withdrawn: "ถอนผลเผยแพร่", user_created: "สร้างบัญชี", user_updated: "เปลี่ยนสิทธิ์บัญชี", password_reset: "รีเซ็ตรหัสผ่าน",
  password_changed: "เปลี่ยนรหัสผ่าน", reference_synced: "อัปเดตชนิดกีฬา/สถาบัน",
};
const STATUS: Record<string, string> = { draft: "ร่าง", pending: "รอตรวจ", returned: "ส่งกลับแก้ไข", approved: "เผยแพร่แล้ว" };

/** วันที่ YYYY-MM-DD ตามเวลาไทย */
const isoDay = /* แปลงเวลาเป็นวันที่ตามเวลาไทย */ (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

/** วันจันทร์ถึงอาทิตย์ของสัปดาห์นี้ */
function thisWeek(): Date[] {
  const now = new Date(`${isoDay(new Date())}T12:00:00+07:00`);
  const monday = new Date(now.getTime() - ((now.getUTCDay() + 6) % 7) * 86400000);
  return Array.from({ length: 7 }, /* สร้างวันในสัปดาห์ */ (_, i) => new Date(monday.getTime() + i * 86400000));
}

// ข่าวในไฟล์ js/data/news.js ของเว็บ (ฉบับที่เผยแพร่อยู่)
async function loadNews(): Promise<NewsItem[]> {
  const text = await (await fetch(siteUrl("js/data/news.js"), { cache: "no-cache" })).text();
  const json = /window\.SiteData\.news = (\[[\s\S]*?\n\]);/.exec(text)?.[1];
  const items: NewsItem[] = json ? JSON.parse(json) : [];
  return items.sort(/* ข่าวใหม่ก่อน */ (a, b) => b.createdAt.localeCompare(a.createdAt));
}

interface Data { news?: NewsItem[]; matches?: Match[]; members?: Member[]; audit?: AuditRow[]; failed: boolean }

// โหลดข้อมูลหน้าภาพรวมตามสิทธิ์ของบัญชี ส่วนที่โหลดไม่ได้แสดงเป็นว่าง
function useDashboardData(canScore: boolean, canManage: boolean): Data | null {
  const [data, setData] = useState<Data | null>(null);
  useEffect(/* โหลดข้อมูลครั้งเดียวเมื่อเปิดหน้า */ () => {
    let alive = true;
    void Promise.allSettled([
      loadNews(),
      canScore ? rpc<Match[]>("list_matches") : Promise.resolve(undefined),
      canManage ? rpc<Member[]>("admin_list_users") : Promise.resolve(undefined),
      canManage ? rpc<AuditRow[]>("audit_recent") : Promise.resolve(undefined),
    ]).then(/* รวมผลที่โหลดได้ */ ([news, matches, members, audit]) => {
      if (!alive) return;
      const value = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : undefined);
      setData({
        news: value(news), matches: value(matches), members: value(members), audit: value(audit),
        failed: [news, matches, members, audit].some(/* มีส่วนที่โหลดไม่สำเร็จ */ (r) => r.status === "rejected"),
      });
    });
    return () => { alive = false; };
  }, [canScore, canManage]);
  return data;
}

// การ์ดตัวเลขสรุป
function Stat({ icon: Icon, label, value, note }: { icon: typeof Calendar; label: string; value: number | undefined; note: string }) {
  return (
    <div className="px-5 py-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Icon aria-hidden="true" className="size-4" />{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value ?? "–"}</p>
      <p className="mt-1 text-xs text-success">{note}</p>
    </div>
  );
}

// ปุ่มทางลัด
function Action({ icon: Icon, children, primary, ...props }: { icon: typeof Calendar; primary?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        primary ? "border-transparent bg-accent text-primary-foreground hover:bg-[#a92a5a]" : "border-border bg-background hover:bg-muted",
      )}
    >
      <Icon aria-hidden="true" className="size-4" />{children}
    </button>
  );
}

// แสดงภาพรวม: วันนี้ ทางลัด ตัวเลขสรุป ตารางแข่งขันสัปดาห์นี้ ข่าวล่าสุด และความเคลื่อนไหว
export function Dashboard({ username, canScore, canManage, onOpen }: { username: string | null; canScore: boolean; canManage: boolean; onOpen: (id: string) => void }) {
  const data = useDashboardData(canScore, canManage);
  const now = new Date();
  const today = isoDay(now);
  const week = thisWeek();
  const matches = data?.matches ?? [];
  const published = matches.filter(/* เฉพาะที่เผยแพร่แล้ว */ (m) => m.published).length;
  const pending = matches.filter(/* เฉพาะที่รอตรวจ */ (m) => m.status === "pending").length;
  const members = data?.members?.filter(/* เฉพาะบัญชีที่เปิดใช้ */ (m) => m.active);
  const latestNews = data?.news?.[0];
  const topics = PAGES.filter(/* หน้าที่เปิดฟอร์มแก้ไขได้ */ ({ page }) => page.route && page.id !== "news");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
        <header>
          <p className="text-sm text-muted-foreground">ยินดีต้อนรับกลับ{username ? ` คุณ ${username}` : ""}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">ภาพรวม</h1>
          <p className="mt-1 text-sm text-muted-foreground">ระบบจัดการเนื้อหาและผลการแข่งขัน ปทุมวันเกมส์ ครั้งที่ 50</p>
        </header>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex w-full shrink-0 items-center justify-center gap-3 rounded-xl bg-primary px-6 py-3 text-center text-primary-foreground sm:grid sm:w-40 sm:place-items-center sm:gap-0 sm:py-4" aria-label={`วันนี้ ${weekday.format(now)}ที่ ${now.toLocaleDateString("th-TH", { day: "numeric", month: "long", timeZone: TZ })}`}>
            <span aria-hidden="true" className="text-sm opacity-85">{weekday.format(now)}</span>
            <span aria-hidden="true" className="text-3xl font-semibold leading-none tabular-nums sm:text-5xl">{Number(today.slice(8))}</span>
            <span aria-hidden="true" className="text-sm opacity-85">{monthName.format(now)}</span>
          </div>
          <section aria-labelledby="actions-title" className="flex-1 rounded-xl border border-border px-5 py-4">
            <h2 id="actions-title" className="text-base font-semibold">ทางลัด</h2>
            <p className="text-xs text-muted-foreground">งานที่ทำบ่อย</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Action icon={Newspaper} onClick={/* เปิดฟอร์มข่าว */ () => onOpen("news")}>เพิ่ม/แก้ข่าว</Action>
              <Action icon={Images} onClick={/* เปิดคลังไฟล์สื่อ */ () => onOpen(MEDIA)}>คลังไฟล์สื่อ</Action>
              {canManage ? <Action icon={UserCog} onClick={/* เปิด Role manager */ () => onOpen(MEMBERS)}>Role manager</Action> : null}
              {canScore ? <Action icon={Trophy} primary onClick={/* ไปที่ระบบผลการแข่งขัน */ () => location.assign(RESULTS_PAGE)}>เปิดระบบผลการแข่งขัน</Action> : null}
            </div>
          </section>
        </div>

        <section aria-label="สรุป" className="grid divide-y divide-border rounded-xl border border-border sm:auto-cols-fr sm:grid-flow-col sm:divide-x sm:divide-y-0">
          <Stat icon={Newspaper} label="ข่าวสาร" value={data?.news?.length} note={latestNews ? `ล่าสุด ${shortDate.format(new Date(latestNews.createdAt))}` : "ยังไม่มีข่าว"} />
          {canScore ? <Stat icon={Calendar} label="รายการแข่งขัน" value={data?.matches?.length} note={`${published} เผยแพร่แล้ว · ${pending} รอตรวจ`} /> : null}
          {canManage ? <Stat icon={Users} label="บัญชีเจ้าหน้าที่" value={members?.length} note={`${members?.filter(/* ยังไม่ได้ตั้งรหัสผ่านใหม่ */ (m) => m.must_change).length ?? 0} รอเปลี่ยนรหัสผ่าน`} /> : null}
        </section>

        {canScore ? (
          <section aria-labelledby="week-title">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 id="week-title" className="text-lg font-semibold">สัปดาห์นี้</h2>
              <a href={`${RESULTS_PAGE}#/schedule`} className="inline-flex items-center gap-1 text-sm text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">ตารางทั้งหมด<ArrowRight aria-hidden="true" className="size-4" /></a>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <ol className="grid min-w-[56rem] grid-cols-7 divide-x divide-border">{week.map(/* แต่ละวันในสัปดาห์ */ (day) => {
                const key = isoDay(day);
                const items = matches.filter(/* รายการของวันนี้ */ (m) => m.date === key).sort(/* เรียงตามเวลา */ (a, b) => (a.time || "99").localeCompare(b.time || "99"));
                return (
                  <li key={key} className={cn("flex min-h-44 flex-col gap-2 p-2.5", key === today && "bg-accent-soft/60")}>
                    <span className={cn("px-0.5 text-xs", key === today ? "font-semibold text-accent" : "text-muted-foreground")}>{dayShort.format(day)}</span>
                    {items.slice(0, 3).map(/* รายการแข่งขัน */ (m) => (
                      <a key={m.id} href={`${RESULTS_PAGE}#/matches/${m.id}`} title={`${m.name} · ${STATUS[m.status] ?? m.status}`}
                        className={cn("block rounded-lg px-2.5 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                          m.published ? "bg-primary text-primary-foreground hover:bg-[#202f5b]" : "bg-muted text-foreground hover:bg-[#e3e8f6]")}>
                        <span className="flex items-baseline justify-between gap-2"><span className="truncate font-medium">{m.sport}</span><span className="shrink-0 tabular-nums opacity-80">{m.time}</span></span>
                        <span className="mt-0.5 block truncate opacity-85">{m.name}</span>
                        <span className="mt-1 block opacity-70">{STATUS[m.status] ?? m.status}</span>
                      </a>
                    ))}
                    {items.length > 3 ? <a href={RESULTS_PAGE} className="px-0.5 text-xs text-muted-foreground hover:text-primary">+{items.length - 3} รายการ</a> : null}
                    {!items.length ? <span className="mt-auto px-0.5 text-xs text-muted-foreground/70">ไม่มีรายการ</span> : null}
                  </li>
                );
              })}</ol>
            </div>
          </section>
        ) : null}

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section aria-labelledby="news-title" className="rounded-xl border border-border">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <h2 id="news-title" className="flex items-center gap-2 text-base font-semibold"><Newspaper aria-hidden="true" className="size-4 text-muted-foreground" />ข่าวล่าสุด</h2>
              <button type="button" onClick={/* เปิดฟอร์มข่าว */ () => onOpen("news")} className="text-sm text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">จัดการข่าว</button>
            </div>
            <ul className="divide-y divide-border">{(data?.news ?? []).slice(0, 5).map(/* ข่าวแต่ละรายการ */ (n) => (
              <li key={n.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{n.title}</span><span className="text-xs text-muted-foreground">{shortDate.format(new Date(n.createdAt))}</span></span>
                <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-0.5 text-xs text-success">เผยแพร่แล้ว</span>
              </li>
            ))}</ul>
            {data && !data.news?.length ? <p className="px-5 py-6 text-sm text-muted-foreground">ยังไม่มีข่าว</p> : null}
          </section>

          {canManage ? (
            <section aria-labelledby="audit-title" className="rounded-xl border border-border">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                <h2 id="audit-title" className="flex items-center gap-2 text-base font-semibold"><History aria-hidden="true" className="size-4 text-muted-foreground" />ความเคลื่อนไหวล่าสุด</h2>
                <a href={`${RESULTS_PAGE}#/audit`} className="text-sm text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">ประวัติทั้งหมด</a>
              </div>
              <ul className="divide-y divide-border">{(data?.audit ?? []).slice(0, 6).map(/* เหตุการณ์แต่ละรายการ */ (a) => (
                <li key={a.id} className="flex items-baseline gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0 flex-1"><span className="font-medium">{ACTIONS[a.action] ?? a.action}</span>{a.detail?.code ?? a.detail?.username ? <span className="text-muted-foreground"> · {a.detail?.code ?? a.detail?.username}</span> : null}
                    <span className="block text-xs text-muted-foreground">{a.display_name ?? "ระบบ"}</span></span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{shortDateTime.format(new Date(a.at))}</span>
                </li>
              ))}</ul>
              {data && !data.audit?.length ? <p className="px-5 py-6 text-sm text-muted-foreground">ยังไม่มีความเคลื่อนไหว</p> : null}
            </section>
          ) : (
            <section aria-labelledby="topics-title" className="rounded-xl border border-border">
              <h2 id="topics-title" className="border-b border-border px-5 py-3.5 text-base font-semibold">ข้อมูลเว็บไซต์</h2>
              <ul className="divide-y divide-border">{topics.map(/* หัวข้อเนื้อหา */ ({ page, icon: Icon }) => (
                <li key={page.id}><button type="button" onClick={/* เปิดฟอร์มหัวข้อนี้ */ () => onOpen(page.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm outline-none hover:bg-canvas focus-visible:bg-canvas focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  <Icon aria-hidden="true" className="size-4 text-muted-foreground" /><span className="flex-1">{page.label}</span><ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
                </button></li>
              ))}</ul>
            </section>
          )}
        </div>

        {data?.failed ? <p role="status" className="text-xs text-muted-foreground">โหลดข้อมูลบางส่วนไม่สำเร็จ ลองโหลดหน้าใหม่อีกครั้ง</p> : null}

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <a href={SITE_ROOT} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">เปิดเว็บไซต์สาธารณะ<ArrowUpRight aria-hidden="true" className="size-3.5" /></a>
          <span>Ctrl+B หรือ ⌘B เพื่อย่อและขยายเมนู</span>
        </footer>
      </div>
    </div>
  );
}
