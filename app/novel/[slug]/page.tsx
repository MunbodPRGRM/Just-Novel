import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChapterList } from "@/components/chapter-list";
import { NotesButton } from "@/components/notes-panel";
import { ResumeReading } from "@/components/resume-reading";
import { SiteHeader } from "@/components/site-header";
import { getNovel, getNovelSlugs } from "@/lib/content";
import { STATUS_LABEL } from "@/lib/labels";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return getNovelSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const novel = getNovel(params.slug);
  if (!novel) return { title: "ไม่พบนิยาย" };
  return { title: novel.title, description: novel.synopsis };
}

export default function NovelPage({ params }: Props) {
  const novel = getNovel(params.slug);
  if (!novel) notFound();

  const credits = [
    novel.author ? `ผู้แต่ง: ${novel.author}` : null,
    novel.translator ? `แปล: ${novel.translator}` : null,
  ].filter(Boolean);

  const chapterLinks = novel.chapters.map(({ number, title }) => ({ number, title }));

  return (
    <>
      <SiteHeader
        back={{ href: "/", label: "คลังนิยาย" }}
        actions={<NotesButton novelSlug={novel.slug} chapters={chapterLinks} />}
      />

      <main className="mx-auto max-w-3xl px-5 py-10">
        <header>
          <h1 className="font-reading text-2xl font-semibold leading-snug">
            {novel.title}
          </h1>
          {novel.subtitle ? (
            <p className="mt-2 text-sm italic text-muted">{novel.subtitle}</p>
          ) : null}

          <p className="mt-4 text-xs text-muted">
            {[STATUS_LABEL[novel.status], `${novel.chapters.length} ตอน`, ...credits].join(
              " · ",
            )}
          </p>

          {novel.synopsis ? (
            <p className="mt-5 border-l-2 border-border pl-4 text-sm leading-relaxed text-muted">
              {novel.synopsis}
            </p>
          ) : null}

          {novel.tags.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {novel.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </header>

        <ResumeReading
          novels={[{ slug: novel.slug, title: novel.title, chapters: chapterLinks }]}
        />

        <h2 className="mt-10 text-sm font-semibold text-muted">สารบัญ</h2>

        {novel.chapters.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
            ยังไม่มีไฟล์ตอนในโฟลเดอร์ <code>content/{novel.slug}/</code>
          </p>
        ) : (
          <ChapterList
            novelSlug={novel.slug}
            chapters={novel.chapters.map(({ number, title, charCount }) => ({
              number,
              title,
              charCount,
            }))}
          />
        )}
      </main>
    </>
  );
}
