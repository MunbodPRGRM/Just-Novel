"use client";

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
  updatedAt: number;
};

export type NovelProgress = {
  lastChapter: number;
  chapters: Record<string, ChapterProgress>;
};

export type ProgressMap = Record<string, NovelProgress>;

/** เลื่อนถึงระดับนี้ถือว่าอ่านจบตอนแล้ว (ท้ายตอนมีปุ่มนำทางกินที่อยู่) */
export const DONE_PERCENT = 96;

const EMPTY: ProgressMap = {};

function parseChapterProgress(raw: unknown): ChapterProgress | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Partial<ChapterProgress>;
  if (typeof data.block !== "number" && typeof data.percent !== "number") return null;

  return {
    block: Math.max(0, Math.round(clampNumber(data.block, 0, 100000, 0))),
    percent: Math.round(clampNumber(data.percent, 0, 100, 0)),
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
      lastChapter: Math.round(clampNumber(novel.lastChapter, 0, 100000, 0)),
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

export function saveProgress(
  novelSlug: string,
  chapter: number,
  entry: { block: number; percent: number },
) {
  progressStore.set((prev) => {
    const novel = prev[novelSlug] ?? { lastChapter: chapter, chapters: {} };
    return {
      ...prev,
      [novelSlug]: {
        lastChapter: chapter,
        chapters: {
          ...novel.chapters,
          [chapter]: { ...entry, updatedAt: Date.now() },
        },
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
  chapter: number,
): ChapterProgress | null {
  return map[novelSlug]?.chapters[chapter] ?? null;
}

export type Resume = ChapterProgress & { chapter: number };

/** ตอนที่ค้างไว้ล่าสุดของเรื่องหนึ่ง — null ถ้ายังไม่เคยเปิดอ่าน */
export function getResume(map: ProgressMap, novelSlug: string): Resume | null {
  const novel = map[novelSlug];
  if (!novel) return null;

  const entry = novel.chapters[novel.lastChapter];
  if (!entry) return null;

  return { ...entry, chapter: novel.lastChapter };
}
