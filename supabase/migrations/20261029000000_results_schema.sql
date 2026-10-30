-- ระบบกรอกและอนุมัติผลการแข่งขัน ปทุมวันเกมส์ ครั้งที่ 50 (ย้ายจาก results/ ที่ใช้ SQLite)
-- ผู้ใช้ไม่เขียนตารางโดยตรง ทุกการเปลี่ยนแปลงผ่านฟังก์ชัน security definer ที่ตรวจสิทธิ์ สถานะ และ version

create schema if not exists private;
revoke all on schema private from public;

-- ---------- ตาราง ----------

-- ข้อมูลอ้างอิงจาก js/data/sports.js และ institutions.js (นำเข้าด้วย scripts/supabase-reference.js)
create table public.sports (
  id integer primary key,
  code text not null,
  name text not null
);

create table public.schools (
  no integer primary key,
  name_th text not null unique,
  name_en text not null default '',
  abbr text not null default '',
  thai_abbr text not null default '',
  levels text[] not null default '{}'
);

-- หนึ่งแถวต่อหนึ่งบัญชีใน auth.users สร้างอัตโนมัติด้วย trigger ด้านล่าง
-- role: admin = IT Admin (จัดการทั้งหมด), editor = CMS Editor (แก้เนื้อหาเว็บไซต์),
--       technician = ฝ่ายเทคนิคกีฬา (กรอกผล), reviewer = ผู้ตรวจผล (อนุมัติผล) สองแบบหลังต้องระบุกีฬาใน user_sports
-- username = ส่วนหน้า @ ของอีเมลโรงเรียน (private.login_domain()) อีเมลโดเมนอื่นใช้อีเมลเต็ม
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null unique check (username ~ '^[a-z0-9._@+-]{3,254}$'),
  display_name text not null check (char_length(display_name) between 1 and 150),
  role text not null default 'technician' check (role in ('admin', 'editor', 'technician', 'reviewer')),
  active boolean not null default true,
  must_change boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- กีฬาที่ฝ่ายเทคนิค/ผู้ตรวจรับผิดชอบ
create table public.user_sports (
  user_id uuid not null references public.profiles(id) on delete cascade,
  sport_id integer not null references public.sports(id),
  primary key (user_id, sport_id)
);
create index user_sports_sport_idx on public.user_sports (sport_id);

-- payload = ฉบับที่กำลังแก้ไข, published = snapshot ฉบับที่อนุมัติล่าสุด (null = ไม่แสดงบนเว็บ)
create table public.matches (
  id bigint generated always as identity primary key,
  code text not null,
  sport_id integer not null references public.sports(id),
  payload jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'pending', 'returned', 'approved')),
  version integer not null default 1,
  submitted_by uuid references public.profiles(id),
  published jsonb,
  review_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index matches_code_key on public.matches (lower(code));
create index matches_sport_idx on public.matches (sport_id);
create index matches_submitted_by_idx on public.matches (submitted_by);
create index matches_published_idx on public.matches (id) where published is not null;

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid references public.profiles(id) on delete set null,
  match_id bigint references public.matches(id),
  action text not null,
  detail jsonb not null default '{}'
);
create index audit_log_match_idx on public.audit_log (match_id);
create index audit_log_user_idx on public.audit_log (user_id);

-- ---------- ฟังก์ชันภายใน (schema private ไม่เปิดผ่าน API) ----------

-- PostgREST ใช้ SQLSTATE PTxxx เป็น HTTP status เช่น PT409 -> 409
create function private.fail(p_status integer, p_message text) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'PT' || p_status::text, message = p_message;
end $$;

create function private.text_field(p_value jsonb, p_title text, p_max integer, p_required boolean default false)
returns text language plpgsql set search_path = '' as $$
declare
  v_out text;
