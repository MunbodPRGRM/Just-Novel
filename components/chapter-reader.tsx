"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChapterBody } from "@/components/chapter-body";
import type { Block } from "@/lib/content";
import {
  addNote,
  notesStore,
  removeNote,
  updateNote,
  HIGHLIGHT_COLORS,
  type HighlightColor,
  type Note,
} from "@/lib/notes";
import {
  DONE_PERCENT,
  getChapterProgress,
  progressStore,
  saveProgress,
} from "@/lib/progress";
import { useLocalStore } from "@/lib/storage";
import { useDismiss } from "@/lib/use-dismiss";

type Anchor = { top: number; bottom: number; left: number };

/** ข้อความที่เพิ่งลากเลือก ยังไม่ถูกบันทึก */
type Draft = { block: number; start: number; end: number; text: string; anchor: Anchor };

type Props = {
  novelSlug: string;
  chapterNumber: number;
  blocks: Block[];
};

/**
 * ส่วนที่ต้องรู้จักเบราว์เซอร์ของหน้าอ่าน — จำตำแหน่งอ่าน, ไฮไลต์, โน้ต
 * เนื้อหาเองมาจาก server component แล้วส่งลงมาเป็น props (ไม่ได้ fetch เพิ่ม)
 */
export function ChapterReader({ novelSlug, chapterNumber, blocks }: Props) {
  const articleRef = useRef<HTMLDivElement>(null);
  const notes = useLocalStore(notesStore);
  const [percent, setPercent] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<{ id: string; anchor: Anchor } | null>(null);
  const [resumeBlock, setResumeBlock] = useState<number | null>(null);

  const chapterNotes = useMemo(
    () =>
      notes.filter((note) => note.novel === novelSlug && note.chapter === chapterNumber),
    [notes, novelSlug, chapterNumber],
  );

  const scrollToBlock = useCallback((block: number) => {
    const target = articleRef.current?.querySelector<HTMLElement>(
      `[data-block="${block}"]`,
    );
    if (!target) return;
    target.scrollIntoView({ block: "start", behavior: "smooth" });
    flash(target);
  }, []);

  // ── ตำแหน่งอ่านล่าสุด ────────────────────────────────────────────────
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const elements = Array.from(article.querySelectorAll<HTMLElement>("[data-block]"));
    const latest = { block: 0, percent: 0 };
    let scrolled = false;
    let frame = 0;
    let timer = 0;

    const flush = () => {
      window.clearTimeout(timer);
      if (scrolled) saveProgress(novelSlug, chapterNumber, latest);
    };

    const measure = () => {
      frame = 0;
      // ย่อหน้าที่ขอบบนเลยใต้แถบ header ไปแล้ว = ย่อหน้าที่กำลังอ่านอยู่
      let block = 0;
      for (const element of elements) {
        if (element.getBoundingClientRect().top > 140) break;
        block = Number(element.dataset.block);
      }

      const max = document.documentElement.scrollHeight - window.innerHeight;
      const value = max <= 0 ? 100 : Math.round((window.scrollY / max) * 100);

      latest.block = block;
      latest.percent = Math.min(100, Math.max(0, value));
      setPercent(latest.percent);

      if (!scrolled) return;
      // เขียนลง localStorage ห่างๆ พอ ไม่ต้องทุกเฟรมที่เลื่อน
      window.clearTimeout(timer);
      timer = window.setTimeout(flush, 400);
    };

    const onScroll = () => {
      scrolled = true;
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("pagehide", flush);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [novelSlug, chapterNumber]);

  // เปิดตอนที่ค้างไว้ค้างกลางเรื่อง → เสนอให้กระโดดไปต่อ (ไม่เลื่อนให้เอง)
  useEffect(() => {
    if (window.location.hash || window.scrollY > 40) return;
    const saved = getChapterProgress(progressStore.read(), novelSlug, chapterNumber);
    if (!saved || saved.block <= 0 || saved.percent >= DONE_PERCENT) return;
    setResumeBlock(saved.block);
  }, [novelSlug, chapterNumber]);

  // มาจากลิงก์ #block-N (แผงโน้ต) → กระพริบให้เห็นว่าอยู่ตรงไหน
  useEffect(() => {
    const flashHash = () => {
      const id = window.location.hash.slice(1);
      if (!id.startsWith("block-")) return;
      const target = document.getElementById(id);
      if (target) flash(target);
    };

    flashHash();
    window.addEventListener("hashchange", flashHash);
    return () => window.removeEventListener("hashchange", flashHash);
  }, []);

  // ── ลากเลือกข้อความเพื่อไฮไลต์ ───────────────────────────────────────
  useEffect(() => {
    const onPointerUp = (event: PointerEvent) => {
      const article = articleRef.current;
      if (!article) return;
      // ปล่อยคลิกในแถบเครื่องมือ/กล่องโน้ตไม่นับเป็นการเลือกใหม่
      if ((event.target as HTMLElement).closest("[data-reader-ui]")) return;

      // รอให้เบราว์เซอร์สรุป selection ให้เสร็จก่อน (โดยเฉพาะบนมือถือ)
      window.setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
          setDraft(null);
          return;
        }

        const range = selection.getRangeAt(0);
        const blockEl = closestBlock(range.commonAncestorContainer);
        const text = range.toString().trim();

        if (!blockEl || !article.contains(blockEl) || text.length === 0) {
          setDraft(null);
          return;
        }

        const start = offsetWithin(blockEl, range.startContainer, range.startOffset);
        const end = offsetWithin(blockEl, range.endContainer, range.endOffset);
        if (end <= start) {
          setDraft(null);
          return;
        }

        setEditing(null);
        setDraft({
          block: Number(blockEl.dataset.block),
          start,
          end,
          text: blockEl.textContent?.slice(start, end) ?? text,
          anchor: toAnchor(range.getBoundingClientRect()),
        });
      }, 10);
    };

    document.addEventListener("pointerup", onPointerUp);
    return () => document.removeEventListener("pointerup", onPointerUp);
  }, []);

  const createNote = (color: HighlightColor, withNote: boolean) => {
    if (!draft) return;
    const note = addNote({
      novel: novelSlug,
      chapter: chapterNumber,
      block: draft.block,
      start: draft.start,
      end: draft.end,
      text: draft.text,
      note: "",
      color,
    });

    window.getSelection()?.removeAllRanges();
    setDraft(null);
    if (withNote) setEditing({ id: note.id, anchor: draft.anchor });
  };

  // คลิกไฮไลต์เดิม → เปิดกล่องแก้โน้ต/เปลี่ยนสี/ลบ
  const onArticleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const mark = (event.target as HTMLElement).closest<HTMLElement>("mark[data-note-id]");
    if (!mark) return;
    setDraft(null);
    setEditing({ id: mark.dataset.noteId!, anchor: toAnchor(mark.getBoundingClientRect()) });
  };

  const editingNote = editing
    ? (chapterNotes.find((note) => note.id === editing.id) ?? null)
    : null;

  return (
    <>
      <div
        className="fixed inset-x-0 top-14 z-20 h-[3px] bg-transparent"
        aria-hidden="true"
      >
        <div
          className="h-full bg-accent transition-[width] duration-150 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div ref={articleRef} onClick={onArticleClick}>
        <ChapterBody blocks={blocks} notes={chapterNotes} />
      </div>

      {draft ? (
        <SelectionToolbar anchor={draft.anchor} onPick={createNote} />
      ) : null}

      {editingNote && editing ? (
        <NoteEditor
          note={editingNote}
          anchor={editing.anchor}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {/* กล่องลอยย้ายขึ้นไปอยู่บนแล้ว แต่ยังหลบให้ตอนเลือกข้อความ/เขียนโน้ต —
          ล่างจอตอนนั้นมีทั้งแถบของเบราว์เซอร์เองและคีย์บอร์ดเบียดอยู่ */}
      {resumeBlock !== null && !draft && !editing ? (
        <ResumeBar
          onResume={() => {
            scrollToBlock(resumeBlock);
            setResumeBlock(null);
          }}
          onDismiss={() => setResumeBlock(null)}
        />
      ) : null}
    </>
  );
}

function SelectionToolbar({
  anchor,
  onPick,
}: {
  anchor: Anchor;
  onPick: (color: HighlightColor, withNote: boolean) => void;
}) {
  return (
    <div
      data-reader-ui
      style={anchorVars(anchor)}
      className="floating-panel flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 shadow-lg sm:gap-1 sm:px-2 sm:py-1.5"
    >
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onPick(color, false)}
          aria-label={`ไฮไลต์สี ${color}`}
          className="h-8 w-8 rounded-full border border-border transition-transform hover:scale-110 sm:h-6 sm:w-6"
          style={{ backgroundColor: `var(--hl-${color})` }}
        />
      ))}
      <span className="mx-1 h-5 w-px bg-border" />
      <button
        type="button"
        onClick={() => onPick("yellow", true)}
        className="rounded-full px-3 py-1.5 text-xs text-muted transition-colors hover:text-accent sm:px-2 sm:py-0.5"
      >
        + โน้ต
      </button>
    </div>
  );
}

