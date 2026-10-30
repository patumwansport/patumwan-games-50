// สร้างหน้าแอดมินลงโฟลเดอร์ ../admin (index.html + app/) ให้ Vercel เสิร์ฟเป็นไฟล์ธรรมดา ไม่ต้อง build ตอน deploy
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { relativeSiteFonts } from "./font-paths";

export default defineConfig({
  // path สัมพัทธ์: ใช้ได้ทั้งที่ /admin/ (Vercel) และ /patumwan-games-50/admin/ (GitHub Pages)
  base: "./",
  // CSS อยู่ที่ admin/app/ จึงย้อนขึ้น 2 ชั้นถึง root ของเว็บ
  plugins: [react(), tailwindcss(), relativeSiteFonts("../../")],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    outDir: "../admin",
    // ในโฟลเดอร์ admin มีไฟล์อื่น (config.yml, editor.html, login.html) จึงลบเฉพาะ app/ ของรอบก่อน
    emptyOutDir: false,
    assetsDir: "app",
  },
});
