import Link from "next/link";
import { ReadingSettings } from "@/components/reading-settings";

type Props = {
  /** ลิงก์ย้อนกลับทางซ้าย — หน้าแรกไม่ต้องมี */
  back?: { href: string; label: string };
  /** ข้อความมุมขวา เช่น "ตอนที่ 3 / 10" */
  aside?: React.ReactNode;
  /** ปุ่มเพิ่มเติมก่อนปุ่มตั้งค่า เช่น ปุ่มโน้ตในหน้าอ่าน */
  actions?: React.ReactNode;
  /** อยู่ในนิยายเรื่องไหน — ให้ปุ่มค้นหาเริ่มจากขอบเขตเรื่องนั้น */
  searchNovel?: string;
  /** ซ่อนปุ่มค้นหา (หน้าค้นหาเองไม่ต้องมี) */
  hideSearch?: boolean;
};

/** แถบบนสุดที่ใช้ร่วมกันทุกหน้า — ติดขอบบนไว้เพื่อกดย้อนกลับได้ตลอดขณะอ่าน */
export function SiteHeader({ back, aside, actions, searchNovel, hideSearch }: Props) {
  const searchHref = searchNovel
    ? `/search?novel=${encodeURIComponent(searchNovel)}`
    : "/search";

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

        <div className="flex shrink-0 items-center gap-2">
          {aside ? (
            <span className="text-xs tabular-nums text-muted">{aside}</span>
          ) : null}
          {actions}
          {hideSearch ? null : (
            <Link
              href={searchHref}
              aria-label="ค้นหาเนื้อหา"
              title="ค้นหาเนื้อหา"
              className="rounded-lg border border-border px-2.5 py-1.5 text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <svg
                viewBox="0 0 20 20"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="9" cy="9" r="5.5" />
                <path d="M13 13l4 4" />
              </svg>
            </Link>
          )}
          <ReadingSettings />
        </div>
      </div>
    </header>
  );
}
