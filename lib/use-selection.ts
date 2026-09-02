"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  anchorFor,
  blockLength,
  caretOffsetIn,
  closestBlock,
  hasCaretApi,
  offsetWithin,
  wordAt,
  type Anchor,
} from "./selection";

/** ข้อความที่เพิ่งเลือก ยังไม่ถูกบันทึกเป็นไฮไลต์ */
export type Draft = {
  block: number;
  start: number;
  end: number;
  text: string;
  anchor: Anchor;
  /** ลากเลยขอบย่อหน้าไปแล้วถูกบีบกลับ — โน้ตหนึ่งอันอยู่ได้ในย่อหน้าเดียวเท่านั้น */
  clamped: boolean;
};

/** กดค้างนานเท่านี้ถึงเข้าโหมดเลือกข้อความ — สั้นกว่านี้จะชนกับการเลื่อนอ่าน */
const LONG_PRESS_MS = 350;
/** ขยับเกินนี้ก่อนครบเวลา = ตั้งใจเลื่อนหน้า ไม่ใช่จะเลือกข้อความ */
const MOVE_TOLERANCE = 10;
/** ลากเข้าใกล้ขอบจอเท่านี้แล้วให้หน้าไหลตาม — ย่อหน้ายาวๆ จะได้ลากจนสุดได้ */
const EDGE_ZONE = 96;
const EDGE_SPEED = 10;

/**
 * ช่วงข้อความที่ผู้ใช้เลือกอยู่ในหน้าอ่าน — มีสองทางแยกกันคนละกลไก
 *
 * จอสัมผัส: ปิด selection ของเบราว์เซอร์ทิ้ง (ดู @media (pointer: coarse) ใน globals.css)
 *   แล้วคำนวณช่วงเองจากพิกัดนิ้ว เพราะบน Android การลาก "จุดจับ" ของ selection
 *   เป็น UI ของเบราว์เซอร์ที่ไม่ส่ง event ใดๆ มาให้หน้าเว็บ (ได้แค่คำเดียวที่กดค้างครั้งแรก)
 *   และ long-press แบบ native ยังเรียกเมนู/แถบ Touch to Search ของ Chrome ขึ้นมาแข่งด้วย
 *
 * เมาส์: ใช้ selection ของเบราว์เซอร์ตามเดิม อ่านค่าตอนปล่อยปุ่ม
 */
