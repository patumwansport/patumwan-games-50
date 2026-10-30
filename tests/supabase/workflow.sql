-- ทดสอบสิทธิ์และขั้นตอนอนุมัติผลใน migration ของ Supabase (รันผ่าน scripts/test-supabase.sh)
\set ON_ERROR_STOP 1
\set QUIET 1
set client_min_messages = warning;
\o /dev/null

create schema t;
grant usage on schema t to anon, authenticated, service_role;

-- เปลี่ยนผู้ใช้จำลอง: uuid = authenticated, null = anon
create function t.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'none', false);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), false);
  perform set_config('role', case when p_user is null then 'anon' else 'authenticated' end, false);
end $$;

create function t.ok(p_cond boolean, p_label text) returns void language plpgsql as $$
begin
  if p_cond is not true then raise exception 'FAIL: %', p_label; end if;
end $$;

create function t.expect(p_sql text, p_code text, p_label text) returns void language plpgsql as $$
declare
  v_state text := 'none';
  v_msg text := '';
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
  end;
  if v_state <> p_code then raise exception 'FAIL: % (ต้องได้ % แต่ได้ %: %)', p_label, p_code, v_state, v_msg; end if;
end $$;

create function t.body(p_code text, p_sport integer, p_result text, p_version integer default null) returns jsonb language sql as $$
  select jsonb_build_object('code', p_code, 'sportId', p_sport, 'level', 'p', 'name', 'วิ่ง 100 เมตร', 'date', '2027-12-02',
    'time', '09:30', 'stadium', 'สนามกลาง', 'round', 'ชิงชนะเลิศ', 'group', '', 'version', p_version,
    'results', jsonb_build_array(jsonb_build_object('school', (select name_th from public.schools order by no limit 1),
      'player', 'ด.ช.ทดสอบ', 'result', p_result, 'stat', '', 'medal', 'ทอง')))
$$;

create table t.ids (name text primary key, id uuid not null);
insert into t.ids values
  ('admin', '00000000-0000-0000-0000-00000000000a'), ('tech', '00000000-0000-0000-0000-00000000000b'),
  ('rev', '00000000-0000-0000-0000-00000000000c'), ('other', '00000000-0000-0000-0000-00000000000d');
grant select on t.ids to anon, authenticated, service_role;
create function t.id(p_name text) returns uuid language sql stable as $$ select id from t.ids where name = p_name $$;

-- ---------- บัญชี ----------
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  (t.id('admin'), 'kittiya.kul@satitpatumwan.ac.th', '{}', '{}'),
  (t.id('tech'), 'Tech.One@SatitPatumwan.ac.th', '{"display_name":"ฝ่ายเทคนิค"}', '{}'),
  (t.id('rev'), 'rev@satitpatumwan.ac.th', '{"display_name":"ผู้ตรวจ"}', '{}'),
  (t.id('other'), 'other.person@gmail.com', '{}', '{"role":"admin"}');

select t.ok((select username from public.profiles where id = t.id('admin')) = 'kittiya.kul', 'อีเมลโรงเรียนใช้ส่วนหน้า @ เป็นชื่อผู้ใช้');
select t.ok((select username || ' ' || email from public.profiles where id = t.id('tech')) = 'tech.one tech.one@satitpatumwan.ac.th', 'ชื่อผู้ใช้และอีเมลเป็นตัวเล็ก');
select t.ok((select username from public.profiles where id = t.id('other')) = 'other.person@gmail.com', 'อีเมลโดเมนอื่นใช้อีเมลเต็ม');
select t.ok((select role = 'technician' and must_change and active and display_name = 'other.person@gmail.com' from public.profiles where id = t.id('other')),
  'บัญชีใหม่ไม่อ่าน role จาก user_metadata และต้องเปลี่ยนรหัสผ่าน');

