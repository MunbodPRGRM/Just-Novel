/**
 * id ของตอน — สตริงที่ดึงจากท้ายชื่อไฟล์ (`ตอนที่51.md` → "51")
 *
 * ตอนพิเศษที่คั่นระหว่างตอนหลักใช้ชื่อไฟล์แบบ `ตอนที่51.5-1.md` → "51.5-1"
 * ซึ่งเรียงอยู่ระหว่าง "51" กับ "52" เองเพราะเทียบกันทีละระดับ
 *
 * ไฟล์นี้ไม่มี "use client" และไม่แตะ fs — ใช้ได้ทั้งฝั่ง server (lib/content.ts)
 * และฝั่ง browser (lib/progress.ts, lib/notes.ts ที่ใช้ id เป็นคีย์ localStorage)
 */

/** เลขตอนท้ายชื่อไฟล์ รับได้ทั้ง "ตอนที่51" และ "ตอนที่51.5-1" */
const CHAPTER_ID_IN_NAME = /(\d+(?:[.-]\d+)*)$/;

/** ระดับของ id เป็นตัวเลข — "51.5-1" → [51, 5, 1], ชื่อที่ไม่มีเลขได้ [] */
export function chapterOrder(id: string): number[] {
  if (!CHAPTER_ID_IN_NAME.test(id)) return [];
  return id.split(/[.-]/).map(Number);
}

/** id จากชื่อไฟล์ .md — ถ้าไม่มีเลขในชื่อก็ใช้ชื่อไฟล์ทั้งอันเป็น id */
export function chapterIdFromFile(file: string): string {
  const base = file.replace(/\.md$/i, "");
  return base.match(CHAPTER_ID_IN_NAME)?.[1] ?? base;
}

/** ระดับที่สั้นกว่ามาก่อนเมื่อขึ้นต้นเหมือนกัน — [51] < [51, 5, 1] < [52] */
export function compareChapterOrder(a: number[], b: number[]): number {
  // ชื่อที่ไม่มีเลข (order ว่าง) ถูกดันไปท้ายสารบัญ
  if (a.length === 0 || b.length === 0) return b.length - a.length;

  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? -1) - (b[i] ?? -1);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** เทียบ id สองอันโดยตรง — ใช้เรียงข้อมูลที่อ่านจาก localStorage */
export function compareChapterId(a: string, b: string): number {
  const order = compareChapterOrder(chapterOrder(a), chapterOrder(b));
  if (order !== 0) return order;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * id ตอนที่มาจาก localStorage — คืน "" ถ้าใช้ไม่ได้ (จะหาตอนไม่เจอแล้วถูกข้ามไปเอง)
 * ข้อมูลเก่าเก็บเป็นตัวเลข (51) แปลงเป็นสตริง ("51") ให้ตรงกับ id ตอนปกติ
 */
export function toChapterId(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 32);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}
