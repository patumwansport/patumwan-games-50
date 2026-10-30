import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// รวมคลาส CSS และแก้คลาส Tailwind ที่ขัดกัน
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
