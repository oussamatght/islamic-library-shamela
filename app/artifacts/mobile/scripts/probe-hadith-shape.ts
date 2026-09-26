import { fetchHadithBooks, fetchBookHadiths } from "../lib/api/hadith";
import { fetchAdhkarCollection } from "../lib/api/adhkar";
import { fetchQuranChapterPages, fetchQuranSurah } from "../lib/api/quran";

async function main() {
  console.log("— Hadith books:");
  const books = await fetchHadithBooks();
  console.log("  count:", books.length, "| sample:", books.slice(0, 3).map((b) => b.nameAr).join(" / "));

  console.log("— Bukhari page 1 (5 items):");
  const bukhari = await fetchBookHadiths("bukhari", 1, 5);
  console.log("  items:", bukhari.items.length, "| total:", bukhari.total, "| hasMore:", bukhari.hasMore);
  console.log("  first text:", bukhari.items[0]?.text.slice(0, 60));

  console.log("— Muslim page 2 (3 items):");
  const muslim = await fetchBookHadiths("muslim", 2, 3);
  console.log("  items:", muslim.items.length, "| page:", muslim.page, "| source:", muslim.items[0]?.source);

  console.log("— Chapter pages (quran.com):");
  const pages = await fetchQuranChapterPages();
  console.log("  count:", pages.length, "| ch1:", JSON.stringify(pages[0]));

  console.log("— Adhkar (hisn-27):");
  const adhkar = await fetchAdhkarCollection("hisn-27");
  console.log("  cat:", adhkar[0].title, "| items:", adhkar[0].items.length);

  console.log("— Surah 36 (page mapping sanity):");
  const yaseen = await fetchQuranSurah(36);
  console.log("  verses:", yaseen.verses.length, "| first page:", yaseen.verses[0].page);
}

main()
  .then(() => {
    console.log("\n✅ FEATURE SMOKE PASSED");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ FAILED:", error);
    process.exit(1);
  });
