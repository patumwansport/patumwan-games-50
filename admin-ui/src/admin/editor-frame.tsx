// ฟอร์มแก้ไขของ Decap CMS (admin/editor.html) ในกรอบด้านขวา
// เมนูด้านซ้ายสั่งเปลี่ยนหน้าผ่าน route (#/collections/...) ของ Decap โดยไม่โหลดหน้าใหม่
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { LoaderCircle } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { applyEditorSize } from "@/admin/preferences";
import { ADMIN_ROOT } from "@/admin/paths";

const EDITOR_PAGE = `${ADMIN_ROOT}editor.html`;

export interface EditorFrameHandle {
  /** เปิดคลังไฟล์สื่อของ Decap (ปุ่มเดิมอยู่บนแถบด้านบนที่ซ่อนไว้ มีเฉพาะหน้ารายการ ไม่มีในหน้าฟอร์ม) */
  openMediaLibrary: () => void;
}

interface Props {
  route: string;
  hidden: boolean;
  onRouteChange: (route: string) => void;
}

const routeOf = /* อ่านเส้นทางหน้าฟอร์มที่ต้องเปิด */ (win: Window) => decodeURI(win.location.hash.replace(/^#/, "")) || "/";

export const EditorFrame = forwardRef<EditorFrameHandle, Props>(/* แสดงฟอร์ม CMS ภายในกรอบของหลังบ้าน */ function EditorFrame({ route, hidden, onRouteChange }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [initialRoute] = useState(route);
  const [ready, setReady] = useState(false);
  const onRouteChangeRef = useRef(onRouteChange);
  onRouteChangeRef.current = onRouteChange;

  // รอจนในกรอบมีสิ่งที่ต้องการ (Decap วาดหน้าเสร็จ / ปุ่มคลังไฟล์สื่อโผล่) ไม่เกิน 15 วินาที
  const waitFor = /* รอให้เงื่อนไขของหน้าฟอร์มพร้อมก่อนทำงานต่อ */ <T,>(find: (doc: Document) => T | null | undefined) =>
    new Promise<T | null>(/* ประมวลผลขั้นตอนย่อยของหลังบ้านตามข้อมูลหรือสถานะที่รับมา */ (resolve) => {
      const until = Date.now() + 15000;
      const check = /* ตรวจเงื่อนไขก่อนดำเนินการต่อ */ () => {
        const doc = frame.current?.contentDocument;
        const found = doc && find(doc);
        if (found) resolve(found);
        else if (Date.now() > until) resolve(null);
        else setTimeout(check, 100);
      };
      check();
    });

  useImperativeHandle(ref, /* ทำงานต่อภายใน useImperativeHandle ของหลังบ้าน */ () => ({
    // เปิดคลังไฟล์สื่อของ CMS
    async openMediaLibrary() {
      const button = await waitFor(/* ทำงานต่อภายใน waitFor ของหลังบ้าน */ (doc) => doc.querySelector<HTMLButtonElement>("button[class*='AppHeaderButton']"));
      button?.click();
    },
  }));

  useEffect(/* เริ่มงานตามสถานะ React และคืนฟังก์ชันล้างงานเมื่อจำเป็นในหลังบ้าน */ () => {
    const win = frame.current?.contentWindow;
    if (ready && win && routeOf(win) !== route) win.location.hash = route;
  }, [ready, route]);

  return (
    <div className={cn("relative min-h-0 flex-1 bg-canvas", hidden && "hidden")}>
      {!ready ? (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
            กำลังโหลดฟอร์ม…
          </span>
        </div>
      ) : null}
      <iframe
        ref={frame}
        title="ฟอร์มแก้ไขเนื้อหา"
        src={`${EDITOR_PAGE}#${initialRoute}`}
        className={cn("size-full border-0 transition-opacity duration-300", ready ? "opacity-100" : "opacity-0")}
        onLoad={/* จัดการ onLoad ขององค์ประกอบบนหน้าจอ */ () => {
          const doc = frame.current?.contentDocument;
          if (doc) applyEditorSize(doc);
          const win = frame.current?.contentWindow;
          if (!win) return;
          win.addEventListener("hashchange", /* ตอบสนองเหตุการณ์ "hashchange" และอัปเดตข้อมูลหรือหน้าจอที่เกี่ยวข้อง */ () => onRouteChangeRef.current(routeOf(win)));
          waitFor(/* ทำงานต่อภายใน waitFor ของหลังบ้าน */ (doc) => doc.querySelector("#nc-root > *")).then(/* ประมวลผลต่อเมื่อคำขอก่อนหน้าสำเร็จในหลังบ้าน */ () => setReady(true));
        }}
      />
    </div>
  );
});
