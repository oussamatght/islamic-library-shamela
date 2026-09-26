import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type FavoriteItem,
  addFavorite,
  getFavorites,
  getSettings,
  getWirdSummary,
  removeFavorite,
  saveSettings,
} from "@/lib/storage";

/** Settings loaded once from storage; save() persists and updates state. */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const value = await getSettings();
      if (active) {
        setSettings(value);
        setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await saveSettings(patch);
    setSettings(next);
  }, []);

  return { settings, ready, save };
}

/** Live wird summary for the home card; call refresh() after logging pages. */
export function useWirdSummary(): Awaited<ReturnType<typeof getWirdSummary>> & {
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<Awaited<ReturnType<typeof getWirdSummary>>>({
    goal: null,
    today: null,
    streak: { current: 0, longest: 0 },
    totalCompletedDays: 0,
  });

  const refresh = useCallback(async () => {
    const summary = await getWirdSummary();
    setData(summary);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...data, refresh };
}

/** Favorites list with an imperative toggle that keeps state in sync. */
export function useFavoritesList() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  const refresh = useCallback(async () => {
    setFavorites(await getFavorites());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (item: Omit<FavoriteItem, "id" | "createdAt">) => {
      const isFav = favorites.some(
        (candidate) => candidate.kind === item.kind && candidate.refId === item.refId,
      );
      if (isFav) {
        await removeFavorite(item.kind, item.refId);
      } else {
        await addFavorite(item);
      }
      await refresh();
      return !isFav;
    },
    [favorites, refresh],
  );

  const isFavorite = useCallback(
    (kind: FavoriteItem["kind"], refId: string) =>
      favorites.some((candidate) => candidate.kind === kind && candidate.refId === refId),
    [favorites],
  );

  return { favorites, refresh, toggle, isFavorite };
}
