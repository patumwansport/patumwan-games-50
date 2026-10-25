// ตั้งค่า Tailwind (Play CDN) ให้ใช้ฟอนต์และสีของงาน
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['srinakharinwirot', 'Sarabun', 'Noto Sans Thai', 'Noto Sans', 'sans-serif'],
      },
      colors: {
        // ชุดสีปทุมวันเกมส์: Hero (น้ำเงิน) และ Support (ชมพู)
        brand: {
          50: '#eef1f9',
          100: '#dde3f2',
          200: '#b9c4e3',
          300: '#8b9bcc',
          400: '#6378b8',
          500: '#4d65a7', // Navy Soft
          600: '#2e438a', // Hero
          700: '#263877',
          800: '#202f5b', // Navy Deep
          900: '#1d2865',
        },
        pink: {
          50: '#fef1f5',
          100: '#fde3ea',
          200: '#fbc9d3',
          300: '#f7a5ae', // Pink Soft
          400: '#f27397',
          500: '#ee4784', // Support
          600: '#d93d78',
          700: '#c5336a', // Pink Deep
          800: '#a12a57',
          900: '#7f2245',
        },
        // โทนเทาเข้ม/ดำ เปลี่ยนเป็นน้ำเงินเข้ม (ตัวอักษรโหมดสว่าง และพื้นหลังโหมดมืด)
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5373',
          700: '#36406a',
          800: '#202f5b', // Navy Deep
          900: '#18234a',
          950: '#111a3a',
        },
        black: '#111a3a',
        gold: '#eab308',
        silver: '#9ca3af',
        bronze: '#ea580c',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-left': { from: { opacity: 0, transform: 'translateX(40px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-right': { from: { opacity: 0, transform: 'translateX(-40px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(30px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-down': { from: { opacity: 0, transform: 'translateY(-30px)' }, to: { opacity: 1, transform: 'none' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        'fade-in': 'fade-in .7s ease both',
        'slide-left': 'slide-left .7s ease both',
        'slide-right': 'slide-right .7s ease both',
        'slide-up': 'slide-up .7s ease both',
        'slide-down': 'slide-down .7s ease both',
        marquee: 'marquee 100s linear infinite',
      },
    },
  },
};
