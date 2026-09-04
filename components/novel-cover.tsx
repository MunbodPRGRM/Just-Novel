"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Props = {
  /** ปกทั้งหมดของเรื่อง — สุ่มมาแสดงหนึ่งใบต่อการเข้าหน้าหนึ่งครั้ง */
  covers: string[];
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  /** ใช้ทั้งกับรูปจริงและกล่องเปล่าตอนยังไม่ได้สุ่ม — ขนาดต้องตรงกัน ไม่งั้นหน้ากระตุก */
  className?: string;
};

/**
 * ปกนิยายที่สุ่มใหม่ทุกครั้งที่เข้าหน้า
 *
 * ต้องสุ่มหลัง mount เท่านั้น: หน้าที่ใช้ปกถูก build เป็น static ไว้ล่วงหน้า
 * ถ้าสุ่มฝั่ง server ปกจะถูกแช่ไว้ตั้งแต่ตอน build (ไม่สลับเลย) และถ้าสุ่มตอน
 * render แรกฝั่ง client ก็จะไม่ตรงกับ HTML ที่ hydrate → hydration mismatch
 * ระหว่างนั้นวางกล่องเปล่าขนาดเท่าปกไว้แทน — ดีกว่าโชว์ใบแรกแล้วค่อยเด้งเปลี่ยน
 */
export function NovelCover({ covers, alt, width, height, sizes, priority, className }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  // array เปลี่ยน reference ทุก render — ผูก effect กับ "เนื้อลิสต์" แทนตัว array
  const pool = covers.join("\n");

  useEffect(() => {
    const list = pool.split("\n").filter(Boolean);
    if (list.length === 0) return;
    setSrc(list[Math.floor(Math.random() * list.length)]);
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
