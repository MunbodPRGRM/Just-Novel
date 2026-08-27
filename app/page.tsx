import { getAllNovels } from "@/lib/content";

// หน้าชั่วคราวของ phase 1 — ยืนยันว่าอ่านโครง content/<slug>/ ได้จริง
// phase 2 จะแทนที่ด้วยหน้ารายชื่อนิยายของจริง (พร้อมลิงก์ไปสารบัญ/หน้าอ่าน)
export default function HomePage() {
  const novels = getAllNovels();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-reading text-3xl font-semibold">Just Novel</h1>
      <p className="mt-2 text-sm text-muted">
        พบนิยาย {novels.length} เรื่องในโฟลเดอร์ <code>content/</code>
      </p>

      <ul className="mt-10 space-y-6">
        {novels.map((novel) => (
          <li
            key={novel.slug}
            className="rounded-lg border border-border bg-surface p-5"
          >
            <h2 className="font-reading text-xl font-semibold">{novel.title}</h2>
            {novel.subtitle ? (
              <p className="mt-1 text-xs text-muted">{novel.subtitle}</p>
            ) : null}
            <p className="mt-3 text-sm text-muted">
              {novel.chapters.length} ตอน · slug: <code>{novel.slug}</code>
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
