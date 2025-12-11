import { Colors, ThemeMode } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";

export function useTheme(overrideMode?: ThemeMode, autoTheme: boolean = true) {
  const systemColorScheme = useColorScheme();
  
  let effectiveMode: ThemeMode;
  
  if (autoTheme) {
    effectiveMode = systemColorScheme === "dark" ? "dark" : "light";
  } else if (overrideMode) {
    effectiveMode = overrideMode;
  } else {
    effectiveMode = systemColorScheme === "dark" ? "dark" : "light";
  }
  
  const isDark = effectiveMode === "dark" || effectiveMode === "midnight" || effectiveMode === "dusk" || effectiveMode === "forest";
  const isSepia = effectiveMode === "sepia";
  const isAmoled = effectiveMode === "midnight";
  const theme = Colors[effectiveMode] || Colors.light;

  return {
    theme,
    isDark,
    isSepia,
    isAmoled,
    themeMode: effectiveMode,
  };
}
