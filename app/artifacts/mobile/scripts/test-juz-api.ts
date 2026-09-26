/** Probe alquran.cloud /juz/{n} — real shape check for the Juz tab. */
type AyahRaw = {
  number: number;
  numberInSurah: number;
  juz: number;
  page: number;
  surah: { number: number; name: string; englishName: string };
};

async function probe(juz: number) {
  const response = await fetch(
    `https://api.alquran.cloud/v1/juz/${juz}/quran-uthmani`,
  );
  console.log(`juz/${juz}: HTTP`, response.status);
  if (!response.ok) return;
  const payload = (await response.json()) as { data?: { ayahs?: AyahRaw[] } };
  const ayahs = payload.data?.ayahs ?? [];
  console.log("  ayahs:", ayahs.length);
  const bySurah = new Map<
    number,
    { name: string; from: number; to: number; firstPage: number; lastPage: number }
  >();
  for (const ayah of ayahs) {
    const entry = bySurah.get(ayah.surah.number);
    if (entry) {
      entry.to = ayah.numberInSurah;
      entry.lastPage = ayah.page;
    } else {
      bySurah.set(ayah.surah.number, {
        name: ayah.surah.name,
        from: ayah.numberInSurah,
        to: ayah.numberInSurah,
        firstPage: ayah.page,
        lastPage: ayah.page,
      });
    }
  }
  console.log("  surahs:", [...bySurah.entries()].map(([id, s]) => `${id} ${s.name} ${s.from}-${s.to} (ص${s.firstPage})`).join(" | "));
}

async function main() {
  await probe(1);
  await probe(2);
  await probe(30);
}

main().catch((error: unknown) => {
  console.error("PROBE FAILED:", error);
  process.exit(1);
});
