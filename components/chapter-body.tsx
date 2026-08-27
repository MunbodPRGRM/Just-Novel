import type { Block } from "@/lib/content";

/**
 * เนื้อเรื่องหนึ่งตอน
 *
 * `data-block` คือ index ที่คงที่ของบล็อก — phase 3 จะใช้จุดนี้เป็นสมอของ
 * reading progress กับ notes/highlights (อ่านค่าจาก DOM ได้โดยไม่ต้องส่ง state ลงมา)
 *
 * ตัวเนื้อหาเป็นข้อความล้วน (ไม่มี **ตัวหนา** / ลิงก์ ในไฟล์ .md ปัจจุบัน)
 * จึงเรนเดอร์เป็น text ตรงๆ — ถ้าภายหลังมี inline markdown ค่อยเพิ่ม parser ตรงนี้
 */
export function ChapterBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="reading-body font-reading mt-8">
      {blocks.map((block) => {
        if (block.type === "divider") {
          return <hr key={block.index} data-block={block.index} />;
        }

        if (block.type === "heading") {
          // h1 ในไฟล์ถูกยกไปเป็นชื่อตอนแล้ว หัวข้อในเนื้อหาจึงเริ่มที่ h2
          const level = Math.min(Math.max(block.level ?? 2, 2), 6);
          const Tag = `h${level}` as "h2" | "h3" | "h4" | "h5" | "h6";

          return (
            <Tag key={block.index} data-block={block.index}>
              {block.text}
            </Tag>
          );
        }

        return (
          <p key={block.index} data-block={block.index}>
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
