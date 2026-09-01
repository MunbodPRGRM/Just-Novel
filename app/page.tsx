import Image from "next/image";
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

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
        <h1 className="font-reading text-xl font-semibold sm:text-2xl">คลังนิยาย</h1>

        <ResumeReading
          showNovelTitle
          novels={novels.map((novel) => ({
            slug: novel.slug,
            title: novel.title,
            chapters: novel.chapters.map(({ id, title }) => ({ id, title })),
          }))}
        />

        {novels.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border p-6 text-center text-sm leading-relaxed text-muted sm:p-8">
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
                  className="flex gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent sm:gap-4 sm:p-5"
                >
                  {novel.cover ? (
                    <Image
                      src={novel.cover}
                      alt={novel.title}
                      width={80}
                      height={114}
                      sizes="(min-width: 640px) 80px, 64px"
                      className="h-[91px] w-16 shrink-0 rounded-lg object-cover sm:h-[114px] sm:w-20"
                    />
                  ) : null}

                  <div className="min-w-0 flex-1">
                    {/* จอแคบวางป้ายสถานะไว้ใต้ชื่อ ไม่งั้นชื่อเรื่องเหลือที่นิดเดียว */}
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <h2 className="font-reading font-semibold leading-snug sm:text-lg">
                        {novel.title}
                      </h2>
                      <span className="w-fit shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent sm:mt-1">
                        {STATUS_LABEL[novel.status]}
                      </span>
                    </div>

                    {novel.subtitle ? (
                      <p className="mt-1.5 line-clamp-2 text-xs italic text-muted">
                        {novel.subtitle}
                      </p>
                    ) : null}

                    {novel.synopsis ? (
                      <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-muted sm:mt-3">
                        {novel.synopsis}
                      </p>
                    ) : null}

                    <p className="mt-3 text-xs text-muted sm:mt-4">
                      {novel.chapters.length} ตอน
                      {novel.tags.length > 0 ? ` · ${novel.tags.join(" · ")}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
