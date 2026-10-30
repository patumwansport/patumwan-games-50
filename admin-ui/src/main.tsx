if (import.meta.env.DEV) {
  import("react-grab");
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { FirstPassword } from "@/admin/first-password";
import { LOGIN_PAGE, accessToken, canEditContent, currentUser, logout } from "@/admin/session";
import { RESULTS_PAGE } from "@/admin/nav";
import "@/index.css";
import { applyTextSize, textSize } from "@/admin/preferences";

declare global {
  interface Window {
    /** ให้ฟอร์ม Decap ในกรอบ (admin/cms.js) ขอ token ล่าสุดไปเรียก Edge Function cms */
    adminAuth?: { username: string; token: () => Promise<string | null>; signOut: () => Promise<void> };
  }
}

applyTextSize(textSize());

// ต้องล็อกอินก่อนจึงแสดงหน้าแอดมิน (ข้อมูลทุกอย่างยังตรวจสิทธิ์ซ้ำที่ฐานข้อมูลและ Edge Function cms)
currentUser().then(/* ประมวลผลต่อเมื่อคำขอก่อนหน้าสำเร็จในหลังบ้าน */ (session) => {
  if (session === null) return location.replace(LOGIN_PAGE);
  // ฝ่ายเทคนิคและผู้ตรวจมีงานเฉพาะระบบผลการแข่งขัน เข้าสู่ระบบแล้วไปที่นั่นเลย (เปิด #settings ได้ตามเดิม)
  if (!session.mustChange && !canEditContent(session.role) && !location.hash) return location.replace(RESULTS_PAGE);
  if (canEditContent(session.role)) window.adminAuth = { username: session.username, token: accessToken, signOut: logout };
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {session.mustChange ? <FirstPassword session={session} /> : <App session={session} />}
    </StrictMode>,
  );
}).catch(/* จัดการข้อผิดพลาดจากงานแบบ asynchronousในหลังบ้าน */ (err) => {
  const root = document.getElementById("root")!;
  root.textContent = err instanceof Error && err.message.includes("supabase.json") ? err.message : "เชื่อมต่อระบบบัญชีไม่ได้ กรุณาโหลดหน้าใหม่เพื่อลองอีกครั้ง";
  root.setAttribute("role", "alert");
});
