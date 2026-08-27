"use client";

import { useCallback, useRef, useState } from "react";
import {
  DEFAULT_PREFS,
  FONT_SIZE,
  LINE_HEIGHT,
  prefsStore,
  setPrefs,
  type ReadingFont,
  type ThemeMode,
} from "@/lib/prefs";
import { useLocalStore } from "@/lib/storage";
import { useDismiss } from "@/lib/use-dismiss";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "สว่าง" },
  { value: "dark", label: "มืด" },
  { value: "system", label: "ตามระบบ" },
];

/** ป้ายตัวเลือกเขียนด้วยฟอนต์ของตัวเอง — เห็นความต่างหัวตัวอักษรก่อนกดเลือก */
const FONT_OPTIONS: { value: ReadingFont; label: string; className: string }[] = [
  { value: "serif", label: "มีหัว", className: "font-reading" },
  { value: "sans", label: "ไม่มีหัว", className: "font-loopless" },
];

/** ปุ่ม "ก" บนแถบบน — เปิดแผงปรับธีม/ขนาดตัวอักษรของการอ่าน */
export function ReadingSettings() {
  const prefs = useLocalStore(prefsStore);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useDismiss(wrapRef, open, useCallback(() => setOpen(false), []));

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="ตั้งค่าการอ่าน"
        className="h-9 rounded-lg border border-border px-2.5 text-sm transition-colors hover:border-accent hover:text-accent"
      >
        <span className="font-reading">ก</span>
        <span className="font-reading text-xs">ก</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-surface p-4 shadow-lg">
          <Field label="โหมดแสดงผล">
            <Segmented
              options={THEME_OPTIONS}
              value={prefs.theme}
              onChange={(theme) => setPrefs({ theme })}
            />
          </Field>

          <Field label="ขนาดตัวอักษร" value={`${prefs.fontSize}px`}>
            <Stepper
              value={prefs.fontSize}
              {...FONT_SIZE}
              onChange={(fontSize) => setPrefs({ fontSize })}
              format={(value) => `${value}px`}
            />
          </Field>

          <Field label="ระยะห่างบรรทัด" value={prefs.lineHeight.toFixed(1)}>
            <Stepper
              value={prefs.lineHeight}
              {...LINE_HEIGHT}
              onChange={(lineHeight) => setPrefs({ lineHeight })}
              format={(value) => value.toFixed(1)}
            />
          </Field>

          <Field label="ฟอนต์เนื้อเรื่อง">
            <Segmented
              options={FONT_OPTIONS}
              value={prefs.font}
              onChange={(font) => setPrefs({ font })}
            />
          </Field>

          <button
            type="button"
            onClick={() => setPrefs(DEFAULT_PREFS)}
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs text-muted transition-colors hover:text-accent"
          >
            คืนค่าเริ่มต้น
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        {value ? <span className="text-xs tabular-nums text-muted">{value}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; className?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-border p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          className={`flex-1 rounded-md px-2 py-2 text-xs transition-colors ${
            option.className ?? ""
          } ${
            option.value === value
              ? "bg-accent-soft text-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
}) {
  // ค่าทศนิยม (line-height) ต้องปัดกันเศษลอย เช่น 1.9999999
  const shift = (delta: number) =>
    onChange(Math.round(Math.min(max, Math.max(min, value + delta)) * 10) / 10);

  return (
    <div className="flex items-center gap-2">
      <StepButton label="ลด" onClick={() => shift(-step)} disabled={value <= min}>
        −
      </StepButton>
      <div className="flex-1 overflow-hidden rounded-full bg-border">
        <div
          className="h-1 bg-accent"
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
      </div>
      <StepButton label="เพิ่ม" onClick={() => shift(step)} disabled={value >= max}>
        +
      </StepButton>
      <span className="sr-only">{format(value)}</span>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="h-8 w-8 shrink-0 rounded-md border border-border text-sm transition-colors hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
    >
      {children}
    </button>
  );
}
