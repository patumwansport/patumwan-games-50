# ระบบหลังบ้านบน Supabase

บัญชีผู้ใช้ของหน้า `/admin` (Role manager) และฐานข้อมูลระบบผลการแข่งขัน `/admin/results/` (ย้ายจาก SQLite ของ `results/`) อยู่บน Supabase Postgres + Supabase Auth
โปรเจกต์: **patumwangame** (`unxramvsubyjteyrfzbk`, ap-southeast-1) ใน organization **Satit Patumwan**
ขั้นตอนผลการแข่งขันเหมือนเดิม: ฉบับร่าง → ส่งตรวจ → อนุมัติ/ส่งกลับ → ถอนผล พร้อมประวัติทุกขั้น

| Role | ค่าในฐานข้อมูล | สิทธิ์ |
|---|---|---|
| IT Admin | `admin` | ทุกอย่าง รวมถึงจัดการบัญชี |
| CMS Editor | `editor` | แก้เนื้อหาเว็บไซต์ (`api/cms`) |
| ฝ่ายเทคนิคกีฬา | `technician` | กรอกผลเฉพาะกีฬาใน `user_sports` (ต้องมีอย่างน้อยหนึ่งชนิด) |
| ผู้ตรวจผลกีฬา | `reviewer` | ตรวจ/อนุมัติผลเฉพาะกีฬาใน `user_sports` (ต้องมีอย่างน้อยหนึ่งชนิด) |

ชื่อผู้ใช้ = ส่วนหน้า @ ของอีเมลโดเมน `satitpatumwan.ac.th` (เช่น `kittiya.kul`) อีเมลโดเมนอื่นใช้อีเมลเต็ม
โดเมนนี้กำหนดสองที่ให้ตรงกัน: `private.login_domain()` ใน migration และ `loginDomain` ใน `admin/supabase.json`

| ไฟล์ | หน้าที่ |
|---|---|
| `migrations/20261029000000_results_schema.sql` | ตาราง, RLS, ฟังก์ชันขั้นตอนอนุมัติ และสิทธิ์ |
| `migrations/20261029000100_reference_data.sql` | ชนิดกีฬาและรายชื่อสถาบันจาก `js/data` |
| `functions/accounts/` | Edge Function สร้างบัญชี แก้ Role/กีฬา/สถานะ รีเซ็ต/เปลี่ยนรหัสผ่าน (ใช้ service role) |
| `../admin/supabase.json` | `url`, `publishableKey`, `loginDomain` ที่หน้าแอดมิน ระบบผลการแข่งขัน และ `api/_auth.js` ใช้ |
| `../admin-ui/src/results/` | ระบบผลการแข่งขัน (`/admin/results/`) ตารางแข่งขัน กรอกผล ส่งตรวจ อนุมัติ ถอนผล build ด้วย `npm run build:results` |
| `../tests/supabase/` และ `../scripts/test-supabase.sh` | ทดสอบ migration กับ Postgres ในเครื่อง |

## หลักความปลอดภัย

- เปิด RLS ทุกตาราง ผู้ใช้ **เขียนตารางโดยตรงไม่ได้** ทุกการเปลี่ยนแปลงผ่านฟังก์ชันที่ตรวจสิทธิ์กีฬา สถานะ และ `version` (กันแก้ทับกัน) ในฐานข้อมูล
- ฝ่ายเทคนิค/ผู้ตรวจเห็นเฉพาะกีฬาที่ได้รับมอบหมาย ผู้ส่งผลอนุมัติผลของตนเองไม่ได้ รวมถึง IT Admin
- บัญชีใหม่และบัญชีที่ถูกรีเซ็ตได้รหัสผ่านชั่วคราวที่สุ่มแยกทุกบัญชี (แสดงให้ IT Admin ครั้งเดียว ไม่เก็บไว้ที่ใด) และใช้งานอะไรไม่ได้จนกว่าจะตั้งรหัสใหม่ (`must_change`) ปลดได้เฉพาะ Edge Function หลังเปลี่ยนรหัสจริง
- ปิดบัญชีหรือรีเซ็ตรหัสผ่านแล้วมีผลทันที เพราะทุกคำขอตรวจสถานะบัญชีล่าสุดในตาราง `profiles`
- `audit_log` แก้หรือลบผ่าน API ไม่ได้ อ่านผ่าน `match_history()` / `audit_recent()` เท่านั้น
- ผู้ชมเว็บ (anon) เรียกได้เฉพาะ `public_results()` ซึ่งส่งเฉพาะ snapshot ที่อนุมัติแล้ว
- บัญชีที่สร้างนอก Role manager (เช่นจาก Dashboard) เริ่มเป็นฝ่ายเทคนิคที่ไม่มีกีฬา จึงทำอะไรไม่ได้ จนกว่า IT Admin จะกำหนด Role

