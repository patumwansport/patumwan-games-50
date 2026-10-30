-- อัปเดตชนิดกีฬาและรายชื่อสถาบันใน Supabase ทันทีที่บันทึกไฟล์ js/data ผ่านหน้าแอดมิน (api/cms.js เรียกด้วย token ของผู้ใช้)
-- ใช้ upsert เท่านั้น ไม่ลบแถวเดิม เพราะรายการแข่งขันอ้างอิงชนิดกีฬาอยู่

create function public.sync_reference(p_sports jsonb default null, p_schools jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles := private.require_staff();
  v_item jsonb;
  v_id integer;
  v_levels text[];
  v_sports integer := 0;
  v_schools integer := 0;
begin
  if v_profile.role not in ('admin', 'editor') then perform private.fail(403, 'บัญชีนี้ไม่มีสิทธิ์แก้ไขเนื้อหาเว็บไซต์'); end if;
  if p_sports is not null then
    if jsonb_typeof(p_sports) <> 'array' then perform private.fail(400, 'ข้อมูลชนิดกีฬาไม่ถูกต้อง'); end if;
    for v_item in select value from jsonb_array_elements(p_sports) loop
      v_id := private.json_int(v_item -> 'id');
      if jsonb_typeof(v_item) <> 'object' or v_id is null or v_id < 1 then perform private.fail(400, 'ชนิดกีฬาต้องมี id เป็นตัวเลข'); end if;
      insert into public.sports (id, code, name)
      values (v_id, private.text_field(v_item -> 'code', 'รหัสกีฬา', 20, true), private.text_field(v_item -> 'name', 'ชื่อกีฬา', 200, true))
      on conflict (id) do update set code = excluded.code, name = excluded.name;
      v_sports := v_sports + 1;
    end loop;
  end if;
  if p_schools is not null then
    if jsonb_typeof(p_schools) <> 'array' then perform private.fail(400, 'ข้อมูลสถาบันไม่ถูกต้อง'); end if;
    for v_item in select value from jsonb_array_elements(p_schools) loop
      v_id := private.json_int(v_item -> 'no');
      if jsonb_typeof(v_item) <> 'object' or v_id is null or v_id < 1 then perform private.fail(400, 'สถาบันต้องมีลำดับ (no) เป็นตัวเลข'); end if;
      if jsonb_typeof(coalesce(v_item -> 'levels', '[]')) <> 'array'
        or exists (select 1 from jsonb_array_elements(coalesce(v_item -> 'levels', '[]')) l where l not in ('"p"', '"m"')) then
        perform private.fail(400, 'ระดับของสถาบันต้องเป็น p หรือ m');
      end if;
      select coalesce(array_agg(l), '{}') into v_levels from jsonb_array_elements_text(coalesce(v_item -> 'levels', '[]')) l;
      begin
        insert into public.schools (no, name_th, name_en, abbr, thai_abbr, levels)
        values (v_id, private.text_field(v_item -> 'nameTh', 'ชื่อสถาบัน', 250, true), private.text_field(v_item -> 'nameEn', 'ชื่อภาษาอังกฤษ', 250),
          private.text_field(v_item -> 'abbr', 'อักษรย่อ', 50), private.text_field(v_item -> 'thaiAbbr', 'อักษรย่อภาษาไทย', 50), v_levels)
        on conflict (no) do update set name_th = excluded.name_th, name_en = excluded.name_en, abbr = excluded.abbr,
          thai_abbr = excluded.thai_abbr, levels = excluded.levels;
      exception when unique_violation then
        perform private.fail(409, format('ชื่อสถาบัน "%s" ซ้ำกับสถาบันอื่น', v_item ->> 'nameTh'));
      end;
      v_schools := v_schools + 1;
    end loop;
  end if;
  perform private.audit(v_profile.id, 'reference_synced', null, jsonb_build_object('sports', v_sports, 'schools', v_schools));
  return jsonb_build_object('sports', v_sports, 'schools', v_schools);
end $$;

revoke execute on function public.sync_reference(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.sync_reference(jsonb, jsonb) to authenticated;
