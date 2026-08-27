"use client";

import { useEffect } from "react";
import { applyPrefs, prefsStore } from "@/lib/prefs";
import { useLocalStore } from "@/lib/storage";

/**
 * ยึด <html> ให้ตรงกับค่าที่ตั้งไว้เสมอ (สคริปต์ใน layout ทำให้แค่ครั้งแรกตอนโหลด)
 * และตามระบบเวลาเลือกโหมด "ตามระบบ" แล้วผู้ใช้สลับธีมของเครื่อง
 */
export function PrefsEffect() {
  const prefs = useLocalStore(prefsStore);

  useEffect(() => {
    applyPrefs(prefs);
    if (prefs.theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyPrefs(prefs);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [prefs]);

  return null;
}
