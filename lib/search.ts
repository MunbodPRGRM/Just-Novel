import { getAllNovels, getChapters } from "./content";

/**
 * ค้นหาเนื้อหาข้ามตอน/ข้ามเรื่อง — ทำงานฝั่ง server เท่านั้น (อ่านไฟล์ .md ตอน request)
 *
 * ยังไม่มี search index: กวาดข้อความตรงๆ ทุกครั้งที่ค้น เพราะนิยายมีไม่กี่เรื่อง
 * (ดู trade-off ใน CLAUDE.md) — ถ้าช้าเมื่อไหร่ค่อยทำ index ทีหลัง
 *
 * ภาษาไทยไม่มีช่องว่างระหว่างคำ จึงจับแบบ "สตริงย่อย" ทั้งวลี ไม่ตัดคำ
 * และไม่แยกคำค้นเป็นหลายเทอม — พิมพ์อะไรไปก็หาสิ่งนั้นตรงๆ คาดเดาผลง่ายกว่า
 */

/** จำนวนจุดที่หยุดกวาดต่อ — กันหน้าค้นหายาวเกินเวลาพิมพ์คำที่เจอทุกย่อหน้า */
const MAX_MATCHES = 300;
/** แสดงกี่จุดต่อหนึ่งตอน ที่เหลือบอกเป็นจำนวน */
const SNIPPETS_PER_CHAPTER = 3;
/** ความยาวบริบทหน้า/หลังคำที่เจอในตัวอย่างข้อความ */
const CONTEXT_BEFORE = 40;
const CONTEXT_AFTER = 90;

export type Snippet = {
  key: string;
  /** index ของย่อหน้า — ใช้ทำลิงก์ #block-N ไปยังจุดที่เจอ */
  block: number;
  before: string;
  match: string;
  after: string;
};

export type ChapterHit = {
  number: number;
  title: string;
  /** คำค้นอยู่ในชื่อตอน (ไม่ใช่แค่ในเนื้อหา) */
  titleMatch: boolean;
  snippets: Snippet[];
  /** จำนวนจุดที่เจอทั้งตอน (อาจมากกว่าจำนวน snippets) */
  total: number;
};

export type NovelHit = {
  slug: string;
  title: string;
  cover?: string;
  /** คำค้นอยู่ในข้อมูลของเรื่อง (ชื่อเรื่อง/ชื่อรอง/คำโปรย/แท็ก) */
  metaMatch: boolean;
  chapters: ChapterHit[];
  total: number;
};

export type SearchResult = {
  /** คำค้นหลังตัดช่องว่างส่วนเกิน — ใช้แสดงกลับในหน้าผลลัพธ์ */
  query: string;
  novels: NovelHit[];
  total: number;
  /** ชนเพดาน MAX_MATCHES แล้ว ผลที่แสดงยังไม่ครบ */
  truncated: boolean;
};

const EMPTY: SearchResult = { query: "", novels: [], total: 0, truncated: false };

/**
 * ตัวพิมพ์เล็กเพื่อค้นแบบไม่สนตัวพิมพ์
 * อักษรบางตัว (เช่น İ) ยาวขึ้นเมื่อ toLowerCase จนตำแหน่งเพี้ยน — เจอกรณีนั้นใช้ข้อความเดิม
 */
function foldCase(text: string): string {
  const lowered = text.toLowerCase();
  return lowered.length === text.length ? lowered : text;
}

/** ตำแหน่งทุกจุดที่เจอคำค้นในข้อความหนึ่งก้อน */
function findAll(haystack: string, needle: string): number[] {
  const found: number[] = [];
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    found.push(at);
    at = haystack.indexOf(needle, at + needle.length);
  }
  return found;
}

function toSnippet(text: string, block: number, at: number, length: number): Snippet {
  const start = Math.max(0, at - CONTEXT_BEFORE);
  const end = Math.min(text.length, at + length + CONTEXT_AFTER);

  return {
    key: `${block}-${at}`,
    block,
    before: (start > 0 ? "…" : "") + text.slice(start, at),
    match: text.slice(at, at + length),
    after: text.slice(at + length, end) + (end < text.length ? "…" : ""),
  };
}

/**
 * ค้นในทุกเรื่อง (หรือเฉพาะเรื่องเดียวถ้าส่ง `novelSlug`)
 * คืนผลจัดกลุ่มเป็น เรื่อง → ตอน → จุดที่เจอ เรียงตามลำดับตอนในสารบัญ
 */
export function searchContent(rawQuery: string, novelSlug?: string): SearchResult {
  const query = rawQuery.trim().replace(/\s+/g, " ");
  if (query.length === 0) return EMPTY;

  const needle = foldCase(query);
  const novels = getAllNovels().filter(
    (novel) => novelSlug === undefined || novel.slug === novelSlug,
  );

  const hits: NovelHit[] = [];
  let total = 0;
  let truncated = false;

  for (const novel of novels) {
    if (total >= MAX_MATCHES) {
      truncated = true;
      break;
    }

    const meta = [novel.title, novel.subtitle, novel.synopsis, ...novel.tags]
      .filter(Boolean)
      .join(" ");

    const chapters: ChapterHit[] = [];
    let novelTotal = 0;

    for (const chapter of getChapters(novel.slug)) {
      if (total >= MAX_MATCHES) {
        truncated = true;
        break;
      }

      const titleMatch = foldCase(chapter.title).includes(needle);
      const snippets: Snippet[] = [];
      let chapterTotal = 0;

      for (const block of chapter.blocks) {
        if (block.text.length === 0) continue;

        for (const at of findAll(foldCase(block.text), needle)) {
          chapterTotal += 1;
          if (snippets.length < SNIPPETS_PER_CHAPTER) {
            snippets.push(toSnippet(block.text, block.index, at, query.length));
          }
        }
      }

      if (chapterTotal === 0 && !titleMatch) continue;

      total += chapterTotal;
      novelTotal += chapterTotal;
      chapters.push({
        number: chapter.number,
        title: chapter.title,
        titleMatch,
        snippets,
        total: chapterTotal,
      });
    }

    const metaMatch = foldCase(meta).includes(needle);
    if (chapters.length === 0 && !metaMatch) continue;

    hits.push({
      slug: novel.slug,
      title: novel.title,
      cover: novel.cover,
      metaMatch,
      chapters,
      total: novelTotal,
    });
  }

  return { query, novels: hits, total, truncated };
}
