"use client";

import { useSyncExternalStore } from "react";

/**
 * store เล็กๆ ที่ผูกกับ localStorage หนึ่งคีย์
 *
 * ทั้งเว็บไม่มี DB/auth (ดู CLAUDE.md) — ข้อมูลผู้ใช้ทุกอย่างอยู่ที่เบราว์เซอร์เครื่องนั้น
 * ใช้ `useSyncExternalStore` เพื่อให้ทุก component ที่อ่านคีย์เดียวกันเห็นค่าตรงกัน
 * และ sync ข้ามแท็บผ่าน `storage` event ได้ด้วย
 *
 * ค่าตอน server render / hydrate ครั้งแรกคือ `fallback` เสมอ แล้วค่อยสลับเป็นค่าจริง
 * หลัง subscribe — กัน hydration mismatch โดยไม่ต้องใส่ mounted flag รายจุด
 */

type Listener = () => void;

export type LocalStore<T> = {
  subscribe: (listener: Listener) => () => void;
  get: () => T;
  getServer: () => T;
  /** อ่านค่าปัจจุบันนอกรอบ render (ใช้ใน effect เท่านั้น) — บังคับ hydrate ให้ด้วย */
  read: () => T;
  set: (next: T | ((prev: T) => T)) => void;
};

export function createLocalStore<T>(
  key: string,
  fallback: T,
  parse: (raw: unknown) => T,
): LocalStore<T> {
  let snapshot = fallback;
  let hydrated = false;
  const listeners = new Set<Listener>();

  const emit = () => {
    for (const listener of listeners) listener();
  };

  function readFromDisk(): T {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return parse(JSON.parse(raw));
    } catch {
      // โหมดส่วนตัว/โควตาเต็ม/ข้อมูลพัง — ถอยไปใช้ค่าเริ่มต้นแทนการพังทั้งหน้า
      return fallback;
    }
  }

  function hydrate() {
    if (hydrated || typeof window === "undefined") return;
    hydrated = true;
    snapshot = readFromDisk();
    window.addEventListener("storage", (event) => {
      if (event.key !== null && event.key !== key) return;
      snapshot = readFromDisk();
      emit();
    });
  }

  return {
    subscribe(listener) {
      hydrate();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get: () => snapshot,
    getServer: () => fallback,
    read: () => {
      hydrate();
      return snapshot;
    },
    set(next) {
      hydrate();
      const value =
        typeof next === "function" ? (next as (prev: T) => T)(snapshot) : next;
      if (Object.is(value, snapshot)) return;
      snapshot = value;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // เขียนไม่ได้ก็ยังให้ใช้งานต่อในแท็บนี้ได้ แค่ไม่ถูกจำไว้
      }
      emit();
    },
  };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer);
}

/** ตัวเลขที่มาจาก localStorage เชื่อไม่ได้ — บีบให้อยู่ในช่วงที่ UI รองรับเสมอ */
export function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
