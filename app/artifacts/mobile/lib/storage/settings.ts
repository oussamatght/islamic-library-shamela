import { readJson, storageKeys, writeJson } from "./client";

export type ThemePreference = "light" | "dark" | "system";

export type AppSettings = {
  theme: ThemePreference;
  /** Quran reader font scale (multiplies the base size). */
  fontScale: number;
  /** api.quran.com recitation id (7 = Mishary Alafasy). */
  reciterId: number;
  prayerNotifications: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  fontScale: 1,
  reciterId: 7,
  prayerNotifications: false,
};

export const FONT_SCALES = [0.85, 1, 1.25, 1.5] as const;

export const RECITERS = [
  { id: 7, nameAr: "مشاري العفاسي" },
  { id: 1, nameAr: "عبد الباسط عبد الصمد (مجود)" },
  { id: 2, nameAr: "أبو بكر الشاطري" },
  { id: 3, nameAr: "أحمد العجمي" },
  { id: 4, nameAr: "الحصري" },
  { id: 5, nameAr: "ماهر المعيقلي" },
  { id: 6, nameAr: "منصور السالمي" },
  { id: 8, nameAr: "محمد أيوب" },
] as const;

export async function getSettings(): Promise<AppSettings> {
  const stored = await readJson<Partial<AppSettings>>(storageKeys.settings);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await writeJson(storageKeys.settings, next);
  return next;
}
