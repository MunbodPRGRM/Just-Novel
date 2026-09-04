"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Props = {
  /** ปกทั้งหมดของเรื่อง — เลือกมาแสดงหนึ่งใบ เปลี่ยนใบใหม่วันละครั้ง */
  covers: string[];
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  /** ใช้ทั้งกับรูปจริงและกล่องเปล่าตอนยังไม่ได้เลือก — ขนาดต้องตรงกัน ไม่งั้นหน้ากระตุก */
  className?: string;
};

/** เลขวันตามปฏิทินของเครื่อง (นับจาก 1970-01-01) — เปลี่ยนค่าตอนเที่ยงคืนของผู้อ่าน */
function dayNumber(now: Date) {
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
}

/** hash ลิสต์ปก เพื่อให้นิยายแต่ละเรื่องเริ่มไล่ปกจากคนละใบ ไม่ขยับพร้อมกันหมด */
function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * ปกนิยายที่เปลี่ยนใบใหม่วันละครั้ง (ไล่วนตามลำดับในลิสต์)
 *
 * ต้องเลือกหลัง mount เท่านั้น: หน้าที่ใช้ปกถูก build เป็น static ไว้ล่วงหน้า
 * ถ้าเลือกฝั่ง server ปกจะถูกแช่ไว้ตั้งแต่วันที่ build (ไม่สลับเลย) และถ้าเลือกตอน
 * render แรกฝั่ง client ก็จะไม่ตรงกับ HTML ที่ hydrate → hydration mismatch
 * ระหว่างนั้นวางกล่องเปล่าขนาดเท่าปกไว้แทน — ดีกว่าโชว์ใบแรกแล้วค่อยเด้งเปลี่ยน
 *
 * ผลพลอยได้: ในวันเดียวกันทุกหน้าโชว์ปกใบเดียวกัน (หน้ารายชื่อ = หน้านิยาย)
 */
export function NovelCover({ covers, alt, width, height, sizes, priority, className }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  // array เปลี่ยน reference ทุก render — ผูก effect กับ "เนื้อลิสต์" แทนตัว array
  const pool = covers.join("\n");

  useEffect(() => {
    const list = pool.split("\n").filter(Boolean);
    if (list.length === 0) return;
    setSrc(list[(dayNumber(new Date()) + hash(pool)) % list.length]);
  }, [pool]);

  if (covers.length === 0) return null;

  if (!src) return <div aria-hidden className={`${className ?? ""} bg-border`} />;

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}