## ตั้งค่าครั้งแรก

1. **เข้าสู่ระบบบัญชีที่ถูกต้อง** (บัญชีที่เป็นเจ้าของ org Satit Patumwan) แล้วผูกโปรเจกต์

   ```sh
   supabase login
   supabase link --project-ref unxramvsubyjteyrfzbk
   ```

2. **สร้างตาราง** `supabase db push`
3. **ปิดการสมัครเอง**: Dashboard > Authentication > Sign In / Providers > ปิด *Allow new users to sign up*
   (ค่า `enable_signup = false` ใน `config.toml` ใช้กับเครื่องในเครื่องเท่านั้น)
4. **Deploy Edge Function** `supabase functions deploy accounts`
   secret ที่ตั้งได้ (ไม่บังคับ) ที่ Dashboard > Edge Functions > Secrets:

   | ชื่อ | ค่า |
   |---|---|
   | `ALLOWED_ORIGINS` | ไม่บังคับ: origin ของเว็บ คั่นด้วย `,` (ว่าง = ทุก origin เพราะใช้ Bearer token ไม่ใช้ cookie) |

5. **สร้าง IT Admin คนแรก**: Dashboard > Authentication > Users > *Add user* > ใส่อีเมลและรหัสผ่าน เลือก *Auto Confirm User*
   แล้วรันใน SQL Editor:

   ```sql
   update public.profiles set role = 'admin', must_change = false, display_name = 'Kittiya Kul'
   where email = 'kittiya.kul@satitpatumwan.ac.th';
   ```

   บัญชีต่อไปสร้างที่ `/admin` > **Role manager** > **Add**
6. **เชื่อมหน้าแอดมิน**: ใส่ค่าใน `admin/supabase.json` (Dashboard > Project Settings > API Keys ใช้ publishable key เท่านั้น)

   ```json
   { "url": "https://<project-ref>.supabase.co", "publishableKey": "sb_publishable_...", "loginDomain": "satitpatumwan.ac.th" }
   ```

   (ใส่ค่าของโปรเจกต์ patumwangame ไว้แล้ว)

7. **เชื่อมเว็บหลัก** หลังทำข้อ 2 แล้ว (ก่อนนั้นหน้าผลจะแสดงข้อผิดพลาด) ที่ `js/config.js`

   ```js
   resultsFeed: 'https://<project-ref>.supabase.co/rest/v1/rpc/public_results',
   resultsFeedKey: 'sb_publishable_...',
   ```

ห้ามนำ secret / service_role key ใส่ในเว็บหรือขึ้น Git

## API (เรียกด้วย `supabase.rpc(...)` หลังเข้าสู่ระบบ)

ข้อผิดพลาดใช้ SQLSTATE `PTxxx` = HTTP status (400/401/403/404/409) พร้อมข้อความภาษาไทย

