-- จำลองส่วนที่ Supabase มีให้ก่อน migration (role, auth.users, auth.uid() และสิทธิ์เริ่มต้น)
-- ใช้ทดสอบใน Postgres ในเครื่องเท่านั้น ห้ามรันบนโปรเจกต์ Supabase จริง
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_app_meta_data jsonb not null default '{}',
  raw_user_meta_data jsonb not null default '{}'
);
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$$;

-- เหมือนค่าเริ่มต้นของ Supabase: anon/authenticated ได้สิทธิ์ทุกอย่างบน public (RLS เป็นตัวกัน)
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
