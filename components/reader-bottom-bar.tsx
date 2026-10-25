"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isChapterDone, markChapterDone, progressStore } from "@/lib/progress";
import { useAutoHideChrome } from "@/lib/reader-chrome";
import { useLocalStore } from "@/lib/storage";

type ChapterLink = { id: string; title: string; isExtra: boolean };
type Neighbour = { id: string; title: string } | null;

type Props = {
  novelSlug: string;
  currentId: string;
  chapters: ChapterLink[];
  prev: Neighbour;
  next: Neighbour;
};

/**
 * แถบล่างของหน้าอ่าน: ตอนก่อนหน้า · เลือกตอน · ตอนถัดไป
 * ซ่อน/แสดงพร้อมแถบบนผ่าน lib/reader-chrome.ts (ตัวนี้เป็นคนติดตั้งตัวจับการเลื่อนด้วย)
 */
export function ReaderBottomBar({ novelSlug, currentId, chapters, prev, next }: Props) {
  const [open, setOpen] = useState(false);
  const position = chapters.findIndex((chapter) => chapter.id === currentId) + 1;

  useAutoHideChrome(currentId);

  return (
    <>
      <nav
        data-chrome-bar="bottom"
        aria-label="นำทางตอน"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid h-14 max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 sm:px-3">
          <StepLink slug={novelSlug} chapter={prev} direction="prev" />

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label="เลือกตอน"
            className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs tabular-nums text-muted transition-colors hover:border-accent hover:text-accent"
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
              <path d="M4 6h12M4 10h12M4 14h12" />
            </svg>
            {position} / {chapters.length}
          </button>

          <StepLink
            slug={novelSlug}
            chapter={next}
            direction="next"
            // กดไปตอนถัดไป = อ่านตอนนี้จบแล้ว (เหมือนปุ่มท้ายตอนใน chapter-nav.tsx)
            onNavigate={() => markChapterDone(novelSlug, currentId)}
          />
        </div>
      </nav>

      {open ? (
        <ChapterSheet
          novelSlug={novelSlug}
          currentId={currentId}
          chapters={chapters}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function StepLink({
  slug,
  chapter,
  direction,
  onNavigate,
}: {
  slug: string;
  chapter: Neighbour;
  direction: "prev" | "next";
  onNavigate?: () => void;
}) {
  const isPrev = direction === "prev";
  const label = isPrev ? "← ก่อนหน้า" : "ถัดไป →";
  const base = `flex h-10 items-center rounded-lg px-3 text-sm ${
    isPrev ? "justify-self-start" : "justify-self-end"
  }`;

  if (!chapter) {
    return (
      <span aria-disabled="true" className={`${base} text-muted opacity-40`}>
        {label}
      </span>
    );
  }

  return (
    <Link
      href={`/novel/${slug}/${chapter.id}`}
      onClick={onNavigate}
      title={chapter.title}
      className={`${base} text-foreground transition-colors hover:bg-accent-soft hover:text-accent`}
    >
      {label}
    </Link>
  );
}

/** แผ่นสารบัญที่เลื่อนขึ้นจากล่างจอ — เปิดมาเลื่อนไปที่ตอนปัจจุบันให้เลย */
function ChapterSheet({
  novelSlug,
  currentId,
  chapters,
  onClose,
}: {
  novelSlug: string;
  currentId: string;
  chapters: ChapterLink[];
  onClose: () => void;
}) {
  const progress = useLocalStore(progressStore);
  const currentRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center" });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // portal ออกไปที่ <body> — แถบล่างมี backdrop-blur ซึ่งทำให้ลูกที่เป็น fixed ถูกบีบอยู่ในแถบ
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="เลือกตอน"
        data-reader-ui
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[75vh] w-full max-w-3xl flex-col rounded-t-2xl border border-b-0 border-border bg-surface shadow-lg"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <h2 className="text-sm font-semibold">
            สารบัญ <span className="font-normal text-muted">· {chapters.length} ตอน</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="-mr-2 h-10 w-10 rounded-lg text-muted transition-colors hover:text-accent"
          >
            ✕
          </button>
        </div>

        {/* overscroll-contain กันเลื่อนสุดแล้วไปลากหน้าที่อยู่ข้างหลังต่อ */}
        <ol className="pb-safe flex-1 divide-y divide-border overflow-y-auto overscroll-contain">
          {chapters.map((chapter) => {
            const current = chapter.id === currentId;
            const done = isChapterDone(progress, novelSlug, chapter.id);

            return (
              <li key={chapter.id}>
                <Link
                  ref={current ? currentRef : undefined}
                  href={`/novel/${novelSlug}/${chapter.id}`}
                  onClick={onClose}
                  aria-current={current ? "page" : undefined}
                  className={`flex items-baseline gap-3 px-4 py-3 transition-colors hover:bg-accent-soft ${
                    current ? "bg-accent-soft" : ""
                  }`}
                >
                  <span
                    className={`shrink-0 tabular-nums text-muted ${
                      chapter.isExtra ? "text-xs" : "w-8 text-sm"
                    }`}
                  >
                    {chapter.id}
                  </span>
                  <span
                    className={`min-w-0 flex-1 font-reading leading-snug ${
                      current ? "text-accent" : done ? "text-muted" : ""
                    }`}
                  >
                    {chapter.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {current ? "กำลังอ่าน" : done ? "อ่านแล้ว" : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </div>,
    document.body,
  );
}
