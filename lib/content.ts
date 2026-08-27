import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";

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
};

export type ChapterSummary = {
  /** เลขตอนที่ดึงจากชื่อไฟล์ ใช้เป็น URL segment ด้วย */
  number: number;
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
  blocks: Block[];
};

export type Novel = NovelMeta & {
  chapters: ChapterSummary[];
};

const NUMBER_IN_NAME = /(\d+)/;

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

  const number = Number(file.match(NUMBER_IN_NAME)?.[1] ?? 0);
  const frontmatterTitle = (parsed.data as { title?: string }).title;

  return {
    novelSlug,
    number,
    title: frontmatterTitle?.trim() || title || `ตอนที่ ${number}`,
    file,
    charCount: blocks.reduce((sum, block) => sum + block.text.length, 0),
    blocks,
  };
}

/** อ่านทุกตอนของนิยายเรื่องหนึ่ง เรียงตามเลขตอนจากน้อยไปมาก */
const readChapters = cache((novelSlug: string): Chapter[] => {
  const dir = path.join(CONTENT_DIR, novelSlug);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => readChapterFile(novelSlug, file))
    .sort((a, b) => a.number - b.number);
});

function toSummary(chapter: Chapter): ChapterSummary {
  const { number, title, file, charCount } = chapter;
  return { number, title, file, charCount };
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
  return { ...readNovelMeta(slug), chapters: readChapters(slug).map(toSummary) };
});

export const getAllNovels = cache((): Novel[] =>
  getNovelSlugs()
    .map(getNovel)
    .filter((novel): novel is Novel => novel !== null),
);

export const getChapter = cache((slug: string, number: number): Chapter | null => {
  return readChapters(slug).find((chapter) => chapter.number === number) ?? null;
});

/** ตอนก่อนหน้า/ถัดไป สำหรับปุ่มนำทางในหน้าอ่าน */
export const getChapterNeighbours = cache((slug: string, number: number) => {
  const chapters = readChapters(slug);
  const at = chapters.findIndex((chapter) => chapter.number === number);
  if (at === -1) return { prev: null, next: null };
  return {
    prev: at > 0 ? toSummary(chapters[at - 1]) : null,
    next: at < chapters.length - 1 ? toSummary(chapters[at + 1]) : null,
  };
});
