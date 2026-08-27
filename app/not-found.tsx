import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="font-reading text-xl font-semibold">ไม่พบหน้านี้</h1>
        <p className="mt-3 text-sm text-muted">
          นิยายหรือตอนที่เรียกอาจถูกย้าย/ลบไปแล้ว
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg border border-border bg-surface px-5 py-2.5 text-sm transition-colors hover:border-accent"
        >
          กลับไปคลังนิยาย
        </Link>
      </main>
    </>
  );
}
