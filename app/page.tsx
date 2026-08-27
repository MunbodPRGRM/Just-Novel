import Link from "next/link";
import { ResumeReading } from "@/components/resume-reading";
import { SiteHeader } from "@/components/site-header";
import { getAllNovels } from "@/lib/content";
import { STATUS_LABEL } from "@/lib/labels";

export default function HomePage() {
  const novels = getAllNovels();

  return (
    <>
      <SiteHeader aside={novels.length > 0 ? `${novels.length} เรื่อง` : undefined} />

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-reading text-2xl font-semibold">คลังนิยาย</h1>

        <ResumeReading
          showNovelTitle
          novels={novels.map((novel) => ({
            slug: novel.slug,
            title: novel.title,
            chapters: novel.chapters.map(({ number, title }) => ({ number, title })),
          }))}
        />

        {novels.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
            ยังไม่มีนิยายในโฟลเดอร์ <code>content/</code>
            <br />
            เพิ่มได้โดยสร้าง <code>content/&lt;slug&gt;/novel.json</code> พร้อมไฟล์{" "}
            <code>ตอนที่N.md</code>
          </p>
        ) : (
          <ul className="mt-8 space-y-4">
            {novels.map((novel) => (
              <li key={novel.slug}>
                <Link
                  href={`/novel/${novel.slug}`}
                  className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-reading text-lg font-semibold leading-snug">
                      {novel.title}
                    </h2>
                    <span className="mt-1 shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent">
                      {STATUS_LABEL[novel.status]}
                    </span>
                  </div>

                  {novel.subtitle ? (
                    <p className="mt-1.5 text-xs italic text-muted">{novel.subtitle}</p>
                  ) : null}

                  {novel.synopsis ? (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
                      {novel.synopsis}
                    </p>
                  ) : null}

                  <p className="mt-4 text-xs text-muted">
                    {novel.chapters.length} ตอน
                    {novel.tags.length > 0 ? ` · ${novel.tags.join(" · ")}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
