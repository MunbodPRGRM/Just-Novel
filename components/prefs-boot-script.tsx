import { PREFS_KEY } from "@/lib/storage-keys";

/**
 * ทำสิ่งเดียวกับ applyPrefs() ใน lib/prefs.ts แต่รันก่อน React hydrate
 * — ถ้าไม่มีตัวนี้ คนที่ตั้งโหมดกลางคืนไว้จะเจอจอขาววาบทุกครั้งที่โหลดหน้า
 */
const SCRIPT = `(function(){try{
var p=JSON.parse(localStorage.getItem(${JSON.stringify(PREFS_KEY)})||"{}")||{};
var r=document.documentElement;
var t=p.theme==="dark"||p.theme==="light"?p.theme:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
r.classList.toggle("dark",t==="dark");
r.style.setProperty("color-scheme",t);
if(typeof p.fontSize==="number")r.style.setProperty("--reading-size",p.fontSize+"px");
if(typeof p.lineHeight==="number")r.style.setProperty("--reading-leading",String(p.lineHeight));
r.dataset.readingFont=p.font==="sans"?"sans":"serif";
}catch(e){}})();`;

export function PrefsBootScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