begin
  if p_value is null or jsonb_typeof(p_value) = 'null' then
    if not p_required then return ''; end if;
    perform private.fail(400, p_title || 'ไม่ถูกต้อง');
  end if;
  if jsonb_typeof(p_value) <> 'string' then perform private.fail(400, p_title || 'ไม่ถูกต้อง'); end if;
  v_out := regexp_replace(p_value #>> '{}', '^\s+|\s+$', '', 'g');
  if p_required and v_out = '' then perform private.fail(400, p_title || 'ต้องไม่ว่าง'); end if;
  if char_length(v_out) > p_max then perform private.fail(400, format('%sยาวเกิน %s ตัวอักษร', p_title, p_max)); end if;
  return v_out;
end $$;

-- คืนค่าจำนวนเต็มจาก JSON number เท่านั้น (ไม่รับ "1" หรือ 1.5)
create function private.json_int(p_value jsonb) returns integer
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(p_value) = 'number' and (p_value #>> '{}') ~ '^-?\d{1,9}$'
    then (p_value #>> '{}')::integer end
$$;

create function private.audit(p_user uuid, p_action text, p_match bigint, p_detail jsonb) returns void
language sql set search_path = '' as $$
  insert into public.audit_log (user_id, action, match_id, detail) values (p_user, p_action, p_match, coalesce(p_detail, '{}'));
$$;

-- บัญชีที่เรียกต้องเข้าสู่ระบบ เปิดใช้งาน และเปลี่ยนรหัสผ่านครั้งแรกแล้ว
create function private.require_staff(p_allow_must_change boolean default false) returns public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id = (select auth.uid());
  if v_profile.id is null or not v_profile.active then perform private.fail(401, 'กรุณาเข้าสู่ระบบ'); end if;
  if v_profile.must_change and not p_allow_must_change then perform private.fail(403, 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน'); end if;
  return v_profile;
end $$;

create function private.require_admin() returns public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare
  v_profile public.profiles := private.require_staff();
begin
  if v_profile.role <> 'admin' then perform private.fail(403, 'เฉพาะแอดมินกลาง'); end if;
  return v_profile;
end $$;

-- p_permission (technician/reviewer) = null หมายถึงได้รับมอบหมายกีฬานี้ในหน้าที่ใดก็ได้
create function private.can(p_profile public.profiles, p_sport integer, p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_profile.role = 'admin' or (
    p_profile.role in ('technician', 'reviewer') and (p_permission is null or p_profile.role = p_permission)
    and exists (select 1 from public.user_sports where user_id = p_profile.id and sport_id = p_sport)
  )
$$;

create function private.require_sport(p_profile public.profiles, p_sport integer, p_permission text) returns void
language plpgsql stable set search_path = '' as $$
begin
  if not private.can(p_profile, p_sport, p_permission) then perform private.fail(403, 'ไม่มีสิทธิ์ดำเนินการกับกีฬานี้'); end if;
end $$;

-- ล็อกแถวไว้จนจบ transaction เพื่อตรวจ version และสถานะโดยไม่ชนกับคำขออื่น
create function private.lock_match(p_profile public.profiles, p_id bigint) returns public.matches
language plpgsql security definer set search_path = '' as $$
declare
  v_match public.matches;
begin
  select * into v_match from public.matches where id = p_id for update;
  if v_match.id is null then perform private.fail(404, 'ไม่พบข้อมูล'); end if;
  if not private.can(p_profile, v_match.sport_id, null) then perform private.fail(403, 'ไม่มีสิทธิ์เข้าถึง'); end if;
  return v_match;
end $$;

create function private.check_version(p_match public.matches, p_version integer) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if p_version is distinct from p_match.version then
    perform private.fail(409, 'ข้อมูลถูกเปลี่ยนโดยผู้ใช้อื่น กรุณาโหลดรายการใหม่ก่อนทำต่อ');
  end if;
end $$;

-- ตรวจและจัดรูปข้อมูลรายการแข่งขัน (เทียบเท่า payload() ใน results/src/api.js)
-- kind: competition = การแข่งขัน (ลงตารางก่อนแล้วเพิ่มผู้เข้าแข่งขันภายหลังได้), activity = กิจกรรม เช่น รายงานตัว ไม่มีผล
create function private.match_payload(p_body jsonb, p_sport integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_sport public.sports;
  v_code text;
  v_level text;
  v_date text;
  v_day date;
  v_time text;
  v_end text;
  v_kind text;
  v_row jsonb;
  v_school text;
  v_medal text;
  v_results jsonb := '[]';
begin
  if p_body is null or jsonb_typeof(p_body) <> 'object' then perform private.fail(400, 'ข้อมูลไม่ถูกต้อง'); end if;
  select * into v_sport from public.sports where id = p_sport;
  if v_sport.id is null then perform private.fail(400, 'ชนิดกีฬาไม่ถูกต้อง'); end if;

  v_code := private.text_field(p_body -> 'code', 'รหัสการแข่งขัน', 50, true);
  if v_code !~ '^[A-Za-z0-9_-]+$' then perform private.fail(400, 'รหัสการแข่งขันใช้ตัวอักษรอังกฤษ ตัวเลข - และ _ เท่านั้น'); end if;
  v_level := private.text_field(p_body -> 'level', 'ระดับ', 10, true);
  if v_level not in ('p', 'm') then perform private.fail(400, 'กรุณาเลือกระดับประถมหรือมัธยม'); end if;

  v_date := private.text_field(p_body -> 'date', 'วันที่', 10, true);
  if v_date ~ '^\d{4}-\d{2}-\d{2}$' then
    begin
      v_day := v_date::date;
    exception when others then
      v_day := null;
    end;
  end if;
  if v_day is null or to_char(v_day, 'YYYY-MM-DD') <> v_date or extract(year from v_day) not between 2000 and 2200 then
    perform private.fail(400, 'วันที่แข่งขันไม่ถูกต้อง (ใช้ปี ค.ศ.)');
  end if;
  v_time := private.text_field(p_body -> 'time', 'เวลา', 5);
  if v_time <> '' and v_time !~ '^([01]\d|2[0-3]):[0-5]\d$' then perform private.fail(400, 'เวลาไม่ถูกต้อง'); end if;
  v_kind := coalesce(nullif(private.text_field(p_body -> 'kind', 'ลักษณะรายการ', 20), ''), 'competition');
  if v_kind not in ('competition', 'activity') then perform private.fail(400, 'ลักษณะรายการไม่ถูกต้อง'); end if;
  v_end := private.text_field(p_body -> 'endTime', 'เวลาสิ้นสุด', 5);
  if v_end <> '' and (v_end !~ '^([01]\d|2[0-3]):[0-5]\d$' or v_time = '' or v_end <= v_time) then
    perform private.fail(400, 'เวลาสิ้นสุดต้องหลังเวลาเริ่มภายในวันเดียวกัน');
  end if;

  if jsonb_typeof(p_body -> 'results') is distinct from 'array' or jsonb_array_length(p_body -> 'results') > 200 then
    perform private.fail(400, 'เพิ่มผู้เข้าแข่งขันได้ไม่เกิน 200 แถว');
  end if;
  if v_kind = 'activity' and jsonb_array_length(p_body -> 'results') > 0 then perform private.fail(400, 'กิจกรรมไม่มีผลการแข่งขัน'); end if;
  for v_row in select value from jsonb_array_elements(p_body -> 'results') with ordinality order by ordinality loop
    if jsonb_typeof(v_row) <> 'object' then perform private.fail(400, 'รูปแบบผู้เข้าแข่งขันไม่ถูกต้อง'); end if;
    v_school := private.text_field(v_row -> 'school', 'โรงเรียน', 250, true);
    if not exists (select 1 from public.schools where name_th = v_school) then
      perform private.fail(400, 'กรุณาเลือกโรงเรียนจากรายชื่อสถาบัน');
    end if;
    v_medal := private.text_field(v_row -> 'medal', 'เหรียญ', 20);
    if v_medal not in ('', 'ทอง', 'เงิน', 'ทองแดง') then perform private.fail(400, 'เหรียญไม่ถูกต้อง'); end if;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'school', v_school,
      'player', private.text_field(v_row -> 'player', 'ผู้เข้าแข่งขัน', 200),
      'result', private.text_field(v_row -> 'result', 'ผล', 100),
      'stat', private.text_field(v_row -> 'stat', 'สถิติ', 100),
      'medal', v_medal
    ));
  end loop;

  return jsonb_build_object(
    'code', v_code, 'sportId', p_sport, 'sport', v_sport.name, 'level', v_level,
    'name', private.text_field(p_body -> 'name', 'รายการ', 200, true), 'date', v_date, 'time', v_time,
    'endTime', v_end, 'kind', v_kind,
    'category', private.text_field(p_body -> 'category', 'ประเภทการแข่งขัน', 100),
    'note', private.text_field(p_body -> 'note', 'หมายเหตุ', 1000),
    'stadium', private.text_field(p_body -> 'stadium', 'สนาม', 200),
    'round', private.text_field(p_body -> 'round', 'รอบ', 100),
    'group', private.text_field(p_body -> 'group', 'กลุ่ม', 50),
    'results', v_results
  );
end $$;

create function private.match_view(p_match public.matches) returns jsonb
language sql stable set search_path = '' as $$
  select p_match.payload || jsonb_build_object(
    'id', p_match.id, 'status', p_match.status, 'version', p_match.version,
    'reviewNote', p_match.review_note, 'submittedBy', p_match.submitted_by,
    'published', p_match.published is not null, 'updatedAt', p_match.updated_at
  )
$$;

create function private.sports_of(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(sport_id order by sport_id), '[]') from public.user_sports where user_id = p_user
$$;

-- รูปแบบเดิมของระบบผล: [{sport_id, permission}] โดย permission = role ของบัญชี
create function private.assignments_of(p_profile public.profiles) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('sport_id', sport_id, 'permission', p_profile.role) order by sport_id), '[]')
  from public.user_sports where user_id = p_profile.id and p_profile.role in ('technician', 'reviewer')
$$;

-- ตั้ง role และกีฬา: ฝ่ายเทคนิค/ผู้ตรวจต้องมีกีฬาอย่างน้อยหนึ่งชนิด role อื่นไม่ผูกกีฬา
create function private.set_access(p_user uuid, p_role text, p_sports jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb;
  v_sport integer;
  v_list integer[] := '{}';
begin
  if p_role is null or p_role not in ('admin', 'editor', 'technician', 'reviewer') then perform private.fail(400, 'Role ไม่ถูกต้อง'); end if;
  if p_role in ('technician', 'reviewer') then
    if jsonb_typeof(p_sports) is distinct from 'array' then perform private.fail(400, 'ชนิดกีฬาไม่ถูกต้อง'); end if;
    for v_item in select value from jsonb_array_elements(p_sports) loop
      v_sport := private.json_int(v_item);
      if v_sport is null or not exists (select 1 from public.sports where id = v_sport) then
        perform private.fail(400, 'ชนิดกีฬาไม่ถูกต้อง');
      end if;
      if not v_sport = any (v_list) then v_list := v_list || v_sport; end if;
    end loop;
    if cardinality(v_list) = 0 then perform private.fail(400, 'ฝ่ายเทคนิคกีฬาและผู้ตรวจผลต้องเลือกกีฬาอย่างน้อยหนึ่งชนิด'); end if;
  end if;
  update public.profiles set role = p_role, updated_at = now() where id = p_user;
  delete from public.user_sports where user_id = p_user;
  insert into public.user_sports (user_id, sport_id) select p_user, unnest(v_list);
  return (select coalesce(jsonb_agg(x order by x), '[]') from unnest(v_list) x);
end $$;

-- อีเมลโดเมนนี้เข้าสู่ระบบด้วยส่วนหน้า @ ได้ (ต้องตรงกับ loginDomain ใน admin/supabase.json)
create function private.login_domain() returns text
language sql immutable set search_path = '' as $$ select 'satitpatumwan.ac.th' $$;

create function private.username_for(p_email text) returns text
language sql immutable set search_path = '' as $$
  select case when lower(p_email) like '%@' || private.login_domain() then split_part(lower(p_email), '@', 1) else lower(p_email) end
$$;

-- สร้าง profile ให้บัญชีใหม่ ใช้ app_metadata (ผู้ใช้แก้เองไม่ได้) ไม่ใช้ user_metadata
-- role เริ่มต้นเป็นฝ่ายเทคนิคที่ยังไม่มีกีฬา (ทำอะไรไม่ได้) แอดมินคนแรกตั้งด้วย SQL (ดู supabase/README.md)
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_username text := private.username_for(new.email);
begin
  insert into public.profiles (id, email, username, display_name)
  values (new.id, lower(new.email), v_username, coalesce(nullif(btrim(new.raw_app_meta_data ->> 'display_name'), ''), v_username));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------- ฟังก์ชันสำหรับ RLS ----------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and active and not must_change
  )
$$;

create function public.has_sport(p_sport integer) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.user_sports s join public.profiles p on p.id = s.user_id
    where s.user_id = (select auth.uid()) and s.sport_id = p_sport and p.active and not p.must_change
      and p.role in ('technician', 'reviewer')
  )
$$;

-- ---------- RLS ----------

alter table public.sports enable row level security;
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.user_sports enable row level security;
alter table public.matches enable row level security;
alter table public.audit_log enable row level security;

-- ชนิดกีฬาและรายชื่อสถาบันอ่านได้ทุกคน
create policy sports_read on public.sports for select to anon, authenticated using (true);
create policy schools_read on public.schools for select to anon, authenticated using (true);
-- บัญชีและสิทธิ์: อ่านของตนเอง หรือแอดมินอ่านทั้งหมด
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy user_sports_read on public.user_sports for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
-- รายการแข่งขัน: เฉพาะกีฬาที่ได้รับมอบหมาย
create policy matches_read on public.matches for select to authenticated
  using (public.has_sport(sport_id));
-- audit_log ไม่มี policy: อ่านผ่าน match_history() และ audit_recent() เท่านั้น

revoke all on public.sports, public.schools, public.profiles, public.user_sports, public.matches, public.audit_log
  from anon, authenticated;
grant select on public.sports, public.schools to anon, authenticated;
grant select on public.profiles, public.user_sports, public.matches to authenticated;

-- ---------- API (เรียกด้วย supabase.rpc) ----------

create function public.me() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_profile public.profiles := private.require_staff(true);
begin
  return jsonb_build_object(
    'user', jsonb_build_object('id', v_profile.id, 'email', v_profile.email, 'username', v_profile.username,
      'display_name', v_profile.display_name, 'role', v_profile.role, 'mustChange', v_profile.must_change),
    'assignments', private.assignments_of(v_profile),
    'sports', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name', name) order by id), '[]') from public.sports),
    'schools', (select coalesce(jsonb_agg(jsonb_build_object('no', no, 'nameTh', name_th, 'nameEn', name_en, 'abbr', abbr,
      'thaiAbbr', thai_abbr, 'levels', to_jsonb(levels)) order by no), '[]') from public.schools)
  );
end $$;

create function public.list_matches() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_profile public.profiles := private.require_staff();
begin
  return (
    select coalesce(jsonb_agg(private.match_view(m) order by m.updated_at desc, m.id desc), '[]')
    from public.matches m where private.can(v_profile, m.sport_id, null)
  );
end $$;

create function public.get_match(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_profile public.profiles := private.require_staff();
  v_match public.matches;
begin
  select * into v_match from public.matches where id = p_id;
  if v_match.id is null then perform private.fail(404, 'ไม่พบข้อมูล'); end if;
  if not private.can(v_profile, v_match.sport_id, null) then perform private.fail(403, 'ไม่มีสิทธิ์เข้าถึง'); end if;
  return private.match_view(v_match);
end $$;

create function public.create_match(p_body jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles := private.require_staff();
  v_sport integer := private.json_int(p_body -> 'sportId');
  v_data jsonb;
  v_match public.matches;
begin
  perform private.require_sport(v_profile, v_sport, 'technician');
  v_data := private.match_payload(p_body, v_sport);
  begin
    insert into public.matches (code, sport_id, payload) values (v_data ->> 'code', v_sport, v_data) returning * into v_match;
  exception when unique_violation then
    perform private.fail(409, 'รหัสการแข่งขันนี้มีอยู่แล้ว');
  end;
  perform private.audit(v_profile.id, 'created', v_match.id, v_data);
  return private.match_view(v_match);
end $$;

-- แก้ไขได้ทุกสถานะยกเว้นรอตรวจ ฉบับที่อนุมัติแล้วยังแสดงบนเว็บจนกว่าจะอนุมัติฉบับใหม่
create function public.update_match(p_id bigint, p_body jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles := private.require_staff();
  v_match public.matches := private.lock_match(v_profile, p_id);
  v_data jsonb;
begin
  perform private.require_sport(v_profile, v_match.sport_id, 'technician');
  perform private.check_version(v_match, private.json_int(p_body -> 'version'));
  if v_match.status = 'pending' then perform private.fail(409, 'รายการอยู่ระหว่างตรวจ ต้องให้ผู้ตรวจส่งกลับก่อนแก้ไข'); end if;
  v_data := private.match_payload(p_body, v_match.sport_id);
  if v_match.published is not null and v_data ->> 'kind' = 'activity' then
    perform private.fail(400, 'รายการที่เคยเผยแพร่ผลแล้วไม่สามารถเปลี่ยนเป็นกิจกรรมได้');
  end if;
  if v_data ->> 'code' <> v_match.code or private.json_int(p_body -> 'sportId') is distinct from v_match.sport_id then
    perform private.fail(400, 'เปลี่ยนรหัสหรือชนิดกีฬาของรายการเดิมไม่ได้');
  end if;
  update public.matches set payload = v_data, status = 'draft', version = version + 1, updated_at = now()
  where id = v_match.id returning * into v_match;
  perform private.audit(v_profile.id, 'edited', v_match.id, v_data);
  return private.match_view(v_match);
end $$;

create function public.submit_match(p_id bigint, p_version integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles := private.require_staff();
  v_match public.matches := private.lock_match(v_profile, p_id);
begin
  perform private.require_sport(v_profile, v_match.sport_id, 'technician');
  perform private.check_version(v_match, p_version);
  if v_match.status not in ('draft', 'returned') then perform private.fail(409, 'ส่งตรวจได้เฉพาะฉบับร่างหรือรายการที่ส่งกลับ'); end if;
  if v_match.payload ->> 'kind' = 'activity' or jsonb_array_length(v_match.payload -> 'results') = 0 then
    perform private.fail(400, 'ส่งตรวจได้เฉพาะรายการแข่งขันที่มีผู้เข้าแข่งขันและผลครบแล้ว');
  end if;
  if exists (select 1 from jsonb_array_elements(v_match.payload -> 'results') r where r ->> 'result' = '' and r ->> 'stat' = '') then
    perform private.fail(400, 'กรุณากรอกผลหรือสถิติให้ครบทุกผู้เข้าแข่งขันก่อนส่งตรวจ');
  end if;
  update public.matches set status = 'pending', submitted_by = v_profile.id, review_note = '', version = version + 1, updated_at = now()
  where id = v_match.id;
  perform private.audit(v_profile.id, 'submitted', v_match.id, jsonb_build_object('version', v_match.version, 'payload', v_match.payload));
  return jsonb_build_object('ok', true);
end $$;

-- ผู้ส่งผลอนุมัติผลของตนเองไม่ได้ รวมถึงแอดมินกลาง
create function public.review_match(p_id bigint, p_version integer, p_action text, p_note text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles := private.require_staff();
  v_match public.matches := private.lock_match(v_profile, p_id);
  v_note text;
  v_status text;
begin
  perform private.require_sport(v_profile, v_match.sport_id, 'reviewer');
  perform private.check_version(v_match, p_version);
  if v_match.status <> 'pending' then perform private.fail(409, 'รายการนี้ไม่ได้อยู่ระหว่างตรวจ'); end if;
  if v_match.submitted_by = v_profile.id then perform private.fail(403, 'ผู้ส่งผลตรวจผลของตนเองไม่ได้ ให้ผู้ตรวจอีกบัญชีดำเนินการ'); end if;
  if p_action is null or p_action not in ('approve', 'return') then perform private.fail(400, 'คำสั่งตรวจผลไม่ถูกต้อง'); end if;
  v_note := private.text_field(to_jsonb(p_note), 'เหตุผล', 1000, p_action = 'return');
  v_status := case p_action when 'approve' then 'approved' else 'returned' end;
  update public.matches
  set status = v_status, review_note = v_note, version = version + 1, updated_at = now(),
      published = case when p_action = 'approve' then payload else published end
  where id = v_match.id;
  perform private.audit(v_profile.id, v_status, v_match.id, jsonb_build_object('note', v_note, 'payload', v_match.payload, 'version', v_match.version));
  return jsonb_build_object('ok', true);
end $$;

create function public.withdraw_match(p_id bigint, p_version integer, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles := private.require_staff();
  v_match public.matches := private.lock_match(v_profile, p_id);
  v_note text;
begin
  perform private.require_sport(v_profile, v_match.sport_id, 'reviewer');
  perform private.check_version(v_match, p_version);
  if v_match.published is null then perform private.fail(409, 'รายการนี้ยังไม่เผยแพร่'); end if;
  v_note := private.text_field(to_jsonb(p_note), 'เหตุผลถอนผล', 1000, true);
  update public.matches set published = null, status = 'returned', review_note = v_note, version = version + 1, updated_at = now()
  where id = v_match.id;
  perform private.audit(v_profile.id, 'withdrawn', v_match.id, jsonb_build_object('note', v_note, 'published', v_match.published));
  return jsonb_build_object('ok', true);
end $$;

create function public.match_history(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_profile public.profiles := private.require_staff();
  v_sport integer;
begin
  select sport_id into v_sport from public.matches where id = p_id;
  if v_sport is null then perform private.fail(404, 'ไม่พบข้อมูล'); end if;
  if not private.can(v_profile, v_sport, null) then perform private.fail(403, 'ไม่มีสิทธิ์เข้าถึง'); end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'at', a.at, 'action', a.action, 'detail', a.detail,
      'display_name', p.display_name) order by a.id desc), '[]')
    from public.audit_log a left join public.profiles p on p.id = a.user_id
    where a.match_id = p_id
  );
end $$;

create function public.audit_recent() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'at', a.at, 'action', a.action, 'detail', a.detail,
      'display_name', p.display_name, 'match_id', a.match_id) order by a.id desc), '[]')
    from (select * from public.audit_log order by id desc limit 500) a
    left join public.profiles p on p.id = a.user_id
  );
