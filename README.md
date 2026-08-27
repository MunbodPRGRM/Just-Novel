# Just Novel

เว็บอ่านนิยายส่วนตัว — อ่านเนื้อหาตรงจากไฟล์ `.md` ในโปรเจกต์ ไม่มีฐานข้อมูล ไม่มีระบบล็อกอิน

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- เนื้อหานิยาย: อ่านจากไฟล์ `.md` ด้วย `fs` + `gray-matter`
- reading progress / notes / dark mode / ขนาดฟอนต์: เก็บใน `localStorage` ฝั่ง browser
- Deploy: Vercel

## เริ่มรันในเครื่อง

```bash
npm install
npm run dev      # http://localhost:3000
```

| script | ทำอะไร |
| --- | --- |
| `npm run dev` | รัน dev server |
| `npm run build` | build production (รันก่อน push ทุกครั้ง) |
| `npm run start` | รัน build ที่ได้ |
| `npm run lint` | ตรวจ ESLint |

ไม่ต้องตั้ง environment variable ใดๆ

## โครงสร้างเนื้อหา

```
content/
  <novel-slug>/
    novel.json     # metadata ของเรื่อง
    ตอนที่1.md
    ตอนที่2.md
```

### `novel.json`

| field | ความหมาย |
| --- | --- |
| `title` | ชื่อเรื่องที่แสดงบนเว็บ (จำเป็น) |
| `subtitle` | ชื่อรอง เช่น ชื่อโรมาจิ |
| `author` | ผู้แต่งต้นฉบับ |
| `translator` | ผู้แปล |
| `synopsis` | คำโปรย |
| `status` | `ongoing` \| `completed` \| `hiatus` |
| `tags` | อาร์เรย์ของแท็ก |

### ไฟล์ตอน

- ชื่อไฟล์ต้องมีตัวเลขตอนอยู่ในนั้น (`ตอนที่7.md`) — ตัวเลขตัวแรกที่เจอใช้เป็นเลขตอนและเป็น URL
- บรรทัด `# ...` ตัวแรกในไฟล์ถือเป็นชื่อตอน (จะไม่ถูกแสดงซ้ำในเนื้อหา)
- ย่อหน้าคั่นด้วยบรรทัดว่าง, `---` บรรทัดเดียวคือเส้นคั่นฉาก
- ใส่ frontmatter `title:` เพื่อ override ชื่อตอนได้

## เพิ่มตอน / เพิ่มเรื่องใหม่

1. วางไฟล์ `.md` ใน `content/<novel-slug>/` (เรื่องใหม่ต้องมี `novel.json` ด้วย)
2. commit แล้ว push → Vercel redeploy อัตโนมัติ

ไม่มีหน้า admin สำหรับอัปโหลดเนื้อหา — เพิ่มตอนคือแก้ไฟล์ในโปรเจกต์เท่านั้น

## ข้อจำกัดที่รู้ตัว

- ไม่มี auth: ใครมีลิงก์ก็เข้าได้ (ไม่ประกาศเว็บ + ปิด SEO ด้วย `robots: noindex`)
- `localStorage` ผูกกับเบราว์เซอร์นั้นๆ — ตำแหน่งอ่านล่าสุด/โน้ตไม่ sync ข้ามเครื่อง
- เพิ่มตอนต้อง redeploy เสมอ