-- ตั้งแอดมินกลางคนแรกตามขั้นตอนใน supabase/README.md
update public.profiles set role = 'admin', must_change = false where id = t.id('admin');

-- ---------- ผู้ที่ยังไม่เปลี่ยนรหัสผ่าน ----------
select t.login(t.id('tech'));
select t.ok((public.me() -> 'user' ->> 'mustChange')::boolean, 'me() ใช้ได้ระหว่างรอเปลี่ยนรหัสผ่าน');
select t.expect('select public.list_matches()', 'PT403', 'ยังไม่เปลี่ยนรหัสผ่านใช้งานไม่ได้');
select t.expect('select public.mark_password_changed(auth.uid())', '42501', 'ผู้ใช้ปลด must_change เองไม่ได้');
select t.expect($$update public.profiles set must_change = false where id = auth.uid()$$, '42501', 'แก้ profile ตรงไม่ได้');
select t.expect('select public.admin_list_users()', 'PT403', 'เจ้าหน้าที่เรียก API แอดมินไม่ได้');

-- ---------- แอดมินกำหนด role และกีฬา ----------
select t.login(t.id('admin'));
select t.expect($$select public.admin_register_user(t.id('tech'), 'technician', '[]')$$, 'PT400', 'ฝ่ายเทคนิคต้องเลือกกีฬา');
select t.expect($$select public.admin_register_user(t.id('tech'), 'owner', '[]')$$, 'PT400', 'role ไม่ถูกต้อง');
select t.expect($$select public.admin_register_user(t.id('tech'), 'technician', '[99999]')$$, 'PT400', 'กีฬาที่ไม่มีอยู่');
select t.expect($$select public.admin_register_user(t.id('tech'), 'technician', '["1"]')$$, 'PT400', 'รหัสกีฬาต้องเป็นตัวเลข');
select public.admin_register_user(t.id('tech'), 'technician', '[1, 1, 3]');
select public.admin_register_user(t.id('rev'), 'reviewer', '[1]');
select public.admin_register_user(t.id('other'), 'technician', '[2]');
select t.ok((select array_agg(sport_id order by sport_id) from public.user_sports where user_id = t.id('tech')) = '{1,3}', 'กีฬาซ้ำบันทึกครั้งเดียว');
select public.admin_update_user(t.id('other'), 'บุคคลอื่น', 'editor', '[2]', true);
select t.ok((select role = 'editor' and display_name = 'บุคคลอื่น' from public.profiles where id = t.id('other'))
  and not exists (select 1 from public.user_sports where user_id = t.id('other')), 'CMS Editor ไม่ผูกกีฬา');
select public.admin_update_user(t.id('other'), 'บุคคลอื่น', 'technician', '[2]', true);
select t.expect($$select public.admin_update_user(t.id('admin'), 'แอดมิน', 'editor', '[]', true)$$, 'PT403', 'แอดมินเปลี่ยน role ตนเองไม่ได้');
select t.expect($$select public.admin_update_user(t.id('admin'), 'แอดมิน', 'admin', '[]', false)$$, 'PT403', 'แอดมินปิดบัญชีตนเองไม่ได้');
select public.admin_update_user(t.id('admin'), 'Kittiya Kul', 'admin', '[]', true);
select t.expect($$select public.admin_update_user(t.id('other'), '   ', 'technician', '[2]', true)$$, 'PT400', 'ชื่อต้องไม่ว่าง');
select t.ok(jsonb_array_length(public.admin_list_users()) = 4, 'แอดมินเห็นบัญชีทั้งหมด');
select t.ok((select e -> 'sports' = '[1,3]' and e ->> 'email' = 'tech.one@satitpatumwan.ac.th' and (e ->> 'must_change')::boolean
  from jsonb_array_elements(public.admin_list_users()) e where e ->> 'username' = 'tech.one'), 'รายชื่อมีอีเมล กีฬา และสถานะรหัสผ่าน');

