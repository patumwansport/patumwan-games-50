import { Check, Minus } from "@/components/ui/icons";
import { ROLES } from "@/admin/session";
import { FlowButton } from "@/components/ui/flow-button";

// ลำดับคอลัมน์ตาม ROLES: IT Admin, CMS Editor, ฝ่ายเทคนิคกีฬา, ผู้ตรวจผลกีฬา
const permissions = [
  ["ดูและแก้ไขข่าวสาร / ข้อมูลเว็บไซต์", true, true, false, false],
  ["อัปโหลดรูปและเอกสาร / เผยแพร่เนื้อหา", true, true, false, false],
  ["กรอกผลการแข่งขัน (เฉพาะกีฬาที่รับผิดชอบ)", true, false, true, false],
  ["ตรวจและอนุมัติผลการแข่งขัน (เฉพาะกีฬาที่รับผิดชอบ)", true, false, false, true],
  ["เพิ่มบัญชี เปลี่ยน Role และกีฬาที่รับผิดชอบ", true, false, false, false],
  ["เปิด / ปิดบัญชี และรีเซ็ตรหัสผ่าน", true, false, false, false],
  ["เปลี่ยนรหัสผ่านของตนเอง", true, true, true, true],
] as const;

// แสดงสิทธิ์ของแต่ละบทบาท
export function Roles({ canManage, onMembers }: { canManage: boolean; onMembers: () => void }) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-7"><div className="mx-auto max-w-5xl">
    <h1 className="text-2xl font-semibold">Role และสิทธิ์การใช้งาน</h1><p className="mt-2 mb-6 text-muted-foreground">กำหนดหน้าที่ให้ตรงกับงานของผู้ใช้ ระบบตรวจสิทธิ์อีกครั้งที่ฐานข้อมูลและเซิร์ฟเวอร์</p>
    <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[640px] text-left"><thead className="bg-canvas"><tr><th className="px-5 py-4">สิทธิ์</th>{ROLES.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (r) => <th key={r.id} className="px-4 py-4 text-sm">{r.label}</th>)}</tr></thead><tbody className="divide-y divide-border">{permissions.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ ([label, ...grants]) => <tr key={label}><td className="px-5 py-4">{label}</td>{grants.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (allowed, i) => <td key={i} className="px-4 py-4">{allowed ? <Check aria-label="มีสิทธิ์" className="size-5 text-primary" /> : <Minus aria-label="ไม่มีสิทธิ์" className="size-5 text-muted-foreground" />}</td>)}</tr>)}</tbody></table></div>
    <p className="mt-5 text-muted-foreground">ฝ่ายเทคนิคกีฬาและผู้ตรวจผลต้องระบุกีฬาที่รับผิดชอบ และมองเห็นเฉพาะรายการของกีฬานั้น ผู้ส่งผลอนุมัติผลของตนเองไม่ได้</p>
    {canManage ? <FlowButton onClick={onMembers} className="mt-5">ไปที่ Role manager</FlowButton> : null}
  </div></div>;
}
