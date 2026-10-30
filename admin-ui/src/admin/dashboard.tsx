import { ArrowRight, ArrowUpRight, ChevronRight, CircleHelp, Globe, Newspaper, Trophy } from "@/components/ui/icons";
import { PAGES, RESULTS_PAGE } from "@/admin/nav";
import { FlowButton } from "@/components/ui/flow-button";
import { SITE_ROOT } from "@/admin/paths";

const today = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });

// หัวข้อเนื้อหาจัดกลุ่มตามเมนูด้านซ้าย (หัวข้อที่ไม่มีเมนูแม่อยู่กลุ่ม "เนื้อหาหลัก")
const GROUPS = PAGES.filter(/* เลือกเฉพาะหน้าที่เปิดฟอร์มแก้ไขได้ */ ({ page }) => page.route).reduce<{ label: string; pages: typeof PAGES }[]>(
  /* รวมหน้าที่อยู่ใต้เมนูเดียวกัน */ (groups, item) => {
    const label = item.parent?.label ?? "เนื้อหาหลัก";
    const group = groups.find(/* หากลุ่มเดิม */ (g) => g.label === label);
    if (group) group.pages.push(item);
    else groups.push({ label, pages: [item] });
    return groups;
  },
  [],
);

// แสดงภาพรวมและทางลัดจัดการเนื้อหา
export function Dashboard({ username, canScore, onOpen }: { username: string | null; canScore: boolean; onOpen: (id: string) => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">{today.format(new Date())}</p>
            <h1 className="text-2xl font-semibold tracking-tight">สวัสดี{username ? ` คุณ ${username}` : ""}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">เลือกหัวข้อที่ต้องการแก้ แล้วกดเผยแพร่ เว็บไซต์จะอัปเดตภายในประมาณ 1 นาที</p>
          </div>
          <FlowButton onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => onOpen("news")}>จัดการข่าวสาร</FlowButton>
        </section>

        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section aria-labelledby="content-title" className="min-w-0">
            <h2 id="content-title" className="mb-4 text-base font-semibold">เนื้อหาบนเว็บไซต์</h2>
            <div className="space-y-6">{GROUPS.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (group) => (
              <section key={group.label} aria-label={group.label}>
                <h3 className="mb-2 px-1 text-xs font-medium text-muted-foreground">{group.label}</h3>
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">{group.pages.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ ({ page, icon: Icon }) => (
                  <li key={page.id}>
                    <button
                      type="button"
                      onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => onOpen(page.id)}
                      className="group flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-canvas focus-visible:bg-canvas focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
                    >
                      <Icon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{page.label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{page.description}</span>
                      </span>
                      <span className="hidden shrink-0 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:inline">แก้ไข</span>
                      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </button>
                  </li>
                ))}</ul>
              </section>
            ))}</div>
          </section>

          <aside className="space-y-5 xl:pt-10">
            <section className="rounded-xl border border-border p-5" aria-labelledby="start-title">
              <span className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><CircleHelp aria-hidden="true" className="size-3.5" />คู่มือย่อ</span>
              <h2 id="start-title" className="text-base font-semibold">แก้ข้อมูลได้ใน 3 ขั้นตอน</h2>
              <ol className="mt-4 space-y-4">{[
                ["เลือกหัวข้อ", "จากรายการนี้ เมนูด้านซ้าย หรือช่องค้นหาด้านบน"],
                ["แก้ไขข้อมูล", "แก้ข้อความ เพิ่มรายการ หรืออัปโหลดรูปและเอกสาร"],
                ["กดเผยแพร่", "เว็บไซต์อัปเดตภายในประมาณ 1 นาที"],
              ].map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ ([title, text], i) => <li key={title} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-medium text-accent">{i + 1}</span><span><span className="block text-sm font-medium">{title}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{text}</span></span></li>)}</ol>
            </section>
            <section className="rounded-xl border border-border bg-canvas p-5" aria-labelledby="results-title">
              <Trophy aria-hidden="true" className="mb-3 size-5 text-gold" />
              <h2 id="results-title" className="text-base font-semibold">ผลการแข่งขันและเหรียญ</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">ฝ่ายเทคนิคกรอกผล ผู้ตรวจประจำกีฬาอนุมัติ แล้วผลจึงขึ้นเว็บไซต์ ใช้บัญชีเดียวกับระบบนี้</p>
              {canScore ? (
                <a href={RESULTS_PAGE} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                  เปิดระบบผลการแข่งขัน<ArrowRight aria-hidden="true" className="size-4" />
                </a>
              ) : null}
            </section>
            <a href={SITE_ROOT} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-muted-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
              <Globe aria-hidden="true" className="size-4" /><span className="flex-1">เปิดเว็บไซต์สาธารณะ</span><ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          </aside>
        </div>
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Newspaper aria-hidden="true" className="size-3.5" />ระบบจัดการเนื้อหา ปทุมวันเกมส์ 50</span>
          <span>Ctrl+B หรือ ⌘B เพื่อย่อและขยายเมนู</span>
        </footer>
      </div>
    </div>
  );
}
