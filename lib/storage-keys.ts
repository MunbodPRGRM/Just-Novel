/**
 * คีย์ localStorage ทั้งหมดของเว็บ
 *
 * แยกไว้ในไฟล์ที่ไม่มี "use client" เพราะสคริปต์กันจอขาววาบใน layout
 * (server component) ต้องใช้คีย์นี้ด้วย
 */
export const PREFS_KEY = "just-novel:prefs";
export const PROGRESS_KEY = "just-novel:progress";
export const NOTES_KEY = "just-novel:notes";
