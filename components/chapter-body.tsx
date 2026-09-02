"use client";

import { useMemo } from "react";
import type { Block } from "@/lib/content";
import {
  DRAFT_NOTE_ID,
  draftNote,
  notesByBlock,
  splitBlockText,
  type Note,
} from "@/lib/notes";

type Preview = { block: number; start: number; end: number };

/**
 * เนื้อเรื่องหนึ่งตอน
 *
 * `data-block` คือ index ที่คงที่ของบล็อก — ใช้เป็นสมอของ reading progress
 * กับ notes/highlights (อ่านค่าจาก DOM ได้โดยไม่ต้องส่ง state ลงมา)
 * `id="block-N"` ให้ลิงก์ #block-N จากแผงโน้ตกระโดดมาได้ตรงๆ
 *
 * `preview` คือช่วงที่กำลังลากเลือกอยู่แต่ยังไม่บันทึก — วาดเองเพราะจอสัมผัสปิด
 * selection ของเบราว์เซอร์ทิ้งไปแล้ว (ดู lib/use-selection.ts)
 *
 * ตัวเนื้อหาเป็นข้อความล้วน (ไม่มี **ตัวหนา** / ลิงก์ ในไฟล์ .md ปัจจุบัน)
 * จึงเรนเดอร์เป็น text ตรงๆ แล้วหั่นเป็นช่วงตามไฮไลต์
 * ถ้าภายหลังมี inline markdown ค่อยเพิ่ม parser ตรงนี้
 */
export function ChapterBody({
  blocks,
  notes,
  preview,
}: {
  blocks: Block[];
  notes: Note[];
  preview?: Preview | null;
}) {
  const byBlock = useMemo(
    () => notesByBlock(preview ? [...notes, draftNote(preview)] : notes),
    [notes, preview],
  );

  return (
    <div className="reading-body mt-8">
      {blocks.map((block) => {
        if (block.type === "divider") {
          return <hr key={block.index} id={`block-${block.index}`} data-block={block.index} />;
        }

        const content = <BlockText text={block.text} notes={byBlock.get(block.index)} />;

        if (block.type === "heading") {
          // h1 ในไฟล์ถูกยกไปเป็นชื่อตอนแล้ว หัวข้อในเนื้อหาจึงเริ่มที่ h2
          const level = Math.min(Math.max(block.level ?? 2, 2), 6);
          const Tag = `h${level}` as "h2" | "h3" | "h4" | "h5" | "h6";

          return (
            <Tag key={block.index} id={`block-${block.index}`} data-block={block.index}>
              {content}
            </Tag>
          );
        }

        return (
          <p key={block.index} id={`block-${block.index}`} data-block={block.index}>
            {content}
          </p>
        );
      })}
    </div>
  );
}

function BlockText({ text, notes }: { text: string; notes?: Note[] }) {
  if (!notes || notes.length === 0) return <>{text}</>;

  return (
    <>
      {splitBlockText(text, notes).map((segment) =>
        segment.note?.id === DRAFT_NOTE_ID ? (
          // ไม่มี data-note-id เพราะยังไม่ใช่โน้ตจริง — กันไม่ให้แตะแล้วเปิดกล่องแก้โน้ต
          <mark key={segment.key} data-draft>
            {segment.text}
          </mark>
        ) : segment.note ? (
          <mark
            key={segment.key}
            data-note-id={segment.note.id}
            data-color={segment.note.color}
            data-note={segment.note.note.length > 0}
          >
            {segment.text}
          </mark>
        ) : (
          <span key={segment.key}>{segment.text}</span>
        ),
      )}
    </>
  );
}
