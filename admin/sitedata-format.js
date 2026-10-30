// รูปแบบไฟล์ js/data/*.js ที่หน้า /admin อ่านและเขียนได้
//   // คำอธิบาย (comment ช่วงต้นไฟล์ เก็บไว้ให้เหมือนเดิมทุกครั้งที่บันทึก)
//   window.SiteData = window.SiteData || {};
//   window.SiteData.<ชื่อ> = <ข้อมูลแบบ JSON>;
// ใช้ทั้งในเบราว์เซอร์ (window.SiteDataFormat) และ Node (require)
(/* เริ่มต้นหลังบ้านและจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ function (root) {
  const HEADER_KEY = '_header';
  const INIT = 'window.SiteData = window.SiteData || {};';
  const ASSIGN = /^window\.SiteData\.([A-Za-z_$][\w$]*) = /;

  // แปลงข้อความไฟล์เป็นข้อมูลที่ตัวแก้ไขใช้
  function parse(text) {
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    const start = lines.findIndex(/* ทำงานต่อภายใน lines.findIndex ของหลังบ้าน */ (l) => l.startsWith('window.'));
    const header = lines.slice(0, start < 0 ? lines.length : start).filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหลังบ้าน */ (l) => l.startsWith('//'));
    const data = { [HEADER_KEY]: header.join('\n') };
    let key = null;
    let buf = [];
    const flush = /* จัดการ flush ภายในหลังบ้าน */ () => {
      if (!key) return;
      const src = buf.join('\n').trim().replace(/;$/, '');
      try {
        data[key] = JSON.parse(src);
      } catch (err) {
        throw new Error(`อ่านข้อมูล SiteData.${key} ไม่ได้ (ต้องเป็นรูปแบบ JSON): ${err.message}`);
      }
    };
    for (const line of lines.slice(start < 0 ? lines.length : start)) {
      const m = line.match(ASSIGN);
      if (m) {
        flush();
        key = m[1];
        buf = [line.slice(m[0].length)];
      } else if (key && !/^\s*\/\//.test(line)) {
        // สตริงใน JSON ขึ้นบรรทัดใหม่ไม่ได้ บรรทัดที่ขึ้นต้นด้วย // จึงเป็น comment เสมอ
        buf.push(line);
      }
    }
    flush();
    return data;
  }

  // แปลงข้อมูลกลับเป็นข้อความไฟล์
  function stringify(data) {
    const { [HEADER_KEY]: header = '', ...rest } = data || {};
    const body = Object.entries(rest)
      .filter(/* เลือกเฉพาะรายการที่ตรงตามเงื่อนไขในหลังบ้าน */ ([key]) => ASSIGN.test(`window.SiteData.${key} = `))
      .map(/* แปลงข้อมูลแต่ละรายการเป็นค่าหรือส่วนแสดงผลในหลังบ้าน */ ([key, value]) => `window.SiteData.${key} = ${JSON.stringify(value ?? null, null, 2)};\n`)
      .join('\n');
    return `${header ? `${header}\n` : ''}${INIT}\n\n${body}`;
  }

  const api = { parse, stringify, HEADER_KEY };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SiteDataFormat = api;
})(typeof window !== 'undefined' ? window : globalThis);
