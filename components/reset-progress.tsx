"use client";

import { useState } from "react";
import { clearNovelProgress, hasNovelProgress, progressStore } from "@/lib/progress";
import { useLocalStore } from "@/lib/storage";

/**
 * ล้างตำแหน่งอ่านของเรื่องหนึ่ง (เริ่มอ่านใหม่ตั้งแต่ต้น)
 *
 * ถามยืนยันในที่ตรงนั้นแทน `window.confirm` เพราะ dialog ของเบราว์เซอร์
 * ค้างทั้งหน้าและหน้าตาไม่เข้ากับธีมของเว็บ
 * ไม่แตะโน้ต/ไฮไลต์ — ของพวกนั้นลบทีละอันจากแผงโน้ตได้อยู่แล้ว
 */
export function ResetProgress({ novelSlug }: { novelSlug: string }) {
  const progress = useLocalStore(progressStore);
  const [confirming, setConfirming] = useState(false);

  if (!hasNovelProgress(progress, novelSlug)) return null;

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-6 text-xs text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
      >
        ล้างประวัติการอ่านเรื่องนี้
      </button>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3 text-xs">
      <span className="text-muted">
        ล้างตำแหน่งที่อ่านค้างทั้งเรื่องเลยไหม? (โน้ตและไฮไลต์ยังอยู่เหมือนเดิม)
      </span>

      <button
        type="button"
        onClick={() => {
          clearNovelProgress(novelSlug);
          setConfirming(false);
        }}
        className="ml-auto rounded-lg border border-accent bg-accent-soft px-3 py-1.5 text-accent"
      >
        ล้าง
      </button>

      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-lg border border-border px-3 py-1.5 text-muted transition-colors hover:text-foreground"
      >
        ยกเลิก
      </button>
    </div>
  );
}