| งาน | เรียก |
|---|---|
| เข้าสู่ระบบ | `supabase.auth.signInWithPassword({ email, password })` (หน้า login เติม `@satitpatumwan.ac.th` ให้เมื่อไม่มี `@`) |
| ข้อมูลบัญชีของฉัน | `me()` → `{ user, assignments, sports, schools }` |
| ข้อมูลรายการ (`p_body`) | `code`, `sportId`, `level` (`p`/`m`), `name`, `date`, `time`, `endTime`, `kind` (`competition`/`activity`), `category`, `note`, `stadium`, `round`, `group`, `results[]` (0–200 แถว กิจกรรมต้องว่าง ส่งตรวจได้เมื่อมีอย่างน้อย 1 แถวและกรอกผลครบ) |
| เปลี่ยนรหัสผ่านของตนเอง | Edge Function `accounts` `{ action: 'change_password', current, next }` |
| รายชื่อบัญชี (IT Admin) | `admin_list_users()` |
| สร้างบัญชี | `accounts` `{ action: 'create_user', email, display_name, role, sports }` |
| แก้ชื่อ/Role/กีฬา/สถานะ | `accounts` `{ action: 'update_user', user_id, display_name, role, sports, active }` |
| รีเซ็ตเป็นรหัสเริ่มต้น | `accounts` `{ action: 'reset_password', user_id }` |
| รายการแข่งขัน | `list_matches()` / `get_match(p_id)` |
| สร้าง / แก้ไขผล | `create_match(p_body)` / `update_match(p_id, p_body)` (`p_body.version` = version ล่าสุด) |
| ส่งตรวจ | `submit_match(p_id, p_version)` |
| ตรวจผล | `review_match(p_id, p_version, p_action: 'approve' \| 'return', p_note)` |
| ถอนผล | `withdraw_match(p_id, p_version, p_note)` |
| ประวัติ | `match_history(p_id)` / `audit_recent()` (IT Admin) |
| ผลที่เผยแพร่ (anon) | `public_results()` รูปแบบเดียวกับ `GET /api/public/results` เดิม |

## ดูแลระบบ

- **ชนิดกีฬา/สถาบัน**: บันทึกที่หน้าแอดมิน (ข้อมูลเว็บไซต์ > ชนิดกีฬา / สถาบันที่เข้าร่วม) แล้ว `api/cms` อัปเดตตาราง `sports` / `schools` ให้เอง (`sync_reference()`, upsert ไม่ลบแถวเดิม)
  ถ้าแก้ไฟล์ `js/data` เองโดยไม่ผ่านหน้าแอดมิน ให้รัน `node scripts/supabase-reference.js > /tmp/ref.sql` แล้วรันใน SQL Editor
- **ผู้ใช้ลืมรหัสผ่าน**: IT Admin กด **รีเซ็ตรหัสผ่าน** ที่ Role manager แล้วส่งรหัสชั่วคราวที่แสดงให้ผู้ใช้ ผู้ใช้เข้าด้วยรหัสนั้นแล้วตั้งใหม่
- **IT Admin คนเดียวลืมรหัสผ่าน**: Dashboard > Authentication > Users > เลือกบัญชี > ตั้งรหัสใหม่
- **แพ็กเกจ Free**: Supabase พักโปรเจกต์ที่ไม่มีการใช้งานราว 1 สัปดาห์ และไม่มีสำรองข้อมูลรายวัน
  - `api/keepalive` (Vercel Cron วันละครั้งใน `vercel.json`) อ่านผลที่เผยแพร่เพื่อให้มีการใช้งานต่อเนื่อง ลดโอกาสถูกพักแต่ไม่รับประกัน ตั้ง `CRON_SECRET` ใน Vercel ได้เพื่อรับเฉพาะคำขอจาก Cron
  - ถ้าถูกพัก: Dashboard > โปรเจกต์ > **Restore project** (เว็บและหน้าแอดมินใช้ไม่ได้ระหว่างนั้น) แนะนำอัปเกรด Pro ช่วงใกล้งานถึงจบงาน
  - **สำรองข้อมูล**: `SUPABASE_DB_URL='...' ./scripts/backup-supabase.sh` (วิธีหา connection string อยู่ในไฟล์) ได้ไฟล์ใน `backups/` ซึ่งไม่ขึ้น Git ควรทำทุกวันช่วงแข่งขัน
- **ทดสอบ** (ต้องมี `brew install postgresql@17`, ไม่แตะโปรเจกต์จริง): `PATH=/opt/homebrew/opt/postgresql@17/bin:$PATH ./scripts/test-supabase.sh`
