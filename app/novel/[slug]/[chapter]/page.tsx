import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChapterNav } from "@/components/chapter-nav";
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
      chapter: chapter.id,
    }));
  });
}

export function generateMetadata({ params }: Props): Metadata {
  const novel = getNovel(params.slug);
  const chapter = getChapter(params.slug, decodeURIComponent(params.chapter));
  if (!novel || !chapter) return { title: "ไม่พบตอนนี้" };
  return { title: `${chapter.title} · ${novel.title}` };
}

export default function ChapterPage({ params }: Props) {
  // ตอนพิเศษมี id แบบ "51.5-1" จึงรับเป็นสตริงตรงๆ ไม่แปลงเป็นตัวเลข
  const id = decodeURIComponent(params.chapter);
  const novel = getNovel(params.slug);
  const chapter = getChapter(params.slug, id);
  if (!novel || !chapter) notFound();

  const { prev, next } = getChapterNeighbours(params.slug, id);
  const position = novel.chapters.findIndex((item) => item.id === id) + 1;

  return (
    <>
      <SiteHeader
        back={{ href: `/novel/${novel.slug}`, label: "สารบัญ" }}
        aside={`${position} / ${novel.chapters.length}`}
        searchNovel={novel.slug}
        actions={
          <NotesButton
            novelSlug={novel.slug}
            chapters={novel.chapters.map(({ id, title }) => ({ id, title }))}
            currentChapter={chapter.id}
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
            chapterId={chapter.id}
            blocks={chapter.blocks}
          />
        </article>

        <ChapterNav
          novelSlug={novel.slug}
          currentId={chapter.id}
          prev={prev}
          next={next}
        />
      </main>
    </>
  );
}
