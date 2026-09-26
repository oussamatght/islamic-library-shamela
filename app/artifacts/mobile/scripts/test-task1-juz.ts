/** Task-1 juz verification against the real API. */
import { fetchQuranJuz } from "../lib/api/quran";

async function main() {
  const juz1 = await fetchQuranJuz(1);
  if (juz1.ayahCount < 140 || juz1.ayahCount > 160)
    throw new Error(`juz1 ayah count unexpected: ${juz1.ayahCount}`);
  if (juz1.surahRanges.length !== 2)
    throw new Error(`juz1 should span 2 surahs, got ${juz1.surahRanges.length}`);
  console.log("juz1:", juz1.ayahCount, "آية |", juz1.surahRanges.map((r) => `${r.surahId}:${r.fromAyah}-${r.toAyah}`).join(" , "), "| v1:", juz1.verses[0].text.slice(0, 30));

  const juz2 = await fetchQuranJuz(2);
  const baqarah = juz2.surahRanges.find((r) => r.surahId === 2);
  if (!baqarah || baqarah.fromAyah !== 142 || baqarah.toAyah !== 252)
    throw new Error(`juz2 Al-Baqarah range wrong: ${JSON.stringify(baqarah)}`);
  console.log("juz2:", juz2.ayahCount, "آية | البقرة", baqarah.fromAyah, "-", baqarah.toAyah);

  const juz30 = await fetchQuranJuz(30);
  if (juz30.surahRanges.length < 30)
    throw new Error(`juz30 should span 37 surahs, got ${juz30.surahRanges.length}`);
  const last = juz30.surahRanges[juz30.surahRanges.length - 1];
  if (last.surahId !== 114) throw new Error("juz30 must end at An-Nas (114)");
  console.log("juz30:", juz30.ayahCount, "آية |", juz30.surahRanges.length, "سورة | آخر سورة:", last.nameArabic, last.fromAyah, "-", last.toAyah);

  // Invalid input rejected without network:
  try {
    await fetchQuranJuz(31);
    throw new Error("juz=31 should have thrown");
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "JUZ_NOT_FOUND") throw error;
    console.log("invalid juz rejected with JUZ_NOT_FOUND ✓");
  }

  console.log("TASK1 JUZ: ALL CHECKS PASSED");
}

main().catch((error) => {
  console.error("TASK1 JUZ FAILED:", error);
  process.exit(1);
});
