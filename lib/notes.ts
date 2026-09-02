"use client";

import { compareChapterId, toChapterId } from "./chapter-id";
import { clampNumber, createLocalStore } from "./storage";
import { NOTES_KEY } from "./storage-keys";

/**
 * ไฮไลต์และโน้ตส่วนตัว
 *
 * ผูกกับตำแหน่งด้วย (ตอน, index ของย่อหน้า, ช่วงตัวอักษรในย่อหน้านั้น)
 * ไม่ได้ผูกกับ DOM — ถ้าไฟล์ .md ถูกแก้จนย่อหน้าเลื่อน ไฮไลต์อาจเพี้ยนได้
 * แต่จะไม่หายไปและไม่ทำให้หน้าอ่านพัง (ช่วงถูกบีบให้อยู่ในความยาวจริงเสมอ)
 */
export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export type Note = {
  id: string;
  novel: string;
  /** id ตอนจาก lib/content.ts ("51" หรือ "51.5-1") */
  chapter: string;
  block: number;
  /** ช่วงตัวอักษรในย่อหน้า (นับจากข้อความล้วน ไม่รวมมาร์กอัป) */
  start: number;
  end: number;
  /** ข้อความที่ไฮไลต์ไว้ — เก็บไว้แสดงในแผงโน้ตโดยไม่ต้องอ่านไฟล์ */
  text: string;
  /** โน้ตที่พิมพ์เอง — ว่างได้ ถือเป็นไฮไลต์เปล่าๆ */
  note: string;
  color: HighlightColor;
  createdAt: number;
};

const EMPTY: Note[] = [];

function parseNote(raw: unknown): Note | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Partial<Note>;

  if (typeof data.id !== "string" || typeof data.novel !== "string") return null;
  const start = Math.max(0, Math.round(clampNumber(data.start, 0, 100000, 0)));
  const end = Math.max(0, Math.round(clampNumber(data.end, 0, 100000, 0)));
  if (end <= start) return null;

  return {
    id: data.id,
    novel: data.novel,
    chapter: toChapterId(data.chapter),
    block: Math.round(clampNumber(data.block, 0, 100000, 0)),
    start,
    end,
    text: typeof data.text === "string" ? data.text : "",
    note: typeof data.note === "string" ? data.note : "",
    color: HIGHLIGHT_COLORS.includes(data.color as HighlightColor)
      ? (data.color as HighlightColor)
      : "yellow",
    createdAt: clampNumber(data.createdAt, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

function parseNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return EMPTY;
  return raw
    .map(parseNote)
    .filter((note): note is Note => note !== null)
    .sort(byPosition);
}

function byPosition(a: Note, b: Note) {
  if (a.chapter !== b.chapter) return compareChapterId(a.chapter, b.chapter);
  if (a.block !== b.block) return a.block - b.block;
  return a.start - b.start;
}

export const notesStore = createLocalStore<Note[]>(NOTES_KEY, EMPTY, parseNotes);

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addNote(input: Omit<Note, "id" | "createdAt">): Note {
  const note: Note = { ...input, id: createId(), createdAt: Date.now() };
  notesStore.set((prev) => [...prev, note].sort(byPosition));
  return note;
}

export function updateNote(id: string, patch: Partial<Pick<Note, "note" | "color">>) {
  notesStore.set((prev) =>
    prev.map((note) => (note.id === id ? { ...note, ...patch } : note)),
  );
}

export function removeNote(id: string) {
  notesStore.set((prev) => prev.filter((note) => note.id !== id));
}

/** ไฮไลต์ในย่อหน้าเดียว เรียงตามตำแหน่ง — ใช้ตอนเรนเดอร์เนื้อเรื่อง */
export function notesByBlock(notes: Note[]): Map<number, Note[]> {
  const map = new Map<number, Note[]>();
  for (const note of notes) {
    const list = map.get(note.block);
    if (list) list.push(note);
    else map.set(note.block, [note]);
  }
  return map;
}

export const DRAFT_NOTE_ID = "__draft__";

/**
 * ช่วงที่กำลังลากเลือกอยู่ ปลอมเป็นโน้ตหนึ่งอัน
 *
 * จอสัมผัสปิด selection ของเบราว์เซอร์ไปแล้ว (ดู lib/use-selection.ts) จึงไม่มีแถบสี
 * ให้ดูว่าคลุมถึงไหน — ยัดช่วงนี้เข้า splitBlockText เพื่อวาดพรีวิวด้วยกลไกเดียวกับไฮไลต์จริง
 * `createdAt` สูงสุดเพื่อให้ทับไฮไลต์เดิมที่ซ้อนกันอยู่เสมอ
 */
export function draftNote(range: { block: number; start: number; end: number }): Note {
  return {
    id: DRAFT_NOTE_ID,
    novel: "",
    chapter: "",
    block: range.block,
    start: range.start,
    end: range.end,
    text: "",
    note: "",
    color: "yellow",
    createdAt: Number.MAX_SAFE_INTEGER,
  };
}

export type Segment = { key: string; text: string; note: Note | null };

/**
 * ตัดข้อความย่อหน้าเป็นช่วงๆ ตามไฮไลต์
 * ช่วงที่ทับกันจะถูกหั่นตามขอบเขตทุกจุด แล้วให้ไฮไลต์ที่สร้างทีหลังชนะ
 */
export function splitBlockText(text: string, notes: Note[]): Segment[] {
  if (notes.length === 0) return [{ key: "full", text, note: null }];

  const clamp = (value: number) => Math.min(text.length, Math.max(0, value));
  const bounds = new Set<number>([0, text.length]);
  for (const note of notes) {
    bounds.add(clamp(note.start));
    bounds.add(clamp(note.end));
  }

  const points = [...bounds].sort((a, b) => a - b);
  const segments: Segment[] = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    if (end <= start) continue;

    const covering = notes.filter(
      (note) => clamp(note.start) <= start && clamp(note.end) >= end,
    );
    const winner = covering.reduce<Note | null>(
      (best, note) => (best === null || note.createdAt >= best.createdAt ? note : best),
      null,
    );

    segments.push({ key: `${start}-${end}`, text: text.slice(start, end), note: winner });
  }

  return segments;
}
