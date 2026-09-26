import {
  pgTable,
  serial,
  varchar,
  timestamp,
  date,
  integer,
  boolean,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
// drizzle-zod 0.8.x is built on zod/v4 internally — importing from "zod/v4"
// keeps our hand-written refinements type-compatible with the generated ones.
import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
// Single-user-per-device model: the client generates a stable UUID on first
// launch (AsyncStorage) and sends it as `X-Device-Id` on every request. The
// server upserts the user row on first sight — no auth flow needed for v1.
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    deviceId: varchar("device_id", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_device_id_unique").on(table.deviceId)],
);

// ---------------------------------------------------------------------------
// wird_settings — the user's daily Quran portion ("الورد اليومي")
// ---------------------------------------------------------------------------
// Two modes supported by the client:
//  - pages/day    : targetPages filled, targetDays null  (e.g. 4 pages daily)
//  - khatma/days  : targetDays filled, targetPages null  (finish in N days;
//                   the server derives pages/day from 604 total Mushaf pages)
export const wirdSettings = pgTable(
  "wird_settings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mode: varchar("mode", { length: 16 }).notNull().default("pages"), // "pages" | "khatma"
    targetPages: integer("target_pages"), // pages per day (mode=pages)
    targetDays: integer("target_days"), // finish the mushaf in N days (mode=khatma)
    startSurahId: integer("start_surah_id").notNull().default(1),
    startAyah: integer("start_ayah").notNull().default(1),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("wird_settings_user_unique").on(table.userId)],
);

// ---------------------------------------------------------------------------
// reading_progress — one row per (user, day) tracking the daily portion
// ---------------------------------------------------------------------------
export const readingProgress = pgTable(
  "reading_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(), // local date "YYYY-MM-DD" (client timezone)
    pagesRead: integer("pages_read").notNull().default(0),
    targetPages: integer("target_pages").notNull(), // snapshot of the daily target
    completed: boolean("completed").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("reading_progress_user_day_unique").on(table.userId, table.day)],
);

// ---------------------------------------------------------------------------
// favorites — ayat / hadiths / adhkar the user saved
// ---------------------------------------------------------------------------
export const favorites = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull(), // "ayah" | "hadith" | "dhikr"
    refId: varchar("ref_id", { length: 64 }).notNull(), // e.g. "112:3" | "66529" | "hisn-28-99"
    title: varchar("title", { length: 200 }).notNull(),
    text: text("text").notNull(),
    subtitle: varchar("subtitle", { length: 200 }), // source / surah name
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("favorites_user_ref_unique").on(table.userId, table.kind, table.refId),
    index("favorites_user_idx").on(table.userId),
  ],
);

// ---------------------------------------------------------------------------
// reading_position — resume-point of the mushaf (one per user)
// ---------------------------------------------------------------------------
export const readingPosition = pgTable(
  "reading_position",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    surahId: integer("surah_id").notNull(),
    surahName: varchar("surah_name", { length: 60 }),
    ayahNumber: integer("ayah_number").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("reading_position_user_unique").on(table.userId)],
);

// ---------------------------------------------------------------------------
// Zod schemas (drizzle-zod) for request validation
// ---------------------------------------------------------------------------
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const selectUserSchema = createSelectSchema(users);

export const upsertWirdSchema = createInsertSchema(wirdSettings)
  .omit({ id: true, userId: true, createdAt: true })
  .extend({
    mode: z.enum(["pages", "khatma"]),
    // pages mode: 1..604 pages/day ; khatma mode: 1..3650 days
    targetPages: z.number().int().min(1).max(604).nullish(),
    targetDays: z.number().int().min(1).max(3650).nullish(),
  })
  .refine(
    (value) =>
      value.mode === "pages"
        ? value.targetPages != null
        : value.targetDays != null,
    { message: "targetPages مطلوب في وضع pages، وtargetDays في وضع khatma" },
  );

export const updateProgressSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "day يجب أن يكون بصيغة YYYY-MM-DD"),
  addPages: z.number().int().min(-50).max(50),
});

export const upsertPositionSchema = z.object({
  surahId: z.number().int().min(1).max(114),
  surahName: z.string().max(60).optional(),
  ayahNumber: z.number().int().min(1).max(286),
});

export const createFavoriteSchema = createInsertSchema(favorites)
  .omit({ id: true, userId: true, createdAt: true })
  .extend({
    kind: z.enum(["ayah", "hadith", "dhikr"]),
    refId: z.string().min(1).max(64),
    title: z.string().min(1).max(200),
    text: z.string().min(1),
    subtitle: z.string().max(200).nullish(),
  });

export type User = typeof users.$inferSelect;
export type WirdSetting = typeof wirdSettings.$inferSelect;
export type ReadingProgressRow = typeof readingProgress.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type ReadingPosition = typeof readingPosition.$inferSelect;