end $$;

-- ---------- จัดการบัญชี (หน้า Role manager และ Edge Function "accounts" เรียกด้วย JWT ของผู้ใช้) ----------

create function public.admin_list_users() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'email', email, 'username', username, 'display_name', display_name,
      'role', role, 'active', active, 'must_change', must_change, 'updated_at', updated_at,
      'sports', private.sports_of(id)) order by created_at, username), '[]')
    from public.profiles
  );
end $$;

-- เรียกหลังสร้างบัญชีใน auth.users แล้ว เพื่อกำหนด role/กีฬา และบันทึกประวัติ
create function public.admin_register_user(p_user uuid, p_role text, p_sports jsonb default '[]') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_admin public.profiles := private.require_admin();
  v_target public.profiles;
  v_sports jsonb;
begin
  select * into v_target from public.profiles where id = p_user for update;
  if v_target.id is null then perform private.fail(404, 'ไม่พบข้อมูล'); end if;
  v_sports := private.set_access(p_user, p_role, p_sports);
  perform private.audit(v_admin.id, 'user_created', null,
    jsonb_build_object('id', p_user, 'username', v_target.username, 'role', p_role, 'sports', v_sports));
  return jsonb_build_object('id', p_user, 'username', v_target.username);
end $$;

-- แก้ชื่อ role กีฬา และสถานะ ห้ามแก้ role/สถานะของตนเอง เพื่อไม่ให้แอดมินล็อกตัวเองออก (จึงเหลือแอดมินอย่างน้อยหนึ่งคนเสมอ)
create function public.admin_update_user(p_user uuid, p_display_name text, p_role text, p_sports jsonb, p_active boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_admin public.profiles := private.require_admin();
  v_target public.profiles;
  v_name text := private.text_field(to_jsonb(p_display_name), 'ชื่อ', 150, true);
  v_sports jsonb;
begin
  select * into v_target from public.profiles where id = p_user for update;
  if v_target.id is null then perform private.fail(404, 'ไม่พบข้อมูล'); end if;
  if p_active is null then perform private.fail(400, 'สถานะบัญชีไม่ถูกต้อง'); end if;
  if p_user = v_admin.id and (p_role is distinct from v_target.role or not p_active) then
    perform private.fail(403, 'เปลี่ยน Role หรือปิดบัญชีของตนเองไม่ได้ ให้แอดมินอีกคนดำเนินการ');
  end if;
  v_sports := private.set_access(p_user, p_role, p_sports);
  update public.profiles set display_name = v_name, active = p_active, updated_at = now() where id = p_user;
  perform private.audit(v_admin.id, 'user_updated', null,
    jsonb_build_object('id', p_user, 'display_name', v_name, 'role', p_role, 'sports', v_sports, 'active', p_active));
  return jsonb_build_object('ok', true);
end $$;

-- ตั้ง must_change ก่อนตั้งรหัสเริ่มต้น: session เดิมของบัญชีนั้นทำงานต่อไม่ได้ทันที
create function public.admin_mark_password_reset(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_admin public.profiles := private.require_admin();
  v_target public.profiles;
begin
  if p_user = v_admin.id then perform private.fail(400, 'เปลี่ยนรหัสผ่านของตนเองที่หน้าตั้งค่า'); end if;
  update public.profiles set must_change = true, updated_at = now() where id = p_user returning * into v_target;
  if v_target.id is null then perform private.fail(404, 'ไม่พบข้อมูล'); end if;
  perform private.audit(v_admin.id, 'password_reset', null, jsonb_build_object('id', p_user));
  return jsonb_build_object('username', v_target.username);
end $$;

-- เรียกได้เฉพาะ service_role (Edge Function) หลังตรวจรหัสผ่านเดิมและเปลี่ยนรหัสใน Auth แล้ว
create function public.mark_password_changed(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set must_change = false, updated_at = now() where id = p_user;
  if not found then perform private.fail(404, 'ไม่พบข้อมูล'); end if;
  perform private.audit(p_user, 'password_changed', null, '{}');
  return jsonb_build_object('ok', true);
end $$;

-- ---------- ผลที่เผยแพร่สำหรับเว็บหลัก (anon) ----------

-- รูปแบบเดียวกับ GET /api/public/results เดิม: { matches: [...], results: [...] } เฉพาะฉบับอนุมัติ
create function public.public_results() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'matches', coalesce((
      select jsonb_agg(jsonb_build_object('id', published ->> 'code') || (published - 'results' - 'code' - 'sportId')
        || jsonb_build_object('status', 'แข่งขันแล้ว') order by id)
      from public.matches where published is not null
    ), '[]'),
    'results', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.published ->> 'code') || r.value order by m.id, r.ordinality)
      from public.matches m, jsonb_array_elements(m.published -> 'results') with ordinality r
      where m.published is not null
    ), '[]')
  )
