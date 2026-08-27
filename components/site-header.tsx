import Link from "next/link";

type Props = {
  /** ลิงก์ย้อนกลับทางซ้าย — หน้าแรกไม่ต้องมี */
  back?: { href: string; label: string };
  /** ข้อความมุมขวา เช่น "ตอนที่ 3 / 10" */
  aside?: React.ReactNode;
};

/** แถบบนสุดที่ใช้ร่วมกันทุกหน้า — ติดขอบบนไว้เพื่อกดย้อนกลับได้ตลอดขณะอ่าน */
export function SiteHeader({ back, aside }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-5">
        {back ? (
          <Link
            href={back.href}
            className="-ml-2 truncate rounded px-2 py-1 text-sm text-muted transition-colors hover:text-accent"
          >
            ← {back.label}
          </Link>
        ) : (
          <Link href="/" className="-ml-2 rounded px-2 py-1 font-reading font-semibold">
            Just Novel
          </Link>
        )}

        {aside ? (
          <span className="shrink-0 text-xs tabular-nums text-muted">{aside}</span>
        ) : null}
      </div>
    </header>
  );
}
