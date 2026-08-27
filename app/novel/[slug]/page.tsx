import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getNovel, getNovelSlugs } from "@/lib/content";
import { readingMinutes, STATUS_LABEL } from "@/lib/labels";

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

  return (
    <>
      <SiteHeader back={{ href: "/", label: "คลังนิยาย" }} />

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

        <h2 className="mt-10 text-sm font-semibold text-muted">สารบัญ</h2>

        {novel.chapters.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
            ยังไม่มีไฟล์ตอนในโฟลเดอร์ <code>content/{novel.slug}/</code>
          </p>
        ) : (
          <ol className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {novel.chapters.map((chapter) => (
              <li key={chapter.number}>
                <Link
                  href={`/novel/${novel.slug}/${chapter.number}`}
                  className="flex items-baseline gap-4 px-5 py-4 transition-colors hover:bg-accent-soft"
                >
                  <span className="w-8 shrink-0 text-sm tabular-nums text-muted">
                    {chapter.number}
                  </span>
                  <span className="font-reading flex-1 leading-snug">{chapter.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {readingMinutes(chapter.charCount)} นาที
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
    </>
  );
}