function NoteEditor({
  note,
  anchor,
  onClose,
}: {
  note: Note;
  anchor: Anchor;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(note.note);

  useDismiss(ref, true, onClose);

  // เขียนกลับตอนปิดกล่อง — ไม่ต้องมีปุ่มบันทึกให้กดทุกครั้ง
  const textRef = useRef(text);
  textRef.current = text;
  useEffect(
    () => () => {
      updateNote(note.id, { note: textRef.current.trim() });
    },
    [note.id],
  );

  return (
    <div
      ref={ref}
      data-reader-ui
      style={anchorVars(anchor, 160)}
      className="floating-panel floating-panel-wide rounded-xl border border-border bg-surface p-3 shadow-lg"
    >
      <p className="line-clamp-2 border-l-2 border-accent pl-2 text-xs italic text-muted">
        {note.text}
      </p>

      {/* text-base บนมือถือ — ช่องพิมพ์ที่เล็กกว่า 16px ทำให้ iOS ซูมหน้าจอเองตอนโฟกัส */}
      <textarea
        autoFocus
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="โน้ตของฉัน…"
        rows={3}
        className="mt-3 w-full resize-none rounded-lg border border-border bg-background p-2 text-base outline-none focus:border-accent sm:text-sm"
      />

      <div className="mt-2 flex items-center gap-1">
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => updateNote(note.id, { color })}
            aria-label={`เปลี่ยนเป็นสี ${color}`}
            className={`h-7 w-7 rounded-full border transition-transform hover:scale-110 sm:h-5 sm:w-5 ${
              note.color === color ? "border-accent" : "border-border"
            }`}
            style={{ backgroundColor: `var(--hl-${color})` }}
          />
        ))}

        <button
          type="button"
          onClick={() => {
            removeNote(note.id);
            onClose();
          }}
          className="ml-auto rounded-lg px-3 py-1.5 text-xs text-muted transition-colors hover:text-accent"
        >
          ลบ
        </button>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent sm:hidden"
        >
          เสร็จ
        </button>
      </div>
    </div>
  );
}

