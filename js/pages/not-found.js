// หน้า 404
(/* เริ่มต้นหน้าnot-foundและจำกัดตัวแปรให้อยู่ภายในส่วนนี้ */ function () {
  document.getElementById('app').innerHTML = `
    <div class="py-20 text-center">
      <p class="text-8xl font-bold text-brand-600">404</p>
      <p class="mt-4 text-xl text-neutral-900 dark:text-gray-300">ไม่พบหน้าที่คุณต้องการ</p>
      <a href="index.html" class="mt-8 inline-block rounded-full bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700">กลับหน้าแรก</a>
    </div>`;
})();
