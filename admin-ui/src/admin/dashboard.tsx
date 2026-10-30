import { ArrowRight, ArrowUpRight, CircleHelp, Globe, Newspaper, ShieldCheck } from "@/components/ui/icons";
import { PAGES } from "@/admin/nav";
import { FlowButton } from "@/components/ui/flow-button";

const today = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });

// แสดงภาพรวมและทางลัดจัดการเนื้อหา
export function Dashboard({ username, onOpen }: { username: string | null; onOpen: (id: string) => void }) {
  const pages = PAGES.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหลังบ้าน */ ({ page }) => page.route);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
        <section className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">พื้นที่จัดการเว็บไซต์ · {today.format(new Date())}</p>
            <h1 className="text-2xl font-semibold tracking-tight">สวัสดี{username ? ` คุณ${username}` : ""}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">จัดการข่าวสาร ข้อมูลการแข่งขัน และเอกสารของปทุมวันเกมส์ ครั้งที่ 50</p>
          </div>
          <FlowButton onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => onOpen("news")}>จัดการข่าวสาร</FlowButton>
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section aria-labelledby="content-title" className="min-w-0 overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border px-5 py-4">
              <h2 id="content-title" className="text-base font-semibold">เนื้อหาบนเว็บไซต์</h2>
              <p className="mt-1 text-sm text-muted-foreground">เลือกหัวข้อเพื่อเปิดฟอร์มแก้ไขและเผยแพร่ข้อมูล</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-canvas text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-normal">หัวข้อ</th><th className="hidden px-4 py-3 font-normal md:table-cell">หมวดหมู่</th><th className="px-5 py-3 text-right font-normal">ดำเนินการ</th></tr></thead>
                <tbody className="divide-y divide-border">{pages.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ ({ page, parent, icon: Icon }) => (
                  <tr key={page.id} className="group transition-colors hover:bg-canvas">
                    <td className="px-5 py-3.5"><div className="flex items-start gap-3"><Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span><span className="block font-medium">{page.label}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{page.description}</span></span></div></td>
                    <td className="hidden whitespace-nowrap px-4 py-3.5 text-xs text-muted-foreground md:table-cell">{parent?.label ?? "เนื้อหาหลัก"}</td>
                    <td className="px-5 py-3.5 text-right"><FlowButton size="sm" icon={ArrowUpRight} onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => onOpen(page.id)} aria-label={`แก้ไข${page.label}`}>แก้ไข</FlowButton></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-xl border border-border p-5" aria-labelledby="start-title">
              <span className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><CircleHelp aria-hidden="true" className="size-3.5" />คู่มือย่อ</span>
              <h2 id="start-title" className="text-base font-semibold">แก้ข้อมูลได้ใน 3 ขั้นตอน</h2>
              <ol className="mt-4 space-y-4">{[
                ["เลือกหัวข้อ", "เปิดเมนูด้านซ้าย หรือค้นหาเมนูจากแถบด้านบน"],
                ["แก้ไขข้อมูล", "แก้ข้อความ เพิ่มรายการ หรืออัปโหลดรูปและเอกสาร"],
                ["กดเผยแพร่", "เว็บไซต์จะอัปเดตหลังระบบเผยแพร่ข้อมูลเสร็จ"],
              ].map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ ([title, text], i) => <li key={title} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-xs text-muted-foreground">{i + 1}</span><span><span className="block text-sm font-medium">{title}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{text}</span></span></li>)}</ol>
            </section>
            <section className="rounded-xl border border-border bg-canvas p-5" aria-labelledby="results-title">
              <ShieldCheck aria-hidden="true" className="mb-3 size-5 text-primary" />
              <h2 id="results-title" className="text-base font-semibold">ผลการแข่งขันและเหรียญ</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">ฝ่ายเทคนิคกรอกผลในระบบผลการแข่งขัน ผู้ตรวจประจำกีฬาอนุมัติก่อนนำขึ้นเว็บไซต์</p>
              <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">ใช้บัญชีและลิงก์ที่แอดมินกลางมอบหมาย ระบบเนื้อหาและระบบผลการแข่งขันยังใช้บัญชีแยกกัน</p>
            </section>
            <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-muted-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
              <Globe aria-hidden="true" className="size-4" /><span className="flex-1">เปิดเว็บไซต์สาธารณะ</span><ArrowRight aria-hidden="true" className="size-4" />
            </a>
          </aside>
        </div>
        <footer className="mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Newspaper aria-hidden="true" className="size-3.5" />ระบบจัดการเนื้อหา ปทุมวันเกมส์ 50</span>
          <span>Ctrl+B หรือ ⌘B เพื่อย่อและขยายเมนู</span>
        </footer>
      </div>
    </div>
  );
}
