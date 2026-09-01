import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getAllNovels } from "@/lib/content";
import { searchContent, type ChapterHit, type NovelHit } from "@/lib/search";

export const metadata: Metadata = { title: "ค้นหา" };

type Props = {
  searchParams: { q?: string | string[]; novel?: string | string[] };
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * ค้นหาเนื้อหาข้ามตอน/ข้ามเรื่อง
 *
 * เป็นหน้าเดียวของเว็บที่เรนเดอร์ตอน request (หน้าอื่น static หมด) เพราะคำค้น
 * อยู่ใน URL — ฟอร์มเป็น GET ธรรมดา ผลลัพธ์จึงแชร์/บุ๊กมาร์ก/กดย้อนกลับได้
 * ตัว route นี้ต้องอ่านโฟลเดอร์ content/ ตอนรัน จึง pin ไว้ใน next.config.mjs
 */
export default function SearchPage({ searchParams }: Props) {
  const novels = getAllNovels();
  const query = first(searchParams.q);

  const requested = first(searchParams.novel);
  const scope = novels.find((novel) => novel.slug === requested) ?? null;

  const result = searchContent(query, scope?.slug);
  const chapterCount = result.novels.reduce(
    (sum, novel) => sum + novel.chapters.length,
    0,
  );

  return (
    <>
      <SiteHeader
        hideSearch
        back={
          scope
            ? { href: `/novel/${scope.slug}`, label: scope.title }
            : { href: "/", label: "คลังนิยาย" }
        }
      />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
        <h1 className="font-reading text-xl font-semibold sm:text-2xl">ค้นหาเนื้อหา</h1>

        {/* จอแคบ: ช่องพิมพ์เต็มบรรทัด แล้วตัวเลือกกับปุ่มค้นหาแชร์บรรทัดถัดไป */}
        <form action="/search" className="mt-5 flex flex-col gap-2 sm:mt-6 sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={result.query}
            placeholder="พิมพ์คำที่อยากหา…"
            autoFocus
            autoComplete="off"
            className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent sm:flex-1 sm:py-2.5 sm:text-sm"
          />

          <div className="flex gap-2">
            {novels.length > 1 ? (
              <select
                name="novel"
                defaultValue={scope?.slug ?? ""}
                aria-label="ขอบเขตการค้นหา"
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-3 text-sm outline-none focus:border-accent sm:flex-none sm:py-2.5"
              >
                <option value="">ทุกเรื่อง</option>
                {novels.map((novel) => (
                  <option key={novel.slug} value={novel.slug}>
                    {novel.title}
                  </option>
                ))}
              </select>
            ) : (
              /* เรื่องเดียวไม่ต้องมีตัวเลือก แต่ยังคงขอบเขตไว้ตอนกดค้นซ้ำ */
              scope && <input type="hidden" name="novel" value={scope.slug} />
            )}

            <button
              type="submit"
              className="flex-1 rounded-lg border border-accent bg-accent-soft px-5 py-3 text-sm text-accent transition-colors hover:border-accent sm:flex-none sm:py-2.5"
            >
              ค้นหา
            </button>
          </div>
        </form>

        {scope && novels.length > 1 ? (
          <p className="mt-3 text-xs text-muted">
            กำลังค้นเฉพาะ {scope.title} ·{" "}
            <Link
              href={`/search?q=${encodeURIComponent(result.query)}`}
              className="text-accent"
            >
              ค้นทุกเรื่องแทน
            </Link>
          </p>
        ) : null}

        {result.query.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm leading-relaxed text-muted">
            พิมพ์คำที่อยากหาแล้วกดค้นหา
            <br />
            ค้นได้ทั้งเนื้อเรื่อง ชื่อตอน และข้อมูลของนิยาย
          </p>
        ) : result.total === 0 && result.novels.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm leading-relaxed text-muted">
            ไม่พบ “{result.query}” ในนิยาย{scope ? `เรื่อง${scope.title}` : "ที่มีอยู่"}
            <br />
            ลองคำที่สั้นลงหรือสะกดแบบอื่นดู
          </p>
        ) : (
          <>
            <p className="mt-8 text-sm text-muted">
              พบ <span className="tabular-nums text-accent">{result.total}</span> จุด ใน{" "}
              <span className="tabular-nums">{chapterCount}</span> ตอน
              {result.truncated ? " (แสดงเท่าที่ค้นไหว ลองใช้คำที่เจาะจงกว่านี้)" : ""}
            </p>

            <div className="mt-4 space-y-8">
              {result.novels.map((novel) => (
                <NovelResults
                  key={novel.slug}
                  novel={novel}
                  showTitle={scope === null}
                  query={result.query}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}

function NovelResults({
  novel,
  showTitle,
  query,
}: {
  novel: NovelHit;
  showTitle: boolean;
  query: string;
}) {
  return (
    <section>
      {showTitle ? (
        <h2 className="flex items-baseline gap-2 text-sm font-semibold">
          <Link href={`/novel/${novel.slug}`} className="hover:text-accent">
            {novel.title}
          </Link>
          <span className="text-xs font-normal tabular-nums text-muted">
            {novel.total} จุด
          </span>
        </h2>
      ) : null}

      {novel.metaMatch ? (
        <p className="mt-2 text-xs text-muted">
          คำค้นนี้อยู่ในข้อมูลของเรื่องด้วย ·{" "}
          <Link href={`/novel/${novel.slug}`} className="text-accent">
            เปิดหน้าเรื่อง
          </Link>
        </p>
      ) : null}

      {novel.chapters.length === 0 ? null : (
        <ul className="mt-3 space-y-3">
          {novel.chapters.map((chapter) => (
            <li key={chapter.id}>
              <ChapterResult slug={novel.slug} chapter={chapter} query={query} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ChapterResult({
  slug,
  chapter,
  query,
}: {
  slug: string;
  chapter: ChapterHit;
  query: string;
}) {
  const rest = chapter.total - chapter.snippets.length;
  // ชื่อตอนที่เป็น "ตอนที่ N" อยู่แล้วไม่ต้องมีป้ายเลขตอนกำกับซ้ำ
  const numbered = chapter.title.replace(/\s+/g, "") === `ตอนที่${chapter.id}`;

  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <h3 className="flex items-baseline justify-between gap-3">
        <Link
          href={`/novel/${slug}/${chapter.id}`}
          className="font-reading text-sm leading-snug hover:text-accent"
        >
          {chapter.titleMatch ? <Highlight text={chapter.title} query={query} /> : chapter.title}
        </Link>
        {numbered ? null : (
          <span className="shrink-0 text-xs tabular-nums text-muted">
            ตอนที่ {chapter.id}
          </span>
        )}
      </h3>

      {chapter.snippets.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {chapter.snippets.map((snippet) => (
            <li key={snippet.key}>
              <Link
                href={`/novel/${slug}/${chapter.id}#block-${snippet.block}`}
                className="block rounded-lg border-l-2 border-border py-1 pl-3 text-sm leading-relaxed text-muted transition-colors hover:border-accent hover:text-foreground"
              >
                {snippet.before}
                <mark className="rounded bg-accent-soft px-0.5 font-medium text-accent">
                  {snippet.match}
                </mark>
                {snippet.after}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {rest > 0 ? (
        <p className="mt-2 pl-3 text-xs tabular-nums text-muted">
          และอีก {rest} จุดในตอนนี้
        </p>
      ) : null}
    </article>
  );
}

/** ระบายคำค้นในชื่อตอน — เนื้อเรื่องใช้ snippet ที่ตัดมาแล้วจาก lib/search.ts */
function Highlight({ text, query }: { text: string; query: string }) {
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-accent-soft px-0.5 text-accent">
        {text.slice(at, at + query.length)}
      </mark>
      {text.slice(at + query.length)}
    </>
  );
}
