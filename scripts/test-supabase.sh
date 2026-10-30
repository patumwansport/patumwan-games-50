#!/bin/sh
# ทดสอบ supabase/migrations กับ Postgres ชั่วคราวในเครื่อง (ไม่ต้องใช้ Docker หรือโปรเจกต์ Supabase จริง)
# ต้องมี initdb, pg_ctl, psql เช่น brew install postgresql@17
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
dir=$(mktemp -d)
port=${PGTEST_PORT:-55432}
initdb -D "$dir/data" -U postgres --auth=trust -E UTF8 --locale=C >/dev/null
pg_ctl -D "$dir/data" -o "-p $port -k $dir -c listen_addresses=''" -l "$dir/log" -w start >/dev/null
trap 'pg_ctl -D "$dir/data" -m fast -w stop >/dev/null; rm -rf "$dir"' EXIT
run() { psql -h "$dir" -p "$port" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X "$@"; }
run -f "$root/tests/supabase/stub.sql"
for f in "$root"/supabase/migrations/*.sql; do run -f "$f"; done
run -f "$root/tests/supabase/workflow.sql"
