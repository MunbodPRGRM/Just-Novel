import Image from "next/image";

type Props = {
  /** path ปกใน public/ เช่น /covers/<slug>/<file>.jpg — ไม่มีก็แสดงปกสำรองเป็นชื่อเรื่อง */
  src?: string;
  title: string;
  sizes: string;
  priority?: boolean;
  /** กำหนดขนาด/สัดส่วนของกรอบปก (รูปขยายเต็มกรอบเอง) */
  className?: string;
};

export function NovelCover({ src, title, sizes, priority, className }: Props) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg bg-border ${className ?? ""}`}>
      {src ? (
        <Image
          src={src}
          alt={title}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-accent-soft p-2 text-center">
          <span className="line-clamp-4 font-reading text-xs font-semibold leading-snug text-accent sm:text-sm">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
