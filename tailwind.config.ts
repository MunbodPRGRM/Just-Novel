import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        /* ต่ำกว่านี้ (iPhone SE รุ่นเก่า ~320px) ต้องยอมตัดของบางชิ้นทิ้ง */
        xs: "360px",
      },
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        border: "var(--border)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
      },
      fontFamily: {
        ui: ["var(--font-ui)", "system-ui", "sans-serif"],
        reading: ["var(--font-reading)", "Georgia", "serif"],
        /* ฟอนต์ไทยไม่มีหัว — ใช้โชว์ตัวอย่างในแผงตั้งค่า */
        loopless: ["var(--font-loopless)", "Noto Sans Thai", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
