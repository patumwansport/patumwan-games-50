// Flow Button (21st.dev/@xubohuah/components/flow-button), recoloured for the
// Patumwan palette. On hover or keyboard focus a filled circle grows out of
// the centre, the corners tighten from pill to rounded, and the icon slides
// out of the right edge while a twin slides in on the left.
//
// Differences from the original: colours come from theme tokens instead of
// #111, the circle is sized from the button's width (long Thai labels are
// wider than the original 220px), keyboard focus plays the same motion, the
// travelling icon can be swapped (default: arrow), and it can render as a link.

import { ArrowRight, type LucideIcon } from "@/components/ui/icons";
import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  forwardRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type FlowSize = "default" | "sm";

interface FlowOptions {
  /** Icon that travels across the button. */
  icon?: LucideIcon;
  size?: FlowSize;
  children: ReactNode;
}

const ROOT = [
  "group relative isolate inline-flex shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap",
  "rounded-[100px] border-[1.5px] border-foreground/40 bg-transparent font-semibold text-foreground outline-none",
  "transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
  "hover:rounded-[12px] hover:border-transparent hover:text-primary-foreground",
  "focus-visible:rounded-[12px] focus-visible:border-transparent focus-visible:text-primary-foreground",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "active:scale-[0.95] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
].join(" ");

const SIZES: Record<FlowSize, { root: string; icon: string; inEdge: string; outEdge: string; shift: string }> = {
  default: {
    root: "min-h-11 px-8 py-2.5 text-sm",
    icon: "size-4",
    inEdge: "group-hover:left-4 group-focus-visible:left-4",
    outEdge: "right-4",
    shift: "-translate-x-3 group-hover:translate-x-3 group-focus-visible:translate-x-3",
  },
  sm: {
    root: "min-h-9 px-6 py-1.5 text-xs",
    icon: "size-3.5",
    inEdge: "group-hover:left-3 group-focus-visible:left-3",
    outEdge: "right-3",
    shift: "-translate-x-2.5 group-hover:translate-x-2.5 group-focus-visible:translate-x-2.5",
  },
};

const ICON_MOTION =
  "absolute z-[9] fill-none transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:text-primary-foreground group-focus-visible:text-primary-foreground";

// สร้างข้อความและไอคอนเคลื่อนไหวภายในปุ่ม
function FlowContent({ icon: Icon = ArrowRight, size = "default", children }: FlowOptions) {
  const s = SIZES[size];
  return (
    <>
      <Icon aria-hidden="true" className={cn(ICON_MOTION, s.icon, "left-[-25%]", s.inEdge)} />
      <span className={cn("relative z-[1] transition-all duration-[800ms] ease-out", s.shift)}>{children}</span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 left-1/2 -z-10 aspect-square w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0",
          "transition-all duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)]",
          "group-hover:w-[max(220px,calc(100%+3rem))] group-hover:opacity-100",
          "group-focus-visible:w-[max(220px,calc(100%+3rem))] group-focus-visible:opacity-100",
        )}
      />
      <Icon
        aria-hidden="true"
        className={cn(ICON_MOTION, s.icon, s.outEdge, "group-hover:right-[-25%] group-focus-visible:right-[-25%]")}
      />
    </>
  );
}

export interface FlowButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">, FlowOptions {}

export const FlowButton = forwardRef<HTMLButtonElement, FlowButtonProps>(/* สร้างปุ่มที่ใช้รูปแบบร่วมของหลังบ้าน */ function FlowButton(
  { icon, size = "default", className, children, type = "button", ...props },
  ref,
) {
  return (
    <button {...props} ref={ref} type={type} className={cn(ROOT, SIZES[size].root, className)}>
      <FlowContent icon={icon} size={size}>
        {children}
      </FlowContent>
    </button>
  );
});

export interface FlowLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children">, FlowOptions {}

export const FlowLink = forwardRef<HTMLAnchorElement, FlowLinkProps>(/* สร้างลิงก์ที่มีหน้าตาและการโต้ตอบเหมือนปุ่ม */ function FlowLink(
  { icon, size = "default", className, children, target, rel, ...props },
  ref,
) {
  return (
    <a
      {...props}
      ref={ref}
      target={target}
      rel={rel ?? (target === "_blank" ? "noreferrer noopener" : undefined)}
      className={cn(ROOT, SIZES[size].root, className)}
    >
      <FlowContent icon={icon} size={size}>
        {children}
      </FlowContent>
    </a>
  );
});

export default FlowButton;
