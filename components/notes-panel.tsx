"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { notesStore, removeNote, type Note } from "@/lib/notes";
import { useLocalStore } from "@/lib/storage";
import { useDismiss } from "@/lib/use-dismiss";

type Props = {
  novelSlug: string;
  /** ชื่อตอนไว้จัดกลุ่มในแผง — ส่งมาจากหน้า server */
  chapters: { id: string; title: string }[];
  /** ตอนที่กำลังเปิดอยู่ (ถ้าอยู่ในหน้าอ่าน) — ไว้แยกกลุ่มบนสุด */
  currentChapter?: string;
};

/** ปุ่มบนแถบบนที่บอกจำนวนโน้ต + แผงรายการโน้ตทั้งเรื่อง */
export function NotesButton({ novelSlug, chapters, currentChapter }: Props) {
  const notes = useLocalStore(notesStore);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useDismiss(panelRef, open, close);

  const novelNotes = useMemo(
    () => notes.filter((note) => note.novel === novelSlug),
    [notes, novelSlug],
  );

  const groups = useMemo(() => {
    const titles = new Map(chapters.map((chapter) => [chapter.id, chapter.title]));
    // เรียงกลุ่มตามลำดับสารบัญที่ server ส่งมา ตอนพิเศษจึงอยู่ถูกที่เหมือนกัน
    const rank = new Map(chapters.map((chapter, at) => [chapter.id, at]));
    const byChapter = new Map<string, Note[]>();

    for (const note of novelNotes) {
      const list = byChapter.get(note.chapter);
      if (list) list.push(note);
      else byChapter.set(note.chapter, [note]);
    }

    return [...byChapter.entries()]
      .sort(
        (a, b) =>
          (rank.get(a[0]) ?? Number.MAX_SAFE_INTEGER) -
          (rank.get(b[0]) ?? Number.MAX_SAFE_INTEGER),
      )
      .map(([id, items]) => ({
        id,
        title: titles.get(id) ?? `ตอนที่ ${id}`,
        items,
      }));
  }, [novelNotes, chapters]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 shrink-0 rounded-lg border border-border px-2.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
      >
        โน้ต{novelNotes.length > 0 ? ` ${novelNotes.length}` : ""}
      </button>

      {/*
        ต้อง portal ออกไปที่ <body> เพราะปุ่มนี้อยู่ใน <header> ที่มี backdrop-blur
        — backdrop-filter ทำให้ตัวมันกลายเป็นกรอบอ้างอิงของลูกที่เป็น position: fixed
        แผงจะถูกบีบให้สูงเท่าแถบบนแทนที่จะเต็มจอ
      */}
      {open
        ? createPortal(
            <div className="fixed inset-0 z-40 bg-black/30">
              <div
                ref={panelRef}
                className="ml-auto flex h-full w-[min(24rem,100%)] flex-col border-l border-border bg-surface"
              >
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
                  <h2 className="text-sm font-semibold">โน้ตและไฮไลต์</h2>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="ปิด"
                    className="-mr-2 h-10 w-10 rounded-lg text-muted transition-colors hover:text-accent"
                  >
                    ✕
                  </button>
                </div>

                {/* overscroll-contain กันไม่ให้เลื่อนสุดแล้วไปลากหน้าที่อยู่ข้างหลังต่อบนมือถือ */}
                <div className="pb-safe flex-1 overflow-y-auto overscroll-contain px-4 pt-4">
                  {groups.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs leading-relaxed text-muted">
                      ยังไม่มีโน้ตในเรื่องนี้
                      <br />
                      ลากเลือกข้อความในหน้าอ่านเพื่อไฮไลต์หรือเขียนโน้ต
                    </p>
                  ) : (
                    groups.map((group) => (
                      <section key={group.id} className="mb-6 last:mb-0">
                        <h3 className="mb-2 text-xs font-medium text-muted">
                          {group.title}
                          {group.id === currentChapter ? " · ตอนนี้" : ""}
                        </h3>

                        <ul className="space-y-2">
                          {group.items.map((note) => (
                            <li
                              key={note.id}
                              className="rounded-lg border border-border p-3 text-sm"
                            >
                              <Link
                                href={`/novel/${novelSlug}/${note.chapter}#block-${note.block}`}
                                onClick={close}
                                className="block"
                              >
                                <span
                                  className="line-clamp-3 rounded px-1 text-xs italic leading-relaxed"
                                  style={{ backgroundColor: `var(--hl-${note.color})` }}
                                >
                                  {note.text}
                                </span>
                                {note.note ? (
                                  <span className="mt-2 block text-xs leading-relaxed text-muted">
                                    {note.note}
                                  </span>
                                ) : null}
                              </Link>

                              <button
                                type="button"
                                onClick={() => removeNote(note.id)}
                                className="mt-1 py-1.5 text-xs text-muted transition-colors hover:text-accent"
                              >
                                ลบ
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
