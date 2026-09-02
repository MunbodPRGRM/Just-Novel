"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocalStore } from "@/lib/storage";
import { readingMinutes } from "@/lib/labels";
import {
  getChapterProgress,
  markDoneUpTo,
  progressStore,
  setChapterDone,
} from "@/lib/progress";

type Chapter = { id: string; isExtra: boolean; title: string; charCount: number };

/** สารบัญ + สถานะการอ่านของแต่ละตอน (อ่านจบแล้ว / ค้างไว้กี่ %) */
export function ChapterList({
  novelSlug,
  chapters,
}: {
  novelSlug: string;
  chapters: Chapter[];
}) {
  const progress = useLocalStore(progressStore);
  /** ตอนที่เพิ่งกดติ๊กเอง แล้วยังมีตอนก่อนหน้าค้างอยู่ — ถามว่าจะติ๊กรวดให้ไหม */
  const [backfill, setBackfill] = useState<{ at: number; ids: string[] } | null>(null);

  const toggle = (index: number, done: boolean) => {
    const chapter = chapters[index];
    setChapterDone(novelSlug, chapter.id, !done);
    setBackfill(null);
    if (done) return;

    // อ่านเรียงตอนกันอยู่แล้ว การติ๊กตอนกลางเรื่องมักแปลว่าตอนก่อนหน้าก็อ่านจบไปหมดแล้ว
    const pending = chapters
      .slice(0, index)
      .filter((item) => !getChapterProgress(progress, novelSlug, item.id)?.done)
      .map((item) => item.id);

    if (pending.length > 0) setBackfill({ at: index, ids: pending });
  };

  return (
    <ol className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {chapters.map((chapter, index) => {
        const saved = getChapterProgress(progress, novelSlug, chapter.id);
        const done = saved?.done ?? false;

        return (
          <li key={chapter.id}>
            <div className="flex items-stretch">
              <Link
                href={`/novel/${novelSlug}/${chapter.id}`}
                className="flex min-w-0 flex-1 items-baseline gap-3 py-4 pl-4 pr-2 transition-colors hover:bg-accent-soft sm:gap-4 sm:pl-5"
              >
                {/* ตอนพิเศษมี id ยาว (51.5-1) ใส่ในช่องเลขตอนกว้างคงที่ไม่พอ */}
                <span
                  className={`shrink-0 tabular-nums text-muted ${
                    chapter.isExtra ? "text-xs" : "w-6 text-sm sm:w-8"
                  }`}
                >
                  {chapter.id}
                </span>

                <span className="min-w-0 flex-1 leading-snug">
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

              {/* อยู่นอก <a> — ปุ่มซ้อนในลิงก์ไม่ได้ */}
              <button
                type="button"
                onClick={() => toggle(index, done)}
                aria-pressed={done}
                aria-label={
                  done ? `ยกเลิกอ่านแล้ว ${chapter.title}` : `ทำเครื่องหมายว่าอ่านแล้ว ${chapter.title}`
                }
                className="group flex w-11 shrink-0 items-center justify-center transition-colors hover:bg-accent-soft sm:w-12"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] leading-none transition-colors ${
                    done
                      ? "border-accent bg-accent text-background"
                      : "border-border text-transparent group-hover:border-accent"
                  }`}
                >
                  ✓
                </span>
              </button>
            </div>

            {backfill?.at === index ? (
              <div className="flex flex-wrap items-center gap-3 border-t border-border bg-accent-soft/40 px-4 py-3 text-xs sm:px-5">
                <span className="text-muted">
                  ติ๊กตอนก่อนหน้าที่ยังไม่ได้อ่านให้ด้วยไหม? ({backfill.ids.length} ตอน)
                </span>

                <button
                  type="button"
                  onClick={() => {
                    markDoneUpTo(novelSlug, [...backfill.ids, chapter.id]);
                    setBackfill(null);
                  }}
                  className="ml-auto rounded-lg border border-accent bg-accent-soft px-3 py-1.5 text-accent"
                >
                  ติ๊กทั้งหมด
                </button>

                <button
                  type="button"
                  onClick={() => setBackfill(null)}
                  className="rounded-lg border border-border px-3 py-1.5 text-muted transition-colors hover:text-foreground"
                >
                  ไม่ต้อง
                </button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
