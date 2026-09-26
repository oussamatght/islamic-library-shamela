import colors from '@/constants/colors';
import { useIsDark } from '@/hooks/useTheme';

/**
 * Returns the design tokens for the active palette.
 *
 * Priority: in-app theme preference (set from the settings screen) → OS
 * color scheme. Contains all color tokens plus scheme-independent values
 * like `radius`.
 */
export function useColors() {
  const isDark = useIsDark();
  const palette = isDark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