select t.login(null);
set role service_role;
select public.mark_password_changed(id) from t.ids where name <> 'admin';

-- ---------- ผู้ชมเว็บ (anon) ----------
select t.login(null);
select t.ok(public.public_results() = '{"matches":[],"results":[]}', 'ยังไม่มีผลเผยแพร่');
select t.ok((select count(*) from public.sports) > 0, 'anon อ่านชนิดกีฬาได้');
select t.expect('select * from public.matches', '42501', 'anon อ่านตาราง matches ไม่ได้');
select t.expect('select public.list_matches()', '42501', 'anon เรียก API เจ้าหน้าที่ไม่ได้');

-- ---------- ฝ่ายเทคนิคสร้างและแก้ผล ----------
select t.login(t.id('tech'));
select t.ok(public.me() -> 'assignments' = '[{"sport_id":1,"permission":"technician"},{"sport_id":3,"permission":"technician"}]', 'me() คืนสิทธิ์กีฬาในรูปแบบเดิม');
select t.expect($$select public.create_match(t.body('M2', 2, '1'))$$, 'PT403', 'ฝ่ายเทคนิคสร้างรายการกีฬาที่ไม่ได้รับมอบหมายไม่ได้');
select t.expect($$select public.create_match(t.body('M 1', 1, '1'))$$, 'PT400', 'รหัสมีช่องว่าง');
select t.expect($$select public.create_match(t.body('M1', 1, '1') || '{"date":"2027-02-30"}')$$, 'PT400', 'วันที่ไม่มีจริง');
select t.expect($$select public.create_match(t.body('M1', 1, '1') || '{"time":"24:00"}')$$, 'PT400', 'เวลาไม่ถูกต้อง');
select t.expect($$select public.create_match(t.body('M1', 1, '1') || '{"results":[{"school":"โรงเรียนที่ไม่มี"}]}')$$, 'PT400', 'โรงเรียนต้องอยู่ในรายชื่อ');
select t.expect($$select public.create_match(t.body('M1', 1, '1') || '{"results":{}}')$$, 'PT400', 'results ต้องเป็นรายการ');
select t.expect($$select public.create_match(t.body('M1', 1, '1') || '{"kind":"party"}')$$, 'PT400', 'ลักษณะรายการไม่ถูกต้อง');
select t.expect($$select public.create_match(t.body('M1', 1, '1') || '{"kind":"activity"}')$$, 'PT400', 'กิจกรรมไม่มีผลการแข่งขัน');
select t.expect($$select public.create_match(t.body('M1', 1, '1') || '{"endTime":"09:00"}')$$, 'PT400', 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม');
select t.expect($$select public.create_match(t.body('M1', 1, '1') || '{"time":"","endTime":"10:00"}')$$, 'PT400', 'เวลาสิ้นสุดต้องมีเวลาเริ่ม');

-- ลงตารางก่อนรู้ผู้เข้าแข่งขัน และกิจกรรมที่ไม่มีผล: บันทึกได้แต่ส่งตรวจไม่ได้
create temp table s as select
  (public.create_match(t.body('S1', 1, '') || '{"results":[],"endTime":"10:30","category":"ชาย","note":"ชิงเหรียญ"}') ->> 'id')::bigint as slot,
  (public.create_match(t.body('ACT1', 1, '') || '{"kind":"activity","results":[]}') ->> 'id')::bigint as act;
grant select on s to authenticated;
select t.ok((select payload @> '{"kind":"competition","endTime":"10:30","category":"ชาย","note":"ชิงเหรียญ","results":[]}'
  from public.matches where code = 'S1'), 'เก็บ kind, endTime, category, note');
select t.ok((select payload ->> 'kind' = 'activity' from public.matches where code = 'ACT1'), 'บันทึกกิจกรรมได้');
select t.expect('select public.submit_match((select slot from s), 1)', 'PT400', 'ส่งตรวจรายการที่ยังไม่มีผู้เข้าแข่งขันไม่ได้');
select t.expect('select public.submit_match((select act from s), 1)', 'PT400', 'ส่งตรวจกิจกรรมไม่ได้');
select t.ok((public.update_match((select slot from s), t.body('S1', 1, '11.2', 1)) -> 'results' -> 0 ->> 'result') = '11.2', 'เพิ่มผู้เข้าแข่งขันภายหลัง');
select t.expect($$select public.create_match(jsonb_set(t.body('M1', 1, '1'), '{results,0,medal}', '"ทองคำ"'))$$, 'PT400', 'เหรียญไม่ถูกต้อง');
select t.expect($$select public.create_match(t.body('M1', 1, '1') || jsonb_build_object('name', repeat('ก', 201)))$$, 'PT400', 'ชื่อรายการยาวเกิน');

select t.ok((public.create_match(t.body('M1', 1, '')) ->> 'version')::int = 1, 'สร้างฉบับร่างได้แม้ยังไม่กรอกผล');
select t.expect($$select public.create_match(t.body('m1', 1, '1'))$$, 'PT409', 'รหัสซ้ำแบบไม่สนตัวพิมพ์');
select t.ok((select payload -> 'results' -> 0 ->> 'player' from public.matches where code = 'M1') = 'ด.ช.ทดสอบ', 'RLS ให้ฝ่ายเทคนิคอ่านกีฬาของตน');
select t.expect($$insert into public.matches (code, sport_id, payload) values ('X', 1, '{}')$$, '42501', 'insert ตรงไม่ได้');
select t.expect($$update public.matches set status = 'approved'$$, '42501', 'update ตรงไม่ได้');
select t.expect($$delete from public.audit_log$$, '42501', 'ลบประวัติไม่ได้');

create temp table m as select id from public.matches where code = 'M1';
grant select on m to authenticated, anon, service_role;

select t.expect('select public.submit_match((select id from m), 1)', 'PT400', 'ส่งตรวจต้องกรอกผลครบ');
select t.expect($$select public.update_match((select id from m), t.body('M1', 1, '10.52', 0))$$, 'PT409', 'version เก่าแก้ไม่ได้');
select t.expect($$select public.update_match((select id from m), t.body('M9', 1, '10.52', 1))$$, 'PT400', 'เปลี่ยนรหัสไม่ได้');
select t.ok((public.update_match((select id from m), t.body('M1', 1, '10.52', 1)) ->> 'version')::int = 2, 'แก้ฉบับร่าง');
select public.submit_match((select id from m), 2);
select t.expect($$select public.update_match((select id from m), t.body('M1', 1, '10.40', 3))$$, 'PT409', 'แก้ระหว่างรอตรวจไม่ได้');
select t.expect('select public.review_match((select id from m), 3, ''approve'')', 'PT403', 'ฝ่ายเทคนิคอนุมัติผลไม่ได้');

-- ---------- บัญชีที่ไม่ได้รับมอบหมายกีฬานี้ ----------
select t.login(t.id('other'));
select t.ok(jsonb_array_length(public.list_matches()) = 0, 'ไม่เห็นรายการกีฬาอื่น');
select t.ok((select count(*) from public.matches) = 0, 'RLS ซ่อนรายการกีฬาอื่น');
select t.expect('select public.get_match((select id from m))', 'PT403', 'เปิดรายการกีฬาอื่นไม่ได้');
select t.expect('select public.match_history((select id from m))', 'PT403', 'ดูประวัติกีฬาอื่นไม่ได้');

-- ---------- ผู้ตรวจ ----------
select t.login(t.id('rev'));
select t.expect('select public.review_match((select id from m), 3, ''return'', ''  '')', 'PT400', 'ส่งกลับต้องมีเหตุผล');
select t.expect('select public.review_match((select id from m), 3, ''publish'')', 'PT400', 'คำสั่งไม่ถูกต้อง');
select public.review_match((select id from m), 3, 'return', 'เวลาไม่ตรงใบบันทึก');
select t.ok((public.get_match((select id from m)) ->> 'status') = 'returned', 'ส่งกลับแล้ว');

select t.login(t.id('tech'));
select t.ok((public.get_match((select id from m)) ->> 'reviewNote') = 'เวลาไม่ตรงใบบันทึก', 'ฝ่ายเทคนิคเห็นเหตุผลส่งกลับ');
select public.update_match((select id from m), t.body('M1', 1, '10.48', 4));
select public.submit_match((select id from m), 5);

select t.login(t.id('rev'));
select public.review_match((select id from m), 6, 'approve');

select t.login(null);
select t.ok(jsonb_array_length(public.public_results() -> 'matches') = 1, 'ผลอนุมัติแสดงบนเว็บ');
select t.ok(public.public_results() -> 'matches' -> 0 ->> 'id' = 'M1'
  and public.public_results() -> 'matches' -> 0 ->> 'status' = 'แข่งขันแล้ว'
  and not (public.public_results() -> 'matches' -> 0 ? 'sportId')
  and not (public.public_results() -> 'matches' -> 0 ? 'results'), 'รูปแบบ matches เหมือน API เดิม');
select t.ok(public.public_results() -> 'results' -> 0 ->> 'id' = 'M1'
  and public.public_results() -> 'results' -> 0 ->> 'result' = '10.48'
  and public.public_results() -> 'results' -> 0 ->> 'medal' = 'ทอง', 'รูปแบบ results เหมือน API เดิม');

-- ---------- แก้ผลที่เผยแพร่แล้ว: เว็บยังแสดงฉบับเดิม ----------
select t.login(t.id('tech'));
select public.update_match((select id from m), t.body('M1', 1, '10.45', 7));
select t.ok((public.get_match((select id from m)) ->> 'published')::boolean and public.get_match((select id from m)) ->> 'status' = 'draft',
  'ฉบับแก้เป็นร่างใหม่ และยังมีฉบับเผยแพร่');
select t.login(null);
select t.ok(public.public_results() -> 'results' -> 0 ->> 'result' = '10.48', 'เว็บยังแสดงผลที่อนุมัติล่าสุด');
select t.login(t.id('tech'));
select t.expect($$select public.update_match((select id from m), t.body('M1', 1, '', 8) || '{"kind":"activity","results":[]}')$$, 'PT400',
  'รายการที่เคยเผยแพร่เปลี่ยนเป็นกิจกรรมไม่ได้');

-- ---------- ถอนผล ----------
select t.login(t.id('tech'));
select t.expect('select public.withdraw_match((select id from m), 8, ''ผิด'')', 'PT403', 'ฝ่ายเทคนิคถอนผลไม่ได้');
select t.login(t.id('rev'));
select t.expect('select public.withdraw_match((select id from m), 8, '''')', 'PT400', 'ถอนผลต้องมีเหตุผล');
select public.withdraw_match((select id from m), 8, 'ผลไม่ถูกต้อง');
select t.login(null);
select t.ok(public.public_results() = '{"matches":[],"results":[]}', 'ถอนผลแล้วไม่แสดงบนเว็บ');

-- ---------- แอดมินส่งผลเองแล้วอนุมัติเองไม่ได้ ----------
select t.login(t.id('admin'));
create temp table m2 as select (public.create_match(t.body('A1', 1, '12.0')) ->> 'id')::bigint as id;
grant select on m2 to authenticated;
select public.submit_match((select id from m2), 1);
select t.expect('select public.review_match((select id from m2), 2, ''approve'')', 'PT403', 'ผู้ส่งผลอนุมัติผลตนเองไม่ได้');
select t.login(t.id('rev'));
select public.review_match((select id from m2), 2, 'approve');

-- ---------- ประวัติ ----------
select t.login(t.id('tech'));
select t.ok((select array_agg(e ->> 'action' order by (e ->> 'id')::bigint) from jsonb_array_elements(public.match_history((select id from m))) e)
  = array['created', 'edited', 'submitted', 'returned', 'edited', 'submitted', 'approved', 'edited', 'withdrawn'], 'ประวัติครบทุกขั้น');
select t.ok(public.match_history((select id from m)) -> 0 ->> 'display_name' = 'ผู้ตรวจ', 'ประวัติแสดงชื่อผู้ดำเนินการ');
select t.expect('select public.audit_recent()', 'PT403', 'เจ้าหน้าที่ดูประวัติทั้งระบบไม่ได้');
select t.login(t.id('admin'));
select t.ok(jsonb_array_length(public.audit_recent()) > 10, 'แอดมินดูประวัติทั้งระบบ');

-- ---------- ปิดบัญชี / รีเซ็ตรหัสผ่าน มีผลทันที ----------
select public.admin_update_user(t.id('other'), 'บุคคลอื่น', 'technician', '[2]', false);
select public.admin_mark_password_reset(t.id('rev'));
select t.expect($$select public.admin_mark_password_reset(t.id('admin'))$$, 'PT400', 'รีเซ็ตรหัสของตนเองผ่านหน้านี้ไม่ได้');
select t.login(t.id('other'));
select t.expect('select public.list_matches()', 'PT401', 'บัญชีที่ปิดแล้วใช้งานไม่ได้');
select t.ok((select count(*) from public.matches) = 0, 'บัญชีที่ปิดแล้ว RLS ไม่ให้อ่าน');
select t.login(t.id('rev'));
select t.expect('select public.list_matches()', 'PT403', 'ถูกรีเซ็ตรหัสต้องเปลี่ยนรหัสก่อน');
select t.ok((select count(*) from public.matches) = 0, 'ระหว่างรอเปลี่ยนรหัส RLS ไม่ให้อ่าน');

-- ---------- sync ชนิดกีฬา/สถาบันจากหน้าแอดมิน ----------
select t.login(t.id('tech'));
select t.expect($$select public.sync_reference('[]', null)$$, 'PT403', 'ฝ่ายเทคนิค sync ข้อมูลอ้างอิงไม่ได้');
select t.login(t.id('admin'));
select t.expect($$select public.sync_reference('[{"id":"1","code":"01","name":"กรีฑา"}]', null)$$, 'PT400', 'id กีฬาต้องเป็นตัวเลข');
select t.expect($$select public.sync_reference(null, '[{"no":99,"nameTh":"ทดสอบ","levels":["x"]}]')$$, 'PT400', 'ระดับสถาบันไม่ถูกต้อง');
select t.expect($$select public.sync_reference(null, jsonb_build_array(jsonb_build_object('no', 99, 'nameTh', (select name_th from public.schools where no = 1))))$$,
  'PT409', 'ชื่อสถาบันซ้ำ');
select t.ok(public.sync_reference('[{"id":1,"code":"01","name":"กรีฑา (ลู่-ลาน)"},{"id":99,"code":"99","name":"กีฬาใหม่"}]',
  '[{"no":99,"nameTh":"โรงเรียนทดสอบ","nameEn":"Test","abbr":"T","thaiAbbr":"ทส","levels":["p"]}]') = '{"sports":2,"schools":1}', 'sync สำเร็จ');
select t.ok((select name from public.sports where id = 1) = 'กรีฑา (ลู่-ลาน)' and exists (select 1 from public.sports where id = 99)
  and (select levels from public.schools where no = 99) = '{p}', 'upsert ชนิดกีฬาและสถาบัน');
select t.ok((select count(*) from public.schools) > 1, 'sync ไม่ลบสถาบันเดิม');

select t.login(null);
reset role;
\o
\echo 'ผ่านทุกกรณีทดสอบ'
