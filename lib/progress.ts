"use client";

import { toChapterId } from "./chapter-id";
import { clampNumber, createLocalStore } from "./storage";
import { PROGRESS_KEY } from "./storage-keys";

/**
 * ตำแหน่งอ่านล่าสุด — ฟีเจอร์หลักของเว็บนี้
 *
 * เก็บสองระดับ: ต่อ "ตอน" (ไว้กลับมาอ่านค้าง + ติ๊กว่าอ่านจบแล้วในสารบัญ)
 * และ `lastChapter` ต่อ "เรื่อง" (ไว้ทำปุ่มอ่านต่อในหน้ารายชื่อ/หน้าเรื่อง)
 *
 * `block` คือ index ของย่อหน้าจาก lib/content.ts — คงที่ตราบใดที่ไฟล์ .md ไม่ถูกแก้
 */
export type ChapterProgress = {
  block: number;
  /** 0–100 ของความสูงหน้าที่เลื่อนผ่านไปแล้ว */
  percent: number;
  /**
   * อ่านจบตอนนี้แล้ว — ติดแล้วติดเลย ไม่ลดกลับเองเวลาเปิดตอนเดิมซ้ำ
   * ตั้งตอนเลื่อนถึงท้ายเนื้อหา หรือตอนกดปุ่ม "ตอนถัดไป" (ดู components/chapter-nav.tsx)
   * ปลดได้ทางเดียวคือกดเองในสารบัญ หรือล้างประวัติทั้งเรื่อง
   */
  done: boolean;
  updatedAt: number;
};

export type NovelProgress = {
  /** id ตอนล่าสุดที่เปิดอ่าน ("51" หรือ "51.5-1") */
  lastChapter: string;
  chapters: Record<string, ChapterProgress>;
};

export type ProgressMap = Record<string, NovelProgress>;

/**
 * เกณฑ์เดิมที่ใช้เดาว่าอ่านจบจาก % ที่เลื่อน — เหลือไว้แปลงข้อมูลเก่าเท่านั้น
 * ของใหม่ใช้ธง `done` ตรงๆ เพราะ % ท้ายหน้าไม่แน่นอน (footer กินที่ + แถบ URL มือถือยุบ/ขยาย)
 */
const LEGACY_DONE_PERCENT = 96;

const EMPTY: ProgressMap = {};

