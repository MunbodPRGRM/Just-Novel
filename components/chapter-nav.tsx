"use client";

import Link from "next/link";
import { markChapterDone } from "@/lib/progress";

type Neighbour = { id: string; title: string } | null;

/**
 * ปุ่มนำทางท้ายตอน
 *
 * เป็น client component เพราะการกด "ตอนถัดไป" คือหลักฐานตรงที่สุดว่าอ่านจบตอนนี้แล้ว
 * จึงติ๊ก `done` ให้ตรงนั้นเลย — กันกรณีที่ตัวจับท้ายเนื้อหาใน chapter-reader.tsx พลาด
 * (เช่นกระโดดข้ามด้วยลิงก์ #block-N แล้วเลื่อนลงมากดปุ่มต่อ)
 */
export function ChapterNav({
  novelSlug,
  currentId,
  prev,
  next,
}: {
  novelSlug: string;
  currentId: string;
  prev: Neighbour;
  next: Neighbour;
}) {
  return (
    /* จอแคบวางปุ่มซ้อนกัน — สองปุ่มเรียงกันเหลือช่องละไม่ถึงครึ่งจอ ชื่อตอนโดนตัดหมด */
    <nav className="mt-12 flex flex-col items-stretch gap-3 border-t border-border pt-6 sm:mt-14 sm:flex-row">
      <ChapterLink slug={novelSlug} chapter={prev} direction="prev" className="flex-1" />
      <ChapterLink
        slug={novelSlug}
        chapter={next}
        direction="next"
        className="flex-1"
        onNavigate={() => markChapterDone(novelSlug, currentId)}
      />
    </nav>
  );
}

function ChapterLink({
  slug,
  chapter,
  direction,
  className,
  onNavigate,
}: {
  slug: string;
  chapter: Neighbour;
  direction: "prev" | "next";
  className?: string;
  onNavigate?: () => void;
}) {
  const isPrev = direction === "prev";
  const align = isPrev ? "text-left" : "text-right";

  if (!chapter) {
    return (
      <span
        className={`${className} ${align} rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted`}
      >
        {isPrev ? "ตอนแรกแล้ว" : "ตอนล่าสุดแล้ว"}
      </span>
    );
  }

  return (
    <Link
      href={`/novel/${slug}/${chapter.id}`}
      onClick={onNavigate}
      className={`${className} ${align} rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-accent`}
    >
      <span className="block text-xs text-muted">
        {isPrev ? "← ตอนก่อนหน้า" : "ตอนถัดไป →"}
      </span>
      <span className="font-reading mt-1 block truncate text-sm">{chapter.title}</span>
    </Link>
  );
}
