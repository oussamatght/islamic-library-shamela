/**
 * Task-1 verification: real Quran data path (no mocks).
 * Run: npx tsx scripts/test-task1.ts
 */
import { fetchQuranSurah } from "../lib/api/quran";

async function main() {
  for (const id of [1, 2, 112]) {
    const surah = await fetchQuranSurah(id);
    const first = surah.verses[0];
    const last = surah.verses[surah.verses.length - 1];
    console.log(
      `Surah ${id} ${surah.nameArabic} | verses: ${surah.verses.length}`,
    );
    console.log(
      `  v1 (${first.verseNumber}): ${first.text.slice(0, 40).replace(/\n/g, " ")}`,
    );
    console.log(
      `  vLast ${last.verseNumber} | juz: ${first.juz} | page: ${first.page}`,
    );
    // Invariant checks that would crash / corrupt the reader UI:
    if (surah.verses.length === 0) throw new Error(`Surah ${id}: empty verses`);
    if (!first.text.trim()) throw new Error(`Surah ${id}: empty verse text`);
    if (id === 2 && surah.verses.length !== 286)
      throw new Error(`Al-Baqarah should have 286 verses, got ${surah.verses.length}`);
    if (id === 112 && surah.verses.length !== 4)
      throw new Error(`Al-Ikhlas should have 4 verses, got ${surah.verses.length}`);
    if (id === 1 && surah.verses.length !== 7)
      throw new Error(`Al-Fatihah should have 7 verses, got ${surah.verses.length}`);
    // Repeated open (reader opened twice in a row) must return stable data:
    const again = await fetchQuranSurah(id);
    if (again.verses[0].text !== first.text)
      throw new Error(`Surah ${id}: unstable verse text between calls`);
  }
  console.log("TASK1 DATA-PATH: ALL CHECKS PASSED");
}

main().catch((error) => {
  console.error("TASK1 FAILED:", error);
  process.exit(1);
});