function parseChapterProgress(raw: unknown): ChapterProgress | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Partial<ChapterProgress>;
  if (typeof data.block !== "number" && typeof data.percent !== "number") return null;

  const percent = Math.round(clampNumber(data.percent, 0, 100, 0));

  return {
    block: Math.max(0, Math.round(clampNumber(data.block, 0, 100000, 0))),
    percent,
    // ข้อมูลที่บันทึกไว้ก่อนมีธงนี้ ให้ใช้เกณฑ์ % แบบเดิมตัดสินครั้งสุดท้าย
    done: typeof data.done === "boolean" ? data.done : percent >= LEGACY_DONE_PERCENT,
    updatedAt: clampNumber(data.updatedAt, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

function parseProgress(raw: unknown): ProgressMap {
  if (typeof raw !== "object" || raw === null) return EMPTY;
  const map: ProgressMap = {};

  for (const [slug, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "object" || value === null) continue;
    const novel = value as Partial<NovelProgress>;
    const chapters: Record<string, ChapterProgress> = {};

    for (const [number, entry] of Object.entries(novel.chapters ?? {})) {
      const parsed = parseChapterProgress(entry);
      if (parsed) chapters[number] = parsed;
    }

    map[slug] = {
      lastChapter: toChapterId(novel.lastChapter),
      chapters,
    };
  }

  return map;
}

export const progressStore = createLocalStore<ProgressMap>(
  PROGRESS_KEY,
  EMPTY,
  parseProgress,
);

const BLANK: ChapterProgress = { block: 0, percent: 0, done: false, updatedAt: 0 };

export function saveProgress(
  novelSlug: string,
  chapter: string,
  entry: { block: number; percent: number },
) {
  progressStore.set((prev) => {
    const novel = prev[novelSlug] ?? { lastChapter: chapter, chapters: {} };
    const saved = novel.chapters[chapter] ?? BLANK;

    return {
      ...prev,
      [novelSlug]: {
        lastChapter: chapter,
        chapters: {
          ...novel.chapters,
          // `done` เดิมต้องไม่ถูกลบทิ้ง — เปิดตอนที่อ่านจบแล้วซ้ำก็ยังนับว่าอ่านแล้ว
          [chapter]: { ...entry, done: saved.done, updatedAt: Date.now() },
        },
      },
    };
  });
}

/** ติ๊กว่าอ่านจบตอนนี้แล้ว โดยไม่แตะตำแหน่งที่ค้างไว้ */
export function markChapterDone(novelSlug: string, chapter: string) {
  setChapterDone(novelSlug, chapter, true);
}

/**
 * ติ๊ก/ปลดติ๊กเอง (ปุ่มในสารบัญ)
 * ปลดติ๊ก = ถือว่ายังไม่เคยอ่าน จึงล้างตำแหน่งที่ค้างของตอนนั้นไปด้วย
 */
export function setChapterDone(novelSlug: string, chapter: string, done: boolean) {
  progressStore.set((prev) => {
    const novel = prev[novelSlug] ?? { lastChapter: chapter, chapters: {} };
    const saved = novel.chapters[chapter] ?? BLANK;
    if (saved.done === done && (done || saved.percent === 0)) return prev;

    const next: ChapterProgress = done
      ? { ...saved, done: true, updatedAt: Date.now() }
      : { ...BLANK, updatedAt: Date.now() };

    return {
      ...prev,
      [novelSlug]: {
        ...novel,
        chapters: { ...novel.chapters, [chapter]: next },
      },
    };
  });
}

/**
 * ติ๊กรวดหลายตอนพร้อมกัน — ไว้ backfill ตอนที่อ่านไปแล้วก่อนมีฟีเจอร์นี้
 * `chapters` ต้องเรียงตามลำดับสารบัญ ตัวสุดท้ายจะกลายเป็นตอนล่าสุดที่อ่าน
 */
export function markDoneUpTo(novelSlug: string, chapters: string[]) {
  if (chapters.length === 0) return;

  progressStore.set((prev) => {
    const novel = prev[novelSlug] ?? { lastChapter: chapters[chapters.length - 1], chapters: {} };
    const updated = { ...novel.chapters };
    const now = Date.now();

    for (const chapter of chapters) {
      const saved = updated[chapter] ?? BLANK;
      updated[chapter] = { ...saved, done: true, updatedAt: now };
    }

    return {
      ...prev,
      [novelSlug]: {
        lastChapter: chapters[chapters.length - 1],
        chapters: updated,
      },
    };
  });
}

export function clearNovelProgress(novelSlug: string) {
  progressStore.set((prev) => {
    if (!(novelSlug in prev)) return prev;
    const next = { ...prev };
    delete next[novelSlug];
    return next;
  });
}

export function getChapterProgress(
  map: ProgressMap,
  novelSlug: string,
  chapter: string,
): ChapterProgress | null {
  return map[novelSlug]?.chapters[chapter] ?? null;
}

export function isChapterDone(
  map: ProgressMap,
  novelSlug: string,
  chapter: string,
): boolean {
  return map[novelSlug]?.chapters[chapter]?.done ?? false;
}

/** เคยอ่านเรื่องนี้ไปแล้วบ้างไหม — ใช้ตัดสินว่าจะโชว์ปุ่มล้างประวัติหรือเปล่า */
export function hasNovelProgress(map: ProgressMap, novelSlug: string): boolean {
  const novel = map[novelSlug];
  return novel !== undefined && Object.keys(novel.chapters).length > 0;
}

export type Resume = ChapterProgress & { chapter: string };

/** ตอนที่ค้างไว้ล่าสุดของเรื่องหนึ่ง — null ถ้ายังไม่เคยเปิดอ่าน */
export function getResume(map: ProgressMap, novelSlug: string): Resume | null {
  const novel = map[novelSlug];
  if (!novel) return null;

  const entry = novel.chapters[novel.lastChapter];
  if (!entry) return null;

  return { ...entry, chapter: novel.lastChapter };
}
