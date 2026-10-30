// เมนูหน้าแอดมิน: แต่ละหน้าเปิดฟอร์มของไฟล์ใน admin/config.yml (route ของ Decap CMS)
import {
  Images,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  Music,
  Newspaper,
  ShieldCheck,
  Trophy,
  Users,
  Settings,
  UserCog,
} from "@/components/ui/icons";

export interface Page {
  id: string;
  /** ชื่อสั้นในเมนู */
  label: string;
  /** ชื่อเต็มบนแถบด้านบน */
  title: string;
  /** คำอธิบายบนการ์ดหน้าภาพรวม */
  description: string;
  /** route ของ Decap (ว่าง = หน้าภาพรวม / คลังไฟล์สื่อ) */
  route?: string;
  /** หน้าแยกนอกแอปนี้ (เช่น ระบบผลการแข่งขัน) เปิดด้วยการเปลี่ยนหน้า */
  href?: string;
  adminOnly?: boolean;
}

export interface NavItem extends Page {
  icon: LucideIcon;
  children?: Page[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

const entry = /* สร้างเส้นทางเปิดฟอร์มเนื้อหาของ Decap CMS*/ (collection: string, file: string) => `/collections/${collection}/entries/${file}`;

export const OVERVIEW = "overview";
export const MEDIA = "media";
export const MEMBERS = "members";
export const ROLES = "roles";
export const SETTINGS = "settings";
export const RESULTS = "results";
export const RESULTS_PAGE = "/admin/results/";
/** หน้ารายการที่มีปุ่มคลังไฟล์สื่อของ Decap (หน้าฟอร์มไม่มีปุ่มนี้) */
export const MEDIA_ROUTE = "/collections/news";

export const NAV: NavGroup[] = [
  {
    items: [
      { id: OVERVIEW, label: "ภาพรวม", title: "ภาพรวม", description: "", icon: LayoutDashboard },
      {
        id: "news",
        label: "ข่าวสาร",
        title: "ข่าวสารและกิจกรรม",
        description: "เพิ่ม แก้ไข หรือลบข่าว พร้อมรูปปกและวิดีโอ",
        route: entry("news", "news"),
        icon: Newspaper,
      },
      {
        id: MEDIA,
        label: "คลังไฟล์สื่อ",
        title: "คลังไฟล์สื่อ",
        description: "ดู อัปโหลด หรือลบรูปข่าว (รูปส่วนอื่นจัดการที่ช่องรูปในแต่ละฟอร์ม)",
        icon: Images,
      },
    ],
  },
  {
    label: "ข้อมูลเว็บไซต์",
    items: [
      {
        id: "about",
        label: "เกี่ยวกับการแข่งขัน",
        title: "เกี่ยวกับการแข่งขัน",
        description: "",
        icon: Landmark,
        children: [
          { id: "history", label: "ประวัติการแข่งขัน", title: "ประวัติการแข่งขัน", description: "ประวัติและเจ้าภาพแต่ละครั้ง", route: entry("data", "history") },
          { id: "institutions", label: "สถาบันที่เข้าร่วม", title: "สถาบันที่เข้าร่วมการแข่งขัน", description: "รายชื่อโรงเรียนและระดับที่ส่งแข่ง", route: entry("data", "institutions") },
          { id: "organizers", label: "ผู้ประสานงาน", title: "ผู้ประสานงานการจัดการแข่งขัน", description: "ฝ่ายต่าง ๆ เบอร์โทร และ QR Code", route: entry("data", "organizers") },
          { id: "venues", label: "แผนที่สนามแข่งขัน", title: "แผนที่สนามแข่งขัน", description: "แผนที่และรูปสนามแต่ละแห่ง", route: entry("data", "venues") },
        ],
      },
      {
        id: "competition",
        label: "กีฬาและเอกสาร",
        title: "กีฬาและเอกสาร",
        description: "",
        icon: Trophy,
        children: [
          { id: "sports", label: "ชนิดกีฬา", title: "ชนิดกีฬาที่แข่งขัน", description: "รายการกีฬาและไอคอน", route: entry("data", "sports") },
          { id: "regulations", label: "ระเบียบและข้อบังคับ", title: "ระเบียบและข้อบังคับการแข่งขัน", description: "เอกสาร PDF หรือลิงก์ของแต่ละกีฬา", route: entry("data", "regulations") },
          { id: "athletes", label: "สูจิบัตร", title: "สูจิบัตรการแข่งขัน", description: "เอกสารสูจิบัตรของแต่ละกีฬา", route: entry("data", "athletes") },
        ],
      },
      {
        id: "content",
        label: "เพลง มาสคอต แกลเลอรี",
        title: "เพลง มาสคอต แกลเลอรี ของที่ระลึก และผู้สนับสนุน",
        description: "เพลงประจำงาน มาสคอต แกลเลอรี ของที่ระลึก และผู้สนับสนุน",
        route: entry("data", "content"),
        icon: Music,
      },
      {
        id: "legal",
        label: "นโยบายและเงื่อนไข",
        title: "นโยบายความเป็นส่วนตัวและเงื่อนไขการใช้งาน",
        description: "ข้อความนโยบายความเป็นส่วนตัวและเงื่อนไขการใช้งาน",
        route: entry("data", "legal"),
        icon: ShieldCheck,
      },
    ],
  },
  {
    label: "จัดการระบบ",
    items: [
      { id: RESULTS, label: "ผลการแข่งขัน", title: "ระบบผลการแข่งขัน", description: "ตารางแข่งขัน กรอกผล ส่งตรวจ และอนุมัติผล", href: RESULTS_PAGE, icon: Trophy },
      { id: MEMBERS, label: "Role manager", title: "Role manager", description: "สร้างบัญชี กำหนด Role และกีฬาที่รับผิดชอบ เปิดหรือปิดใช้งาน", icon: Users, adminOnly: true },
      { id: ROLES, label: "Role และสิทธิ์", title: "Role และสิทธิ์การใช้งาน", description: "ตรวจสอบสิทธิ์ของแต่ละ Role", icon: UserCog },
      { id: SETTINGS, label: "ตั้งค่า (Settings)", title: "ตั้งค่าบัญชีและการแสดงผล", description: "ขนาดตัวอักษร รหัสผ่าน และข้อมูลบัญชี", icon: Settings },
    ],
  },
];

/** ทุกหน้าที่เปิดได้ (รวมเมนูย่อย) พร้อมเมนูหลักที่อยู่ */
export const PAGES: { page: Page; parent?: NavItem; icon: LucideIcon }[] = NAV.flatMap(/* ทำงานต่อภายใน NAV.flatMap ของหลังบ้าน */ (group) =>
  group.items.flatMap(/* ทำงานต่อภายใน group.items.flatMap ของหลังบ้าน */ (item) =>
    item.children ? item.children.map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ (page) => ({ page, parent: item, icon: item.icon })) : [{ page: item as Page, icon: item.icon }]
  )
);

export const findPage = /* ค้นหาหน้าหลังบ้านจากรหัสเมนู */ (id: string) => PAGES.find(/* ค้นหารายการแรกที่ตรงตามเงื่อนไขในหลังบ้าน */ (p) => p.page.id === id);

/** หน้าที่ role นี้เปิดได้: เมนูเนื้อหาเว็บไซต์เฉพาะ IT Admin / CMS Editor, Role manager เฉพาะ IT Admin,
 *  ระบบผลการแข่งขันเฉพาะ IT Admin / ฝ่ายเทคนิค / ผู้ตรวจ */
export const pageAllowed = /* ตรวจสิทธิ์เปิดหน้าที่เลือก */ (page: Page, canManage: boolean, canEdit: boolean, canScore: boolean) =>
  page.adminOnly ? canManage : page.href ? canScore : page.id === OVERVIEW || page.id === MEDIA || !!page.route ? canEdit : true;

/** หาหน้าจาก route ของ Decap (เช่น ผู้ใช้กดลิงก์ภายในฟอร์ม) */
export const pageForRoute = /* จับคู่เส้นทางของ CMS กับเมนูหลังบ้าน */ (route: string) => PAGES.find(/* ค้นหารายการแรกที่ตรงตามเงื่อนไขในหลังบ้าน */ (p) => p.page.route && route.startsWith(p.page.route));
