/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    /*
      หน้าอื่นอ่านไฟล์ .md ตอน build (static) แต่ /search อ่านตอน request
      — path ถูกประกอบขึ้นตอนรัน Next จึงมองไม่เห็นว่าต้องแพ็กโฟลเดอร์ content/
      ไปด้วย ต้องบอกตรงๆ ไม่งั้นบน Vercel จะค้นแล้วไม่เจออะไรเลย
    */
    outputFileTracingIncludes: {
      "/search": ["./content/**/*"],
    },
  },
};

export default nextConfig;
