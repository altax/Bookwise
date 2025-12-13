import { Colors, ThemeMode } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { AppTheme, useReading } from "@/contexts/ReadingContext";

export function useTheme(overrideMode?: ThemeMode, overrideAutoTheme?: boolean) {
  const systemColorScheme = useColorScheme();
  
  let settings: { themeMode: ThemeMode; autoTheme: boolean } | null = null;
  try {
    const readingContext = useReading();
    settings = readingContext?.settings ? {
      themeMode: readingContext.settings.themeMode,
      autoTheme: readingContext.settings.autoTheme,
    } : null;
  } catch {
    settings = null;
  }
  
  const themeMode = overrideMode ?? settings?.themeMode ?? "light";
  const autoTheme = overrideAutoTheme ?? settings?.autoTheme ?? true;
  
  let effectiveMode: ThemeMode;
  
  if (autoTheme) {
    effectiveMode = systemColorScheme === "dark" ? "dark" : "light";
  } else {
    effectiveMode = themeMode;
  }
  
  const isDark = effectiveMode === "dark" || effectiveMode === "midnight" || effectiveMode === "dusk" || effectiveMode === "forest" || effectiveMode === "darkNight" || effectiveMode === "nightSepia" || effectiveMode === "deepBlue";
  const isSepia = effectiveMode === "sepia" || effectiveMode === "softSepia" || effectiveMode === "warmPaper";
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

export function useAppTheme(appTheme?: AppTheme, autoAppTheme?: boolean) {
  const systemColorScheme = useColorScheme();
  
  let settings: { appTheme: AppTheme; autoAppTheme: boolean } | null = null;
  try {
    const readingContext = useReading();
    settings = readingContext?.settings ? {
      appTheme: readingContext.settings.appTheme,
      autoAppTheme: readingContext.settings.autoAppTheme,
    } : null;
  } catch {
    settings = null;
  }
  
  const effectiveAppTheme = appTheme ?? settings?.appTheme ?? "light";
  const effectiveAutoAppTheme = autoAppTheme ?? settings?.autoAppTheme ?? true;
  
  let finalTheme: AppTheme;
  
  if (effectiveAutoAppTheme) {
    finalTheme = systemColorScheme === "dark" ? "dark" : "light";
  } else {
    finalTheme = effectiveAppTheme;
  }
  
  const isDark = finalTheme === "dark";
  const theme = Colors[finalTheme] || Colors.light;

  return {
    theme,
    isDark,
    appTheme: finalTheme,
  };
}
