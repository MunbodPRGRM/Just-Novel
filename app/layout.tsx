import type { Metadata } from "next";
import { Maitree, Sarabun } from "next/font/google";
import "./globals.css";

/** ฟอนต์เนื้อเรื่อง — serif ไทยที่ออกแบบมาสำหรับอ่านยาวๆ */
const reading = Maitree({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-reading",
  display: "swap",
});

/** ฟอนต์ UI — sans ไทยสำหรับเมนู ปุ่ม สารบัญ */
const ui = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${reading.variable} ${ui.variable}`}>
      <body className="min-h-dvh bg-background font-ui text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
