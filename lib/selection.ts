"use client";

/**
 * ตัวช่วยแปลงไปมาระหว่าง "ตำแหน่งตัวอักษรในย่อหน้า" (หน่วยที่ lib/notes.ts เก็บ)
 * กับสิ่งที่ DOM รู้จัก — node/offset และพิกัดบนจอ
 *
 * แยกออกมาจาก chapter-reader เพราะบนมือถือเราไม่ใช้ selection ของเบราว์เซอร์แล้ว
 * (ดู lib/use-selection.ts) จึงต้องคำนวณช่วงที่เลือกเองทั้งหมด
 */

export function closestBlock(node: Node | null): HTMLElement | null {
  const element = node instanceof HTMLElement ? node : (node?.parentElement ?? null);
  return element?.closest<HTMLElement>("[data-block]") ?? null;
}

export function blockLength(block: HTMLElement): number {
  return block.textContent?.length ?? 0;
}

/** ระยะจากต้นย่อหน้าถึงจุดหนึ่ง นับเป็นตัวอักษรของข้อความล้วน */
export function offsetWithin(block: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(block);
  range.setEnd(node, offset);
  return range.toString().length;
}

/**
 * ตรงข้ามกับ offsetWithin — ช่วงตัวอักษร → DOM Range
 * ใช้วัดว่าช่วงที่เลือกอยู่ตรงไหนบนจอ (ย่อหน้าถูกหั่นเป็นหลาย text node ตามไฮไลต์)
 */
export function rangeWithin(
  block: HTMLElement,
  start: number,
  end: number,
): Range | null {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let seen = 0;
  let opened = false;

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent?.length ?? 0;

    if (!opened && seen + length >= start) {
      range.setStart(node, start - seen);
      opened = true;
    }
    if (opened && seen + length >= end) {
      range.setEnd(node, end - seen);
      return range;
    }
    seen += length;
  }

  return null;
}

type CaretDocument = Document & {
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
  caretPositionFromPoint?: (
    x: number,
    y: number,
  ) => { offsetNode: Node; offset: number } | null;
};

/** Chrome/Safari กับ Firefox ใช้ API คนละตัวกันสำหรับ "พิกัด → ตำแหน่งตัวอักษร" */
export function hasCaretApi(): boolean {
  if (typeof document === "undefined") return false;
  return "caretRangeFromPoint" in document || "caretPositionFromPoint" in document;
}

function caretNodeAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as CaretDocument;

  if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y);
    return range ? { node: range.startContainer, offset: range.startOffset } : null;
  }
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y);
    return position ? { node: position.offsetNode, offset: position.offset } : null;
  }
  return null;
}

/**
 * พิกัดบนจอ → ตำแหน่งตัวอักษรในย่อหน้าที่กำหนด
 *
 * ลากออกนอกย่อหน้าจะถูกบีบให้อยู่ที่หัวหรือท้ายย่อหน้าแทน (คืน `clamped: true`)
 * — โน้ตหนึ่งอันผูกกับย่อหน้าเดียวเสมอ (ดู Note ใน lib/notes.ts) จึงเลือกข้ามย่อหน้าไม่ได้
 */
export function caretOffsetIn(
  block: HTMLElement,
  x: number,
  y: number,
): { offset: number; clamped: boolean } {
  const point = caretNodeAt(
    Math.min(Math.max(x, 0), window.innerWidth - 1),
    Math.min(Math.max(y, 0), window.innerHeight - 1),
  );

  if (point && block.contains(point.node)) {
    return { offset: offsetWithin(block, point.node, point.offset), clamped: false };
  }

  const rect = block.getBoundingClientRect();
  return { offset: y < rect.top ? 0 : blockLength(block), clamped: true };
}

let segmenter: Intl.Segmenter | null | undefined;

function wordSegmenter(): Intl.Segmenter | null {
  if (segmenter === undefined) {
    // ภาษาไทยไม่มีช่องว่างคั่นคำ — ตัดคำเองไม่ได้ ต้องพึ่งตัวตัดคำของเบราว์เซอร์
    segmenter = "Segmenter" in Intl ? new Intl.Segmenter("th", { granularity: "word" }) : null;
  }
  return segmenter;
}

/** ขยายจุดหนึ่งให้กลายเป็นคำ — ใช้เป็นช่วงตั้งต้นตอนกดค้าง ก่อนผู้ใช้จะลากขยายเอง */
export function wordAt(text: string, offset: number): { start: number; end: number } {
  const point = Math.min(Math.max(offset, 0), Math.max(0, text.length - 1));
  const instance = wordSegmenter();

  if (instance) {
    for (const segment of instance.segment(text)) {
      const end = segment.index + segment.segment.length;
      if (point < end) return { start: segment.index, end };
    }
  }

  // ไม่มี Intl.Segmenter — ถอยไปใช้ช่องว่างเป็นขอบคำ (พอไหวกับข้อความอังกฤษ)
  let start = point;
  let end = point + 1;
  while (start > 0 && !/\s/.test(text[start - 1])) start -= 1;
  while (end < text.length && !/\s/.test(text[end])) end += 1;

  return { start, end: Math.max(end, start + 1) };
}

/** ตำแหน่งของช่วงที่เลือกบนจอ — กล่องลอยบนจอกว้างใช้ค่านี้เกาะ */
export type Anchor = { top: number; bottom: number; left: number };

export function toAnchor(rect: DOMRect): Anchor {
  return { top: rect.top, bottom: rect.bottom, left: rect.left + rect.width / 2 };
}

export function anchorFor(block: HTMLElement, start: number, end: number): Anchor {
  const range = rangeWithin(block, start, end);
  return toAnchor((range ?? block).getBoundingClientRect());
}
