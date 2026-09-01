import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import { chapterIdFromFile, chapterOrder, compareChapterOrder } from "./chapter-id";

/** โฟลเดอร์เก็บนิยายทั้งหมด: content/<novel-slug>/{novel.json, ตอนที่N.md} */
export const CONTENT_DIR = path.join(process.cwd(), "content");

export type NovelStatus = "ongoing" | "completed" | "hiatus";

export type NovelMeta = {
  slug: string;
  title: string;
  subtitle?: string;
  author?: string;
  translator?: string;
  synopsis?: string;
  status: NovelStatus;
  tags: string[];
  /** path ไป static asset ใน public/ เช่น "/covers/seireishi.jpg" */
  cover?: string;
};

export type ChapterSummary = {
  /**
   * เลขตอนจากชื่อไฟล์ในรูปสตริง — ใช้เป็น URL segment และคีย์เก็บ progress/notes
   * ตอนปกติได้ "51" ตอนพิเศษที่คั่นกลางได้ "51.5-1" (จากไฟล์ `ตอนที่51.5-1.md`)
   */
  id: string;
  /** ตอนพิเศษที่คั่นระหว่างตอนหลัก — id มีมากกว่าหนึ่งระดับ เช่น "51.5-1" */
  isExtra: boolean;
  title: string;
  file: string;
  charCount: number;
};

/**
 * ย่อหน้าหนึ่งบล็อกในตอน — `index` คือลำดับที่คงที่ตราบใดที่ไฟล์ .md ไม่ถูกแก้
 * ใช้เป็นจุดอ้างอิงของ reading progress กับ notes/highlights ใน phase ถัดไป
 */
export type Block = {
  index: number;
  type: "heading" | "paragraph" | "divider";
  text: string;
  /** ระดับหัวข้อ (1-6) เฉพาะ type === "heading" */
  level?: number;
};

export type Chapter = ChapterSummary & {
  novelSlug: string;
  /** คีย์เรียงลำดับที่แตก id ออกเป็นตัวเลขทีละระดับ — "51.5-1" → [51, 5, 1] */
  order: number[];
  blocks: Block[];
};

export type Novel = NovelMeta & {
  chapters: ChapterSummary[];
};

function isNovelDir(slug: string) {
  return fs.existsSync(path.join(CONTENT_DIR, slug, "novel.json"));
}

function readNovelMeta(slug: string): NovelMeta {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, slug, "novel.json"), "utf8");
  const data = JSON.parse(raw) as Partial<NovelMeta>;

  return {
    slug,
    title: data.title?.trim() || slug,
    subtitle: data.subtitle?.trim() || undefined,
    author: data.author?.trim() || undefined,
    translator: data.translator?.trim() || undefined,
    synopsis: data.synopsis?.trim() || undefined,
    status: data.status ?? "ongoing",
    tags: data.tags ?? [],
    cover: data.cover?.trim() || undefined,
  };
}

/** แปลง markdown ดิบเป็นบล็อกที่มี index คงที่ + ดึงชื่อตอนจากหัวข้อ h1 บรรทัดแรก */
function parseChapterBody(source: string): { title?: string; blocks: Block[] } {
  const chunks = source
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  let title: string | undefined;
  const blocks: Block[] = [];

  for (const chunk of chunks) {
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(chunk)) {
      blocks.push({ index: blocks.length, type: "divider", text: "" });
      continue;
    }

    const heading = chunk.match(/^(#{1,6})\s+([\s\S]*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      // h1 ตัวแรกถือเป็นชื่อตอน แสดงเป็นหัวเรื่องของหน้าแทน ไม่ซ้ำในเนื้อหา
      if (level === 1 && title === undefined) {
        title = text;
        continue;
      }
      blocks.push({ index: blocks.length, type: "heading", text, level });
      continue;
    }

    blocks.push({
      index: blocks.length,
      type: "paragraph",
      text: chunk.replace(/\n+/g, " "),
    });
  }

  return { title, blocks };
}

function readChapterFile(novelSlug: string, file: string): Chapter {
  const filePath = path.join(CONTENT_DIR, novelSlug, file);
  const parsed = matter(fs.readFileSync(filePath, "utf8"));
  const { title, blocks } = parseChapterBody(parsed.content);

  const id = chapterIdFromFile(file);
  const order = chapterOrder(id);
  const frontmatterTitle = (parsed.data as { title?: string }).title;

  return {
    novelSlug,
    id,
    isExtra: order.length > 1,
    order,
    title: frontmatterTitle?.trim() || title || `ตอนที่ ${id}`,
    file,
    charCount: blocks.reduce((sum, block) => sum + block.text.length, 0),
    blocks,
  };
}

/**
 * อ่านทุกตอนของนิยายเรื่องหนึ่ง (พร้อมเนื้อหาเต็ม) เรียงตามเลขตอนจากน้อยไปมาก
 * ตอนพิเศษ (เช่น `ตอนที่51.5-1.md`) แทรกอยู่ระหว่างตอนหลักตามลำดับเอง
 * หน้าอ่านใช้ `getChapter` ทีละตอนพอ — ตัวนี้มีไว้ให้ lib/search.ts กวาดทั้งเรื่อง
 */
export const getChapters = cache((novelSlug: string): Chapter[] => {
  const dir = path.join(CONTENT_DIR, novelSlug);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => readChapterFile(novelSlug, file))
    .sort((a, b) => compareChapterOrder(a.order, b.order));
});

function toSummary(chapter: Chapter): ChapterSummary {
  const { id, isExtra, title, file, charCount } = chapter;
  return { id, isExtra, title, file, charCount };
}

export const getNovelSlugs = cache((): string[] => {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && isNovelDir(entry.name))
    .map((entry) => entry.name)
    .sort();
});

export const getNovel = cache((slug: string): Novel | null => {
  if (!isNovelDir(slug)) return null;
  return { ...readNovelMeta(slug), chapters: getChapters(slug).map(toSummary) };
});

export const getAllNovels = cache((): Novel[] =>
  getNovelSlugs()
    .map(getNovel)
    .filter((novel): novel is Novel => novel !== null),
);

export const getChapter = cache((slug: string, id: string): Chapter | null => {
  return getChapters(slug).find((chapter) => chapter.id === id) ?? null;
});

/** ตอนก่อนหน้า/ถัดไป สำหรับปุ่มนำทางในหน้าอ่าน */
export const getChapterNeighbours = cache((slug: string, id: string) => {
  const chapters = getChapters(slug);
  const at = chapters.findIndex((chapter) => chapter.id === id);
  if (at === -1) return { prev: null, next: null };
  return {
    prev: at > 0 ? toSummary(chapters[at - 1]) : null,
    next: at < chapters.length - 1 ? toSummary(chapters[at + 1]) : null,
  };
});
