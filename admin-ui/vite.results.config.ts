// สร้างระบบผลการแข่งขันลง ../admin/results (index.html + ui/) ให้ Vercel เสิร์ฟพร้อมหน้าแอดมิน
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { relativeSiteFonts } from "./font-paths";

export default defineConfig({
  root: fileURLToPath(new URL("./results-entry", import.meta.url)),
  base: "./",
  // CSS อยู่ที่ admin/results/ui/ จึงย้อนขึ้น 3 ชั้นถึง root ของเว็บ
  plugins: [react(), tailwindcss(), relativeSiteFonts("../../../")],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    outDir: fileURLToPath(new URL("../admin/results", import.meta.url)),
    emptyOutDir: true,
    assetsDir: "ui",
  },
});
