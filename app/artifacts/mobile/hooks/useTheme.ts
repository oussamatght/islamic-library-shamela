import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import colors from "@/constants/colors";
import { DEFAULT_SETTINGS, getSettings, type ThemePreference } from "@/lib/storage";

/**
 * Tiny global theme store. The settings screen calls setThemePreference();
 * every mounted useColors() instance re-renders via the subscription.
 * (A context would work too, but this avoids threading a provider through
 * every screen and keeps useColors() provider-free.)
 */

type Listener = () => void;

let currentPreference: ThemePreference = DEFAULT_SETTINGS.theme;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export async function initThemePreference(): Promise<void> {
  const settings = await getSettings();
  currentPreference = settings.theme;
  notify();
}

export async function setThemePreference(preference: ThemePreference): Promise<void> {
  currentPreference = preference;
  notify();
}

export function useThemePreference(): ThemePreference {
  const [value, setValue] = useState<ThemePreference>(currentPreference);
  useEffect(() => {
    const listener = () => setValue(currentPreference);
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return value;
}

export function resolveIsDark(
  preference: ThemePreference,
  system: string | null | undefined,
): boolean {
  if (preference === "system") return system === "dark";
  return preference === "dark";
}

export function useIsDark(): boolean {
  const preference = useThemePreference();
  const system = useColorScheme();
  return resolveIsDark(preference, system);
}
