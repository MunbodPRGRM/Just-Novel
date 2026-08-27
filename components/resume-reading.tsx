"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DONE_PERCENT, getResume, progressStore } from "@/lib/progress";
import { useLocalStore } from "@/lib/storage";

type NovelInput = {
  slug: string;
  title: string;
  chapters: { number: number; title: string }[];
};

type Props = {
  novels: NovelInput[];
  /** แสดงชื่อเรื่องกำกับด้วยไหม — หน้ารายชื่อควรแสดง หน้าของเรื่องนั้นไม่ต้อง */
  showNovelTitle?: boolean;
};

/**
 * การ์ด "อ่านต่อ" — จุดเข้าหลักของเว็บนี้
 * อ่านจาก localStorage จึงว่างเปล่าตอน server render แล้วค่อยโผล่มาหลัง hydrate
 */
export function ResumeReading({ novels, showNovelTitle = false }: Props) {
  const progress = useLocalStore(progressStore);

  const items = useMemo(
    () =>
      novels
        .map((novel) => {
          const resume = getResume(progress, novel.slug);
          if (!resume) return null;

          const at = novel.chapters.findIndex(
            (chapter) => chapter.number === resume.chapter,
          );
          if (at === -1) return null;

          // อ่านตอนนั้นจบแล้ว → ชวนอ่านตอนถัดไปแทน
          const done = resume.percent >= DONE_PERCENT;
          const target = done ? (novel.chapters[at + 1] ?? null) : novel.chapters[at];
          if (!target) return null;

          return {
            novel,
            chapter: target,
            percent: done ? 0 : resume.percent,
            block: done ? 0 : resume.block,
            updatedAt: resume.updatedAt,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [novels, progress],
  );

  if (items.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-muted">อ่านต่อ</h2>

      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.novel.slug}>
            <Link
              href={`/novel/${item.novel.slug}/${item.chapter.number}${
                item.block > 0 ? `#block-${item.block}` : ""
              }`}
              className="block rounded-xl border border-accent/40 bg-accent-soft/50 p-4 transition-colors hover:border-accent"
            >
              {showNovelTitle ? (
                <p className="truncate text-xs text-muted">{item.novel.title}</p>
              ) : null}

              <p className="font-reading mt-0.5 leading-snug">{item.chapter.title}</p>

              <div className="mt-3 flex items-center gap-3">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                  <div className="h-full bg-accent" style={{ width: `${item.percent}%` }} />
                </div>
                <span className="shrink-0 text-xs tabular-nums text-accent">
                  {item.percent > 0 ? `${item.percent}%` : "เริ่มตอนใหม่"}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
