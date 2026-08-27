import type { NovelStatus } from "@/lib/content";

/**
 * ป้ายภาษาไทยของ metadata นิยาย
 * แยกจาก lib/content.ts เพราะไฟล์นั้น import `node:fs` — client component ใน
 * phase ถัดไปจะ import ไม่ได้
 */
export const STATUS_LABEL: Record<NovelStatus, string> = {
  ongoing: "กำลังแปล",
  completed: "จบแล้ว",
  hiatus: "พักไว้ก่อน",
};

/** เวลาอ่านโดยประมาณ — ภาษาไทยอ่านราว 300 ตัวอักษร/นาที */
export function readingMinutes(charCount: number): number {
  return Math.max(1, Math.round(charCount / 300));
}
