// สร้างระบบผลการแข่งขันลง ../admin/results (index.html + ui/) ให้ Vercel เสิร์ฟพร้อมหน้าแอดมิน
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL("./results-entry", import.meta.url)),
  base: "/admin/results/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    outDir: fileURLToPath(new URL("../admin/results", import.meta.url)),
    emptyOutDir: true,
    assetsDir: "ui",
  },
});
