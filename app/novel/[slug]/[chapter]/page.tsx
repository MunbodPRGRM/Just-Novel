import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterReader } from "@/components/chapter-reader";
import { NotesButton } from "@/components/notes-panel";
import { SiteHeader } from "@/components/site-header";
import { getChapter, getChapterNeighbours, getNovel, getNovelSlugs } from "@/lib/content";

type Props = { params: { slug: string; chapter: string } };

export function generateStaticParams() {
  return getNovelSlugs().flatMap((slug) => {
    const novel = getNovel(slug);
    return (novel?.chapters ?? []).map((chapter) => ({
      slug,
      chapter: String(chapter.number),
    }));
  });
}

export function generateMetadata({ params }: Props): Metadata {
  const novel = getNovel(params.slug);
  const chapter = getChapter(params.slug, Number(params.chapter));
  if (!novel || !chapter) return { title: "ไม่พบตอนนี้" };
  return { title: `${chapter.title} · ${novel.title}` };
}

export default function ChapterPage({ params }: Props) {
  const number = Number(params.chapter);
  const novel = getNovel(params.slug);
  const chapter = Number.isInteger(number) ? getChapter(params.slug, number) : null;
  if (!novel || !chapter) notFound();

  const { prev, next } = getChapterNeighbours(params.slug, number);
  const position = novel.chapters.findIndex((item) => item.number === number) + 1;

  return (
    <>
      <SiteHeader
        back={{ href: `/novel/${novel.slug}`, label: "สารบัญ" }}
        aside={`${position} / ${novel.chapters.length}`}
        searchNovel={novel.slug}
        actions={
          <NotesButton
            novelSlug={novel.slug}
            chapters={novel.chapters.map(({ number, title }) => ({ number, title }))}
            currentChapter={chapter.number}
          />
        }
      />

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6 sm:pt-8">
        <article>
          <h1 className="font-reading text-lg font-semibold leading-snug sm:text-xl">
            {chapter.title}
          </h1>
          <p className="mt-1.5 line-clamp-1 text-xs text-muted">{novel.title}</p>

          <ChapterReader
            novelSlug={novel.slug}
            chapterNumber={chapter.number}
            blocks={chapter.blocks}
          />
        </article>

        {/* จอแคบวางปุ่มซ้อนกัน — สองปุ่มเรียงกันเหลือช่องละไม่ถึงครึ่งจอ ชื่อตอนโดนตัดหมด */}
        <nav className="mt-12 flex flex-col items-stretch gap-3 border-t border-border pt-6 sm:mt-14 sm:flex-row">
          <ChapterLink
            slug={novel.slug}
            chapter={prev}
            direction="prev"
            className="flex-1"
          />
          <ChapterLink
            slug={novel.slug}
            chapter={next}
            direction="next"
            className="flex-1"
          />
        </nav>
      </main>
    </>
  );
}

function ChapterLink({
  slug,
  chapter,
  direction,
  className,
}: {
  slug: string;
  chapter: { number: number; title: string } | null;
  direction: "prev" | "next";
  className?: string;
}) {
  const isPrev = direction === "prev";
  const align = isPrev ? "text-left" : "text-right";

  if (!chapter) {
    return (
      <span
        className={`${className} ${align} rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted`}
      >
        {isPrev ? "ตอนแรกแล้ว" : "ตอนล่าสุดแล้ว"}
      </span>
    );
  }

  return (
    <Link
      href={`/novel/${slug}/${chapter.number}`}
      className={`${className} ${align} rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-accent`}
    >
      <span className="block text-xs text-muted">
        {isPrev ? "← ตอนก่อนหน้า" : "ตอนถัดไป →"}
      </span>
      <span className="font-reading mt-1 block truncate text-sm">{chapter.title}</span>
    </Link>
  );
}
