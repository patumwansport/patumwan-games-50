const KEY = "pw50-admin:text-size";
export const TEXT_SIZES = [20, 22, 24];
// อ่านขนาดตัวอักษรที่ผู้ใช้เลือก
export function textSize() {
  try {
    const size = Number(localStorage.getItem(KEY));
    return TEXT_SIZES.includes(size) ? size : 20;
  } catch { return 20; }
}
// ปรับขนาดตัวอักษรของหลังบ้าน
export function applyTextSize(size: number) {
  if (!TEXT_SIZES.includes(size)) return;
  document.documentElement.style.fontSize = `${size}px`;
  document.querySelectorAll("iframe").forEach(/* ดำเนินการกับข้อมูลแต่ละรายการในหลังบ้าน */ (frame) => {
    try { if (frame.contentDocument) applyEditorSize(frame.contentDocument, size); } catch { /* คนละโดเมนไม่แก้สไตล์ */ }
  });
}
// ปรับขนาดตัวอักษรในกรอบแก้เนื้อหา
export function applyEditorSize(doc: Document, size = textSize()) {
  doc.documentElement.style.setProperty("--admin-body-size", `${size}px`);
  doc.documentElement.style.setProperty("--admin-control-size", `${size * .95}px`);
  doc.documentElement.style.setProperty("--admin-label-size", `${size * .9}px`);
}
// จำขนาดตัวอักษรและนำไปใช้
export function saveTextSize(size: number) {
  localStorage.setItem(KEY, String(size));
  applyTextSize(size);
}
