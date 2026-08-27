"use client";

import Link from "next/link";
import { useLocalStore } from "@/lib/storage";
import { readingMinutes } from "@/lib/labels";
import { DONE_PERCENT, getChapterProgress, progressStore } from "@/lib/progress";

type Chapter = { number: number; title: string; charCount: number };

/** สารบัญ + สถานะการอ่านของแต่ละตอน (อ่านจบแล้ว / ค้างไว้กี่ %) */
export function ChapterList({
  novelSlug,
  chapters,
}: {
  novelSlug: string;
  chapters: Chapter[];
}) {
  const progress = useLocalStore(progressStore);

  return (
    <ol className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {chapters.map((chapter) => {
        const saved = getChapterProgress(progress, novelSlug, chapter.number);
        const done = saved !== null && saved.percent >= DONE_PERCENT;

        return (
          <li key={chapter.number}>
            <Link
              href={`/novel/${novelSlug}/${chapter.number}`}
              className="flex items-baseline gap-4 px-5 py-4 transition-colors hover:bg-accent-soft"
            >
              <span className="w-8 shrink-0 text-sm tabular-nums text-muted">
                {chapter.number}
              </span>

              <span className="flex-1 leading-snug">
                <span className={`font-reading ${done ? "text-muted" : ""}`}>
                  {chapter.title}
                </span>
                {saved && !done && saved.percent > 0 ? (
                  <span className="mt-1 block text-xs tabular-nums text-accent">
                    อ่านค้างไว้ {saved.percent}%
                  </span>
                ) : null}
              </span>

              <span className="shrink-0 text-xs tabular-nums text-muted">
                {done ? "อ่านแล้ว" : `${readingMinutes(chapter.charCount)} นาที`}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
