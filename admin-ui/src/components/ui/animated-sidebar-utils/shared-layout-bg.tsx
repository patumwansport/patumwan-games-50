// A list whose hover highlight glides between items instead of jumping
// (the beui.dev source imports this from its own utils, which were not part
// of the copied component). The highlight follows the item's own row, so an
// item with an open submenu below it still gets a row-sized pill.

import { motion, useReducedMotion } from "motion/react";
import {
  forwardRef,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import { SPRING_LAYOUT } from "@/components/ui/animated-sidebar-utils/ease";
import { cn } from "@/lib/utils";

type ListTag = "ul" | "ol" | "div" | "nav";

export interface SharedLayoutBgProps extends HTMLAttributes<HTMLElement> {
  as?: ListTag;
  /** Horizontal inset of the pill from the list edges, in px. */
  inset?: number;
  pillClassName?: string;
  pillContainerClassName?: string;
  children?: ReactNode;
}

interface PillBox {
  top: number;
  height: number;
}

export const SharedLayoutBg = forwardRef<HTMLElement, SharedLayoutBgProps>(
  /* สร้างพื้นหลังที่เคลื่อนตามตำแหน่งเมนูที่ใช้งาน*/ function SharedLayoutBg(
    {
      as = "div",
      inset = 0,
      pillClassName,
      pillContainerClassName,
      className,
      children,
      onPointerMove,
      onPointerLeave,
      ...props
    },
    forwardedRef,
  ) {
    const reduce = useReducedMotion() ?? false;
    const [box, setBox] = useState<PillBox | null>(null);
    // Fading out stays where the pill last was instead of sliding to 0.
    const lastBox = useRef<PillBox>({ top: 0, height: 0 });

    const track = /* ติดตามตำแหน่งตัวชี้สำหรับพื้นหลังขององค์ประกอบ*/ (event: PointerEvent<HTMLElement>) => {
      onPointerMove?.(event);
      if (event.pointerType === "touch") return;

      const root = event.currentTarget;
      const target = event.target as HTMLElement;
      // Submenus draw their own hover state.
      if (target.closest("[data-slot='sidebar-menu-sub']")) return setBox(null);

      let item: HTMLElement | null = target;
      while (item && item.parentElement !== root) item = item.parentElement;
      if (!item || item.dataset.pill !== undefined) return;

      const row =
        item.querySelector<HTMLElement>(":scope > a, :scope > button") ?? item;
      const next = {
        top: item.offsetTop + (row === item ? 0 : row.offsetTop),
        height: row.offsetHeight,
      };
      lastBox.current = next;
      setBox(/* ทำงานต่อภายใน setBox ของหลังบ้าน */ (current) =>
        current?.top === next.top && current.height === next.height
          ? current
          : next,
      );
    };

    const Tag = as;
    const Pill = as === "ul" || as === "ol" ? motion.li : motion.div;
    const shown = box ?? lastBox.current;

    return (
      <Tag
        {...props}
        ref={forwardedRef as never}
        className={cn("relative", className)}
        onPointerMove={track}
        onPointerLeave={/* จัดการ onPointerLeave ขององค์ประกอบบนหน้าจอ */ (event: PointerEvent<HTMLElement>) => {
          onPointerLeave?.(event);
          setBox(null);
        }}
      >
        <Pill
          aria-hidden="true"
          role="presentation"
          data-pill=""
          initial={false}
          animate={{ opacity: box ? 1 : 0, y: shown.top, height: shown.height }}
          transition={
            reduce
              ? { duration: 0 }
              : { ...SPRING_LAYOUT, opacity: { duration: 0.15 } }
          }
          style={{ left: inset, right: inset }}
          className={cn(
            "pointer-events-none absolute inset-y-0 list-none",
            pillContainerClassName,
          )}
        >
          <div className={cn("size-full", pillClassName)} />
        </Pill>
        {children}
      </Tag>
    );
  },
);
