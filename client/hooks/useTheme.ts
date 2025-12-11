import { Colors, ThemeMode } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";

export function useTheme(overrideMode?: ThemeMode, autoTheme: boolean = true) {
  const systemColorScheme = useColorScheme();
  
  let effectiveMode: ThemeMode;
  
  if (autoTheme || !overrideMode) {
    effectiveMode = systemColorScheme === "dark" ? "dark" : "light";
  } else {
    effectiveMode = overrideMode;
  }
  
  const isDark = effectiveMode === "dark";
  const isSepia = effectiveMode === "sepia";
  const theme = Colors[effectiveMode] || Colors.light;

  return {
    theme,
    isDark,
    isSepia,
    themeMode: effectiveMode,
  };
}
