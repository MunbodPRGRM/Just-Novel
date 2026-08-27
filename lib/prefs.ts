"use client";

import { clampNumber, createLocalStore } from "./storage";
import { PREFS_KEY } from "./storage-keys";

/** ค่าที่ปรับได้ในแถบตั้งค่าการอ่าน — เก็บใน localStorage คีย์เดียว */
export type ThemeMode = "system" | "light" | "dark";
export type ReadingFont = "serif" | "sans";

export type Prefs = {
  theme: ThemeMode;
  /** ขนาดตัวอักษรเนื้อเรื่อง (px) */
  fontSize: number;
  /** line-height เนื้อเรื่อง (เท่าของขนาดตัวอักษร) */
  lineHeight: number;
  font: ReadingFont;
};

export const DEFAULT_PREFS: Prefs = {
  theme: "system",
  fontSize: 19,
  lineHeight: 2,
  font: "serif",
};

export const FONT_SIZE = { min: 15, max: 28, step: 1 };
export const LINE_HEIGHT = { min: 1.5, max: 2.6, step: 0.1 };

const THEMES: ThemeMode[] = ["system", "light", "dark"];

function parsePrefs(raw: unknown): Prefs {
  if (typeof raw !== "object" || raw === null) return DEFAULT_PREFS;
  const data = raw as Partial<Prefs>;

  return {
    theme: THEMES.includes(data.theme as ThemeMode) ? (data.theme as ThemeMode) : "system",
    fontSize: Math.round(
      clampNumber(data.fontSize, FONT_SIZE.min, FONT_SIZE.max, DEFAULT_PREFS.fontSize),
    ),
    lineHeight:
      Math.round(
        clampNumber(
          data.lineHeight,
          LINE_HEIGHT.min,
          LINE_HEIGHT.max,
          DEFAULT_PREFS.lineHeight,
        ) * 10,
      ) / 10,
    font: data.font === "sans" ? "sans" : "serif",
  };
}

export const prefsStore = createLocalStore<Prefs>(PREFS_KEY, DEFAULT_PREFS, parsePrefs);

export function setPrefs(patch: Partial<Prefs>) {
  prefsStore.set((prev) => parsePrefs({ ...prev, ...patch }));
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** เขียนค่าลง <html> — ทุกอย่างในเว็บอิงตัวแปร CSS ชุดนี้ */
export function applyPrefs(prefs: Prefs) {
  const root = document.documentElement;
  const theme = resolveTheme(prefs.theme);

  root.classList.toggle("dark", theme === "dark");
  root.style.setProperty("color-scheme", theme);
  root.style.setProperty("--reading-size", `${prefs.fontSize}px`);
  root.style.setProperty("--reading-leading", String(prefs.lineHeight));
  root.dataset.readingFont = prefs.font;
  syncThemeColor();
}

/**
 * ให้แถบ URL ของเบราว์เซอร์มือถือเป็นสีเดียวกับพื้นหลังเว็บ
 * อ่านค่าจาก --background ที่เพิ่งถูกสลับ จะได้ไม่ต้องเขียนโค้ดสีซ้ำอีกที่
 */
export function syncThemeColor() {
  const root = document.documentElement;
  const color = getComputedStyle(root).getPropertyValue("--background").trim();
  if (!color) return;

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
}
