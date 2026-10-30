import { Search, ArrowUpRight } from "@/components/ui/icons";
import { useEffect, useId, useRef, useState } from "react";
import { PAGES, OVERVIEW } from "@/admin/nav";

// สร้างช่องค้นหาและเลือกเมนูหลังบ้าน
export function MenuSearch({ onOpen, canManage, pages = PAGES }: { onOpen: (id: string) => void; canManage: boolean; pages?: typeof PAGES }) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const results = pages.filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหลังบ้าน */ ({ page, parent }) => page.id !== OVERVIEW && (!page.adminOnly || canManage) &&
    `${page.title} ${page.description} ${parent?.label ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 7);
  useEffect(/* เริ่มงานตามสถานะ React และคืนฟังก์ชันล้างงานเมื่อจำเป็นในหลังบ้าน */ () => {
    const outside = /* ปิดเมนูเมื่อคลิกนอกพื้นที่ขององค์ประกอบ*/ (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setVisible(false); };
    document.addEventListener("pointerdown", outside);
    return /* ยกเลิกการติดตามหรือคืนทรัพยากรเมื่อส่วนนี้หยุดทำงาน */ () => document.removeEventListener("pointerdown", outside);
  }, []);
  const choose = /* เปิดหน้าที่เลือกแล้วล้างช่องค้นหา*/ (page: string) => { onOpen(page); setVisible(false); setQuery(""); };
  return (
    <div ref={root} className="relative w-full max-w-72">
      <Search aria-hidden="true" className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
      <input aria-label="ค้นหาเมนูจัดการข้อมูล" role="combobox" aria-expanded={visible} aria-controls={id}
        aria-autocomplete="list" aria-activedescendant={visible && results[selected] ? `${id}-${selected}` : undefined}
        value={query} onChange={/* จัดการ onChange ขององค์ประกอบบนหน้าจอ */ (event) => { setQuery(event.target.value); setSelected(0); setVisible(true); }}
        onFocus={/* จัดการ onFocus ขององค์ประกอบบนหน้าจอ */ () => setVisible(true)}
        onKeyDown={/* จัดการ onKeyDown ขององค์ประกอบบนหน้าจอ */ (event) => {
          if (event.key === "Escape" || event.key === "Tab") setVisible(false);
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); setVisible(true);
            setSelected(/* ทำงานต่อภายใน setSelected ของหลังบ้าน */ (n) => Math.max(0, Math.min(results.length - 1, n + (event.key === "ArrowDown" ? 1 : -1))));
          }
          if (event.key === "Enter" && visible && results[selected]) { event.preventDefault(); choose(results[selected].page.id); }
        }} placeholder="ค้นหาเมนู…"
        className="h-9 w-full rounded-lg border border-border bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-ring/15" />
      {visible ? <div id={id} role="listbox" aria-label="เมนูที่ค้นพบ" className="absolute top-11 right-0 z-30 max-h-96 w-[min(340px,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-border bg-background p-1.5 shadow-lg">
        <p className="px-2 py-1.5 text-xs text-muted-foreground">ไปยังเมนูจัดการข้อมูล</p>
        {results.length ? results.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ ({ page, parent, icon: Icon }, i) => (
          <button key={page.id} type="button" role="option" id={`${id}-${i}`} aria-selected={selected === i}
            onClick={/* จัดการ onClick ขององค์ประกอบบนหน้าจอ */ () => choose(page.id)} onMouseEnter={/* จัดการ onMouseEnter ขององค์ประกอบบนหน้าจอ */ () => setSelected(i)}
            className={`flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected === i ? "bg-muted" : "hover:bg-muted"}`}>
            <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1"><span className="block">{page.label}</span>{parent ? <span className="block text-xs text-muted-foreground">{parent.label}</span> : null}</span>
            <ArrowUpRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
          </button>
        )) : <p className="px-2 py-4 text-sm text-muted-foreground">ไม่พบเมนู ลองค้นหา “ข่าว” หรือ “กีฬา”</p>}
      </div> : null}
    </div>
  );
}