$$;

-- ---------- สิทธิ์เรียกฟังก์ชัน ----------

-- Supabase ให้สิทธิ์ execute กับ anon/authenticated โดยอัตโนมัติ จึงถอนออกก่อนแล้วให้เฉพาะที่ต้องใช้
-- ระบุชื่อฟังก์ชันเอง ไม่ใช้ "all functions in schema public" เพื่อไม่กระทบฟังก์ชันอื่นในโปรเจกต์
revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function
  public.is_admin(), public.has_sport(integer), public.me(), public.list_matches(), public.get_match(bigint),
  public.create_match(jsonb), public.update_match(bigint, jsonb), public.submit_match(bigint, integer),
  public.review_match(bigint, integer, text, text), public.withdraw_match(bigint, integer, text),
  public.match_history(bigint), public.audit_recent(), public.admin_list_users(),
  public.admin_register_user(uuid, text, jsonb), public.admin_update_user(uuid, text, text, jsonb, boolean),
  public.admin_mark_password_reset(uuid), public.mark_password_changed(uuid), public.public_results()
  from public, anon, authenticated;

grant execute on function
  public.is_admin(), public.has_sport(integer), public.me(), public.list_matches(), public.get_match(bigint),
  public.create_match(jsonb), public.update_match(bigint, jsonb), public.submit_match(bigint, integer),
  public.review_match(bigint, integer, text, text), public.withdraw_match(bigint, integer, text),
  public.match_history(bigint), public.audit_recent(), public.admin_list_users(),
  public.admin_register_user(uuid, text, jsonb), public.admin_update_user(uuid, text, text, jsonb, boolean),
  public.admin_mark_password_reset(uuid)
  to authenticated;
grant execute on function public.public_results() to anon, authenticated;
grant execute on function public.mark_password_changed(uuid) to service_role;