function ResumeBar({
  onResume,
  onDismiss,
}: {
  onResume: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      data-reader-ui
      className="bottom-safe fixed inset-x-0 z-30 mx-auto flex w-[min(28rem,calc(100%-1.5rem))] items-center gap-2 rounded-full border border-border bg-surface p-1.5 pl-4 shadow-lg"
    >
      <span className="hidden flex-1 truncate text-xs text-muted xs:block">
        อ่านตอนนี้ค้างไว้
      </span>
      <button
        type="button"
        onClick={onResume}
        className="flex-1 rounded-full bg-accent-soft px-3 py-2 text-xs text-accent xs:flex-none"
      >
        อ่านต่อจากที่ค้าง
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="ปิด"
        className="h-8 w-8 shrink-0 rounded-full text-muted transition-colors hover:text-accent"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * ตำแหน่งของกล่องลอยบนจอกว้าง — วางเหนือข้อความที่เลือก ถ้าที่ด้านบนไม่พอค่อยย้ายลงล่าง
 * ส่งออกเป็นตัวแปร CSS เพราะบนมือถือ .floating-panel ไม่สนค่าพวกนี้ (ยึดล่างจอแทน)
 */
function anchorVars(anchor: Anchor, height = 56): React.CSSProperties {
  const above = anchor.top > height + 80;

  return {
    "--anchor-top": `${above ? anchor.top - 10 : anchor.bottom + 10}px`,
    "--anchor-left": `${Math.min(Math.max(anchor.left, 150), window.innerWidth - 150)}px`,
    "--anchor-shift": above ? "-100%" : "0",
  } as React.CSSProperties;
}

function toAnchor(rect: DOMRect): Anchor {
  return { top: rect.top, bottom: rect.bottom, left: rect.left + rect.width / 2 };
}

function closestBlock(node: Node): HTMLElement | null {
  const element = node instanceof HTMLElement ? node : node.parentElement;
  return element?.closest<HTMLElement>("[data-block]") ?? null;
}

/** ระยะจากต้นย่อหน้าถึงจุดหนึ่ง นับเป็นตัวอักษรของข้อความล้วน */
function offsetWithin(block: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(block);
  range.setEnd(node, offset);
  return range.toString().length;
}

function flash(element: HTMLElement) {
  element.classList.remove("block-flash");
  // บังคับให้เบราว์เซอร์เริ่ม animation ใหม่แม้กดซ้ำที่เดิม
  void element.offsetWidth;
  element.classList.add("block-flash");
}
