import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChapterList } from "@/components/chapter-list";
import { NotesButton } from "@/components/notes-panel";
import { ResetProgress } from "@/components/reset-progress";
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
        searchNovel={novel.slug}
        actions={<NotesButton novelSlug={novel.slug} chapters={chapterLinks} />}
      />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
        <header className="flex gap-4 sm:gap-5">
          {novel.cover ? (
            <Image
              src={novel.cover}
              alt={novel.title}
              width={128}
              height={183}
              priority
              sizes="(min-width: 640px) 128px, 96px"
              className="h-[137px] w-24 shrink-0 rounded-lg object-cover sm:h-[183px] sm:w-32"
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <h1 className="font-reading text-lg font-semibold leading-snug sm:text-2xl">
              {novel.title}
            </h1>
            {novel.subtitle ? (
              <p className="mt-2 text-xs italic leading-relaxed text-muted sm:text-sm">
                {novel.subtitle}
              </p>
            ) : null}

            <p className="mt-3 text-xs leading-relaxed text-muted sm:mt-4">
              {[STATUS_LABEL[novel.status], `${novel.chapters.length} ตอน`, ...credits].join(
                " · ",
              )}
            </p>
          </div>
        </header>

        {/* แท็กอยู่ใต้ header ทั้งบล็อก — จอแคบมีที่ข้างปกไม่พอให้แท็กขึ้นบรรทัดสวยๆ */}
        {novel.tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
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

        {novel.synopsis ? (
          <p className="mt-5 border-l-2 border-border pl-4 text-sm leading-relaxed text-muted">
            {novel.synopsis}
          </p>
        ) : null}

        <ResumeReading
          novels={[{ slug: novel.slug, title: novel.title, chapters: chapterLinks }]}
        />

        <h2 className="mt-8 text-sm font-semibold text-muted sm:mt-10">สารบัญ</h2>

        {novel.chapters.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-sm leading-relaxed text-muted sm:p-8">
            ยังไม่มีไฟล์ตอนในโฟลเดอร์ <code>content/{novel.slug}/</code>
          </p>
        ) : (
          <>
            <ChapterList
              novelSlug={novel.slug}
              chapters={novel.chapters.map(({ number, title, charCount }) => ({
                number,
                title,
                charCount,
              }))}
            />
            <ResetProgress novelSlug={novel.slug} />
          </>
        )}
      </main>
    </>
  );
}
