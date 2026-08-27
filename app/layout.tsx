import type { Metadata, Viewport } from "next";
import { Maitree, Noto_Sans_Thai, Sarabun } from "next/font/google";
import { PrefsBootScript } from "@/components/prefs-boot-script";
import { PrefsEffect } from "@/components/prefs-effect";
import "./globals.css";

/** ฟอนต์เนื้อเรื่อง — serif ไทยที่ออกแบบมาสำหรับอ่านยาวๆ */
const reading = Maitree({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-reading",
  display: "swap",
});

/** ฟอนต์ UI — sans ไทยสำหรับเมนู ปุ่ม สารบัญ (เป็นฟอนต์ "มีหัว") */
const ui = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

/**
 * ฟอนต์เนื้อเรื่องแบบ "ไม่มีหัว" — ต้องเป็นฟอนต์ที่ไร้หัวจริงๆ
 * (Maitree กับ Sarabun เป็นฟอนต์มีหัวทั้งคู่ สลับกันเองได้แค่เส้นหนาบางต่างกัน)
 * `preload: false` เพราะเป็นตัวเลือก — โหลดเฉพาะตอนที่ผู้ใช้เลือกใช้จริง
 */
const loopless = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-loopless",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "Just Novel",
    template: "%s · Just Novel",
  },
  description: "คลังนิยายส่วนตัว",
  // เว็บส่วนตัว ไม่ต้องการให้ search engine เก็บ index
  robots: { index: false, follow: false },
};

/**
 * `viewportFit: "cover"` ให้ env(safe-area-inset-*) มีค่าจริงบนมือถือจอบาก
 * — แถบลอยล่างจอ (เลือกข้อความ / อ่านต่อ) ถึงจะหลบแถบ home indicator ได้
 * สี theme-color ตั้งจริงตอนรัน (ดู lib/prefs.ts) เพราะธีมมาจาก localStorage ไม่ใช่ระบบเสมอ
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // สคริปต์ตั้งค่าธีมแก้ class/style ของ <html> ก่อน hydrate เป็นเรื่องปกติ
    <html
      lang="th"
      className={`${reading.variable} ${ui.variable} ${loopless.variable}`}
      data-reading-font="serif"
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background font-ui text-foreground antialiased">
        <PrefsBootScript />
        <PrefsEffect />
        {children}
      </body>
    </html>
  );
}
