import Link from "next/link";
import { NovelCover } from "@/components/novel-cover";
import { SiteHeader } from "@/components/site-header";
import { getAllNovels } from "@/lib/content";

export default function HomePage() {
  const novels = getAllNovels();

  return (
    <>
      <SiteHeader aside={novels.length > 0 ? `${novels.length} เรื่อง` : undefined} />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
        <h1 className="font-reading text-xl font-semibold sm:text-2xl">คลังนิยาย</h1>

        {novels.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border p-6 text-center text-sm leading-relaxed text-muted sm:p-8">
            ยังไม่มีนิยายในโฟลเดอร์ <code>content/</code>
            <br />
            เพิ่มได้โดยสร้าง <code>content/&lt;slug&gt;/novel.json</code> พร้อมไฟล์{" "}
            <code>ตอนที่N.md</code>
          </p>
        ) : (
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4">
            {novels.map((novel, at) => (
              <li key={novel.slug}>
                <Link href={`/novel/${novel.slug}`} className="group block">
                  <NovelCover
                    src={novel.cover}
                    title={novel.title}
                    priority={at < 4}
                    sizes="(min-width: 768px) 180px, (min-width: 640px) 33vw, 50vw"
                    className="aspect-[5/7] w-full ring-accent transition-shadow group-hover:ring-2"
                  />
                  {/* ชื่อยาวตัดไว้ 2 บรรทัด — ชื่อเต็มอยู่ในหน้าเรื่อง */}
                  <h2
                    title={novel.title}
                    className="mt-2 line-clamp-2 font-reading text-sm font-semibold leading-snug transition-colors group-hover:text-accent sm:text-base"
                  >
                    {novel.title}
                  </h2>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