export function useSelectionDraft(articleRef: RefObject<HTMLElement>) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [touchMode, setTouchMode] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const draftRef = useRef<Draft | null>(null);
  draftRef.current = draft;

  const clearDraft = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setDraft(null);
  }, []);

  // เลือกกลไกตามอุปกรณ์ — เบราว์เซอร์ที่ไม่มี caret API แปลงพิกัดเป็นตัวอักษรไม่ได้
  // จึงต้องถอยไปใช้ selection ของเบราว์เซอร์ (globals.css อ่าน data-native-selection ต่อ)
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const supported = hasCaretApi();

    if (!supported) document.documentElement.dataset.nativeSelection = "";

    const sync = () => setTouchMode(coarse.matches && supported);
    sync();
    coarse.addEventListener("change", sync);
    return () => coarse.removeEventListener("change", sync);
  }, []);

  // ── จอสัมผัส: กดค้างแล้วลากคลุมเอง ──────────────────────────────────
  useEffect(() => {
    const article = articleRef.current;
    if (!article || !touchMode) return;

    let block: HTMLElement | null = null;
    let origin: { x: number; y: number } | null = null;
    let point = { x: 0, y: 0 };
    /** คำที่กดค้างไว้ตอนแรก — ลากออกไปทางไหนก็ขยายจากคำนี้ */
    let seed: { start: number; end: number } | null = null;
    let active = false;
    let timer = 0;
    let frame = 0;
    let speed = 0;

    const stopDrift = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      speed = 0;
    };

    const reset = () => {
      window.clearTimeout(timer);
      stopDrift();
      block = null;
      origin = null;
      seed = null;
      active = false;
      setSelecting(false);
    };

    const update = () => {
      if (!block || !seed) return;
      const { offset, clamped } = caretOffsetIn(block, point.x, point.y);
      const start = Math.min(seed.start, offset);
      const end = Math.max(seed.end, offset);
      const text = (block.textContent ?? "").slice(start, end);
      if (text.length === 0) return;

      const next: Draft = {
        block: Number(block.dataset.block),
        start,
        end,
        text,
        anchor: anchorFor(block, start, end),
        clamped,
      };

      // ลากนิ้วยิงเหตุการณ์ถี่มาก — เรนเดอร์ใหม่เฉพาะตอนที่ช่วงเปลี่ยนจริง
      setDraft((prev) =>
        prev &&
        prev.block === next.block &&
        prev.start === next.start &&
        prev.end === next.end &&
        prev.clamped === next.clamped
          ? prev
          : next,
      );
    };

    const drift = () => {
      frame = 0;
      if (!active || speed === 0) return;
      window.scrollBy(0, speed);
      update();
      frame = window.requestAnimationFrame(drift);
    };

    const begin = () => {
      if (!block || !origin) return;
      const { offset } = caretOffsetIn(block, origin.x, origin.y);
      seed = wordAt(block.textContent ?? "", offset);
      active = true;
      setSelecting(true);
      navigator.vibrate?.(8);
      update();
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      const found =
        event.touches.length === 1 ? closestBlock(touch.target as Node) : null;

      reset();
      if (!found || !article.contains(found) || blockLength(found) === 0) return;

      block = found;
      origin = { x: touch.clientX, y: touch.clientY };
      point = { ...origin };
      timer = window.setTimeout(begin, LONG_PRESS_MS);
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      point = { x: touch.clientX, y: touch.clientY };

      if (!active) {
        if (
          origin &&
          Math.hypot(point.x - origin.x, point.y - origin.y) > MOVE_TOLERANCE
        ) {
          window.clearTimeout(timer);
          origin = null;
        }
        return;
      }

      // กันหน้าเลื่อนตามนิ้วระหว่างลากเลือก (listener ต้องเป็น passive: false)
      event.preventDefault();
      update();

      speed =
        point.y < EDGE_ZONE
          ? -EDGE_SPEED
          : point.y > window.innerHeight - EDGE_ZONE
            ? EDGE_SPEED
            : 0;
      if (speed === 0) stopDrift();
      else if (frame === 0) frame = window.requestAnimationFrame(drift);
    };

    const onTouchEnd = () => {
      const finished = active;
      reset();
      // แตะเปล่าๆ (ไม่ได้กดค้าง) ถือว่ายกเลิกช่วงที่เลือกค้างไว้
      if (!finished) setDraft(null);
    };

    // long-press บนข้อความที่ user-select: none ไม่ควรมีเมนูอยู่แล้ว — กันไว้อีกชั้น
    const onContextMenu = (event: Event) => event.preventDefault();

    article.addEventListener("touchstart", onTouchStart, { passive: true });
    article.addEventListener("touchmove", onTouchMove, { passive: false });
    article.addEventListener("touchend", onTouchEnd);
    article.addEventListener("touchcancel", onTouchEnd);
    article.addEventListener("contextmenu", onContextMenu);

    return () => {
      reset();
      article.removeEventListener("touchstart", onTouchStart);
      article.removeEventListener("touchmove", onTouchMove);
      article.removeEventListener("touchend", onTouchEnd);
      article.removeEventListener("touchcancel", onTouchEnd);
      article.removeEventListener("contextmenu", onContextMenu);
    };
  }, [articleRef, touchMode]);

  // ── เมาส์: อ่านจาก selection ของเบราว์เซอร์ ──────────────────────────
  useEffect(() => {
    if (touchMode) return;

    const read = (): Draft | null => {
      const article = articleRef.current;
      const selection = window.getSelection();
      if (!article || !selection || selection.isCollapsed || selection.rangeCount === 0) {
        return null;
      }

      const range = selection.getRangeAt(0);
      const block = closestBlock(range.startContainer);
      if (!block || !article.contains(block)) return null;

      // เลือกข้ามย่อหน้า → ตัดให้เหลือแค่ย่อหน้าแรก แล้วบอกผู้ใช้ผ่าน clamped
      const clamped = closestBlock(range.endContainer) !== block;
      const start = offsetWithin(block, range.startContainer, range.startOffset);
      const end = clamped
        ? blockLength(block)
        : offsetWithin(block, range.endContainer, range.endOffset);
      if (end <= start) return null;

      const text = (block.textContent ?? "").slice(start, end);
      if (text.trim().length === 0) return null;

      return {
        block: Number(block.dataset.block),
        start,
        end,
        text,
        anchor: anchorFor(block, start, end),
        clamped,
      };
    };

    const onPointerUp = (event: PointerEvent) => {
      // ปล่อยคลิกในแถบเครื่องมือ/กล่องโน้ตไม่นับเป็นการเลือกใหม่
      if ((event.target as HTMLElement).closest("[data-reader-ui]")) return;
      // รอให้เบราว์เซอร์สรุป selection ให้เสร็จก่อน
      window.setTimeout(() => setDraft(read()), 10);
    };

    // เผื่อเบราว์เซอร์ที่ขยาย selection ด้วย UI ของตัวเอง (ไม่มี pointerup ตามมา)
    let timer = 0;
    const onSelectionChange = () => {
      if (!draftRef.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setDraft(read()), 250);
    };

    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [articleRef, touchMode]);

  return {
    draft,
    /** ยังลากนิ้วอยู่ — ซ่อนแถบเครื่องมือไว้ก่อน ให้เห็นข้อความที่กำลังคลุม */
    selecting,
    /** ช่วงที่ต้องวาดพรีวิวเอง (จอสัมผัสไม่มีแถบสีของเบราว์เซอร์ให้ดูแล้ว) */
    preview: touchMode ? draft : null,
    clearDraft,
  };
}
