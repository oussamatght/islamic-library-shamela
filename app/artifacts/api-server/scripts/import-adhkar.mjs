#!/usr/bin/env node
/**
 * Regenerates the Hisn Muslim adhkar categories manifest.
 *
 * The manifest is a deterministic, source-reproducible index of the Hisn
 * Muslim adhkar library (https://www.hisnmuslim.com). Running this script on
 * different machines yields the same file for the same upstream snapshot, and
 * re-running it never duplicates entries (each category is upserted by its
 * stable source id).
 *
 * Usage:
 *   node scripts/import-adhkar.mjs
 */
import { mkdirSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HISN_API = "https://www.hisnmuslim.com/api/ar";
const MAX_CATEGORIES = 200;
const OUTPUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/data/hisn-categories.json",
);

function stableId(source) {
  return `hisn-${source}`;
}

async function fetchCategoryCard(sourceId) {
  const response = await fetch(`${HISN_API}/${sourceId}.json`, {
    headers: { "user-agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const entries = Object.entries(payload);
  const first = entries[0];
  if (!first || !Array.isArray(first[1])) return null;
  const nameAr = String(first[0]).trim();
  if (!nameAr) return null;
  const items = first[1].filter(
    (item) => item && typeof item === "object" && item.ID != null,
  );
  if (items.length === 0) return null;
  return {
    id: stableId(sourceId),
    source: sourceId,
    nameAr,
    count: items.length,
    order: sourceId,
  };
}

async function main() {
  const categories = [];
  for (let source = 1; source <= MAX_CATEGORIES; source += 1) {
    process.stdout.write(`Fetching hisn-${source} ...`);
    const category = await fetchCategoryCard(source);
    if (category) {
      categories.push(category);
      process.stdout.write(` ${category.count} items\n`);
    } else {
      process.stdout.write(" absent\n");
      // Categories are sequential; stop at the first gap to keep the probe cheap.
      if (source > 20) break;
    }
  }

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(
    OUTPUT,
    `${JSON.stringify(categories, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(`Wrote ${categories.length} categories to ${OUTPUT}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});