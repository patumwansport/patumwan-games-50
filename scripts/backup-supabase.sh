#!/bin/sh
# สำรองข้อมูลระบบผลการแข่งขันจาก Supabase (แพ็กเกจ Free ไม่มีสำรองรายวันให้) ไปที่โฟลเดอร์ backups/ ซึ่งไม่ขึ้น Git
# ต้องมี pg_dump 17 (brew install postgresql@17) และ connection string จาก Dashboard > Connect > Session pooler
#   SUPABASE_DB_URL='postgresql://postgres.unxramvsubyjteyrfzbk:<รหัสผ่านฐานข้อมูล>@aws-...pooler.supabase.com:5432/postgres' ./scripts/backup-supabase.sh
# ไฟล์ที่ได้มีข้อมูลบัญชี (อีเมล) และผลทั้งหมด เก็บในที่ปลอดภัย ห้ามแชร์หรือ commit
# กู้คืน: psql "$SUPABASE_DB_URL" -f backups/<ไฟล์>.sql กับโปรเจกต์ที่สร้างตารางด้วย migration และมีบัญชีใน Auth ชุดเดิมแล้ว
set -eu
: "${SUPABASE_DB_URL:?ตั้ง SUPABASE_DB_URL ก่อน (ดูวิธีด้านบน)}"
root=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$root/backups"
out="$root/backups/patumwangame-$(date +%Y%m%d-%H%M).sql"
PATH=/opt/homebrew/opt/postgresql@17/bin:$PATH pg_dump "$SUPABASE_DB_URL" --data-only --schema=public --no-owner --no-privileges -f "$out"
chmod 600 "$out"
echo "สำรองข้อมูลแล้ว: $out"
