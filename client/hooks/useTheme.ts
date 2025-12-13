import { Colors, ThemeMode } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { AppTheme } from "@/contexts/ReadingContext";

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
  
  const isDark = effectiveMode === "dark" || effectiveMode === "midnight" || effectiveMode === "dusk" || effectiveMode === "forest" || effectiveMode === "darkNight" || effectiveMode === "nightSepia" || effectiveMode === "deepBlue";
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

export function useAppTheme(appTheme: AppTheme = "light", autoAppTheme: boolean = true) {
  const systemColorScheme = useColorScheme();
  
  let effectiveTheme: AppTheme;
  
  if (autoAppTheme) {
    effectiveTheme = systemColorScheme === "dark" ? "dark" : "light";
  } else {
    effectiveTheme = appTheme;
  }
  
  const isDark = effectiveTheme === "dark";
  const theme = Colors[effectiveTheme] || Colors.light;

  return {
    theme,
    isDark,
    appTheme: effectiveTheme,
  };
}
