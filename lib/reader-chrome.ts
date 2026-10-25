import { useEffect } from "react";

/**
 * ซ่อน/แสดงแถบบน (SiteHeader) และแถบล่าง (ReaderBottomBar) ในหน้าอ่าน
 *
 * สถานะเก็บเป็น `<html data-chrome="shown|hidden">` แล้วให้ globals.css เลื่อนแถบออกเอง
 * — แถบบนเป็น server component ที่ใช้ร่วมทุกหน้า ไม่ต้องแปลงเป็น client เพื่อรับ state
 * หน้าอื่นไม่มี attribute นี้ แถบจึงแสดงตามปกติ
 */

/** อยู่ใกล้หัวหน้า/ท้ายเนื้อหาเท่านี้ (px) ให้แถบโผล่ — หัวหน้าไว้กดย้อนกลับ ท้ายตอนไว้กดตอนถัดไป */
const TOP_ZONE = 80;
const END_ZONE = 120;
/** ต้องเลื่อนลงต่อเนื่องเกินนี้ถึงซ่อน — กันนิ้วขยับนิดเดียวแล้วแถบหาย */
const HIDE_AFTER = 24;

let hidden = false;

function apply() {
  document.documentElement.dataset.chrome = hidden ? "hidden" : "shown";
}

export function setChromeHidden(next: boolean) {
  hidden = next;
  apply();
}

export function toggleChrome() {
  setChromeHidden(!hidden);
}

/** เปิดเมนูในแถบค้างไว้ (เช่น แผงตั้งค่า, แผ่นเลือกตอน) — ห้ามซ่อนทับ */
function hasOpenMenu() {
  return document.querySelector('[data-chrome-bar] [aria-expanded="true"]') !== null;
}

/**
 * เลื่อนลงอ่าน → ซ่อนแถบ, เลื่อนเข้าใกล้หัวหน้า/ท้ายตอน → แสดงแถบ
 * เลื่อนขึ้นไม่เปลี่ยนอะไร (ย้อนอ่านทีละนิดไม่ควรมีแถบเด้งมาบัง) — อยากเรียกแถบคืนให้แตะเนื้อหา
 * `resetKey` เปลี่ยน (ไปตอนใหม่) = เริ่มนับใหม่โดยแสดงแถบไว้ก่อน
 */
export function useAutoHideChrome(resetKey: string) {
  useEffect(() => {
    setChromeHidden(false);

    let lastY = window.scrollY;
    let travel = 0;
    let inZone = true;
    let frame = 0;

    const check = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;

      const max = document.documentElement.scrollHeight - window.innerHeight;
      const zone = y < TOP_ZONE || y >= max - END_ZONE;
      // แสดงตอน "เพิ่งเข้า" โซนเท่านั้น — อยู่ในโซนแล้วแตะซ่อนเองได้ ไม่ถูกดึงกลับมา
      if (zone && !inZone) setChromeHidden(false);
      inZone = zone;
      if (zone) {
        travel = 0;
        return;
      }

      if (delta <= 0) {
        travel = 0;
        return;
      }

      travel += delta;
      if (travel > HIDE_AFTER && !hidden && !hasOpenMenu()) setChromeHidden(true);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(check);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      hidden = false;
      delete document.documentElement.dataset.chrome;
    };
  }, [resetKey]);
}
