// ฟอนต์ของเว็บหลักอยู่ที่ <site>/assets/fonts/ แต่เว็บอาจอยู่ใต้ path ย่อย (GitHub Pages /patumwan-games-50/)
// จึงแปลง url("/assets/fonts/...") ใน CSS ที่ build แล้วเป็น path สัมพัทธ์จากตำแหน่งไฟล์ CSS นั้น
import type { Plugin } from "vite";

export function relativeSiteFonts(fromCssToSite: string): Plugin {
  return {
    name: "relative-site-fonts",
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === "asset" && file.fileName.endsWith(".css") && typeof file.source === "string") {
          file.source = file.source.replaceAll("/assets/fonts/", `${fromCssToSite}assets/fonts/`);
        }
      }
    },
  };
}
