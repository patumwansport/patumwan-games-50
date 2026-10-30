// ที่อยู่ของหน้าแอดมินและเว็บไซต์ คำนวณจาก URL ที่เปิดอยู่ จึงใช้ได้ทั้งที่ root ของโดเมน (Vercel)
// และใต้ path ย่อย เช่น GitHub Pages https://patumwansport.github.io/patumwan-games-50/admin/
const at = location.pathname.indexOf("/admin/");
/** เช่น "/admin/" หรือ "/patumwan-games-50/admin/" */
export const ADMIN_ROOT = at >= 0 ? location.pathname.slice(0, at + "/admin/".length) : "/admin/";
/** เช่น "/" หรือ "/patumwan-games-50/" */
export const SITE_ROOT = ADMIN_ROOT.slice(0, -"admin/".length);
/** ไฟล์ของเว็บหลัก เช่น siteUrl("assets/images/logo.png") */
export const siteUrl = (path: string) => SITE_ROOT + path;
