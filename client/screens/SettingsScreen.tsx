import React, { useState } from "react";
import { View, StyleSheet, Switch, Pressable, ScrollView, Alert, Share, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, ReadingDefaults, AvailableFonts, ThemeMode, ThemeNames, Colors, ReadingModes, ReadingMode, ScrollModes, ScrollMode, TapScrollLinePosition, TapScrollLinePositionType, AutoScrollDefaults, TapScrollDefaults } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useReading } from "@/contexts/ReadingContext";
import { ProgressRing } from "@/components/ProgressRing";

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

const themeOptions: ThemeOption[] = [
  { mode: "light", label: "Day", bgColor: "#FAFAFA", textColor: "#1A1A2E", accentColor: "#6366F1" },
  { mode: "dark", label: "Night", bgColor: "#0A0A0F", textColor: "#F5F5F7", accentColor: "#818CF8" },
  { mode: "sepia", label: "Paper", bgColor: "#F8F4EC", textColor: "#3D2E1F", accentColor: "#A0785C" },
  { mode: "dusk", label: "Dusk", bgColor: "#1A1625", textColor: "#E8E4F0", accentColor: "#B794F6" },
  { mode: "midnight", label: "AMOLED", bgColor: "#000000", textColor: "#E5E5E5", accentColor: "#3B82F6" },
  { mode: "forest", label: "Forest", bgColor: "#0F1A14", textColor: "#E8EDE8", accentColor: "#4ADE80" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { settings, updateSettings, exportData, books, stats, applyReadingMode } = useReading();
  const [isExporting, setIsExporting] = useState(false);

  const handleThemeChange = (mode: ThemeMode) => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({ themeMode: mode, autoTheme: false });
  };

  const handleAutoThemeToggle = (value: boolean) => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({ autoTheme: value });
  };

  const handleFontChange = (fontValue: string) => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({ fontFamily: fontValue });
  };

  const handleReadingModeChange = (mode: ReadingMode) => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    applyReadingMode(mode);
  };

  const handleScrollModeChange = (mode: ScrollMode) => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    updateSettings({ scrollMode: mode });
  };

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({ [key]: value });
  };

  const handleExportJSON = async () => {
    if (books.length === 0) {
      Alert.alert("No Data", "You don't have any books with bookmarks or notes to export.");
      return;
    }

    try {
      setIsExporting(true);
      const jsonData = await exportData();
      
      await Share.share({
        message: jsonData,
        title: "Bookwise Export (JSON)",
      });
      
      if (settings.hapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Export Failed", "Could not export your data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (books.length === 0) {
      Alert.alert("No Data", "You don't have any books with bookmarks or notes to export.");
      return;
    }

    try {
      setIsExporting(true);
      
      let csvContent = "Book Title,Author,Type,Page,Content,Created At\n";
      
      books.forEach((book) => {
        book.bookmarks.forEach((bookmark) => {
          csvContent += `"${book.title}","${book.author}","Bookmark",${bookmark.page},"",${new Date(bookmark.createdAt).toISOString()}\n`;
        });
        book.notes.forEach((note) => {
          const escapedContent = note.content.replace(/"/g, '""');
          const escapedSelectedText = note.selectedText.replace(/"/g, '""');
          csvContent += `"${book.title}","${book.author}","Note",${note.page},"${escapedSelectedText}: ${escapedContent}",${new Date(note.createdAt).toISOString()}\n`;
        });
      });

      await Share.share({
        message: csvContent,
        title: "Bookwise Export (CSV)",
      });
      
      if (settings.hapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Export Failed", "Could not export your data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const totalBookmarks = books.reduce((acc, book) => acc + book.bookmarks.length, 0);
  const totalNotes = books.reduce((acc, book) => acc + book.notes.length, 0);
  const totalReadingMinutes = Math.round(stats.totalReadingTime / 60);
  const dailyGoalProgress = settings.dailyGoal > 0 
    ? Math.min(100, (stats.todayReadingTime / 60 / settings.dailyGoal) * 100) 
    : 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Today's Progress
          </ThemedText>

          <View style={[styles.card, styles.progressCard, { backgroundColor: theme.backgroundDefault }]}>
            <ProgressRing 
              progress={dailyGoalProgress} 
              size={100}
              strokeWidth={8}
              label="Daily Goal"
            />
            <View style={styles.progressStats}>
              <View style={styles.progressStatItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>
                  {Math.round(stats.todayReadingTime / 60)}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>
                  min today
                </ThemedText>
              </View>
              <View style={styles.progressStatItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>
                  {stats.currentStreak}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>
                  day streak
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Reading Mode
          </ThemedText>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.readingModes}
          >
            {(Object.keys(ReadingModes) as ReadingMode[]).map((mode) => {
              const modeData = ReadingModes[mode];
              const isSelected = settings.readingMode === mode;
              return (
                <Pressable
                  key={mode}
                  style={[
                    styles.readingModeCard,
                    {
                      backgroundColor: isSelected ? theme.accent : theme.backgroundDefault,
                      borderColor: isSelected ? theme.accent : theme.border,
                    },
                  ]}
                  onPress={() => handleReadingModeChange(mode)}
                >
                  <ThemedText
                    style={[
                      styles.readingModeName,
                      { color: isSelected ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {modeData.name}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.readingModeDesc,
                      { color: isSelected ? "rgba(255,255,255,0.8)" : theme.secondaryText },
                    ]}
                  >
                    {modeData.description}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Scroll Mode
          </ThemedText>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.readingModes}
          >
            {(Object.keys(ScrollModes) as ScrollMode[]).map((mode) => {
              const modeData = ScrollModes[mode];
              const isSelected = settings.scrollMode === mode;
              const iconName = mode === "seamless" ? "arrow-down" : mode === "tapScroll" ? "mouse-pointer" : "play";
              return (
                <Pressable
                  key={mode}
                  style={[
                    styles.readingModeCard,
                    {
                      backgroundColor: isSelected ? theme.accent : theme.backgroundDefault,
                      borderColor: isSelected ? theme.accent : theme.border,
                    },
                  ]}
                  onPress={() => handleScrollModeChange(mode)}
                >
                  <Feather 
                    name={iconName} 
                    size={20} 
                    color={isSelected ? "#FFFFFF" : theme.text} 
                    style={{ marginBottom: 4 }}
                  />
                  <ThemedText
                    style={[
                      styles.readingModeName,
                      { color: isSelected ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {modeData.name}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.readingModeDesc,
                      { color: isSelected ? "rgba(255,255,255,0.8)" : theme.secondaryText },
                    ]}
                  >
                    {modeData.description}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {settings.scrollMode === "autoScroll" && (
            <View style={[styles.card, { backgroundColor: theme.backgroundDefault, marginTop: Spacing.md }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingLabelRow}>
                  <Feather name="fast-forward" size={20} color={theme.text} />
                  <View>
                    <ThemedText style={styles.settingLabel}>Auto-Scroll Speed</ThemedText>
                    <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                      {settings.autoScrollSpeed} px/sec
                    </ThemedText>
                  </View>
                </View>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={AutoScrollDefaults.minSpeed}
                maximumValue={AutoScrollDefaults.maxSpeed}
                step={5}
                value={settings.autoScrollSpeed}
                onValueChange={(value) => updateSettings({ autoScrollSpeed: value })}
                minimumTrackTintColor={theme.accent}
                maximumTrackTintColor={theme.backgroundTertiary}
                thumbTintColor={theme.accent}
              />
            </View>
          )}

          {settings.scrollMode === "tapScroll" && (
            <>
              <View style={[styles.card, { backgroundColor: theme.backgroundDefault, marginTop: Spacing.md }]}>
                <View style={styles.settingRow}>
                  <View style={styles.settingLabelRow}>
                    <Feather name="activity" size={20} color={theme.text} />
                    <View>
                      <ThemedText style={styles.settingLabel}>Scroll Animation Speed</ThemedText>
                      <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                        {settings.tapScrollAnimationSpeed} ms
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={TapScrollDefaults.minAnimationSpeed}
                  maximumValue={TapScrollDefaults.maxAnimationSpeed}
                  step={50}
                  value={settings.tapScrollAnimationSpeed}
                  onValueChange={(value) => updateSettings({ tapScrollAnimationSpeed: value })}
                  minimumTrackTintColor={theme.accent}
                  maximumTrackTintColor={theme.backgroundTertiary}
                  thumbTintColor={theme.accent}
                />
              </View>

              <View style={[styles.card, { backgroundColor: theme.backgroundDefault, marginTop: Spacing.md }]}>
                <View style={styles.settingRow}>
                  <View style={styles.settingLabelRow}>
                    <Feather name="align-center" size={20} color={theme.text} />
                    <View>
                      <ThemedText style={styles.settingLabel}>Last Line Position</ThemedText>
                      <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                        Where to place the last visible line after tap
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <View style={styles.linePositionOptions}>
                  {(Object.keys(TapScrollLinePosition) as TapScrollLinePositionType[]).map((position) => {
                    const positionData = TapScrollLinePosition[position];
                    const isSelected = settings.tapScrollLinePosition === position;
                    return (
                      <Pressable
                        key={position}
                        style={[
                          styles.linePositionOption,
                          {
                            backgroundColor: isSelected ? theme.accent : theme.backgroundSecondary,
                          },
                        ]}
                        onPress={() => {
                          if (settings.hapticFeedback) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          updateSettings({ tapScrollLinePosition: position });
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.linePositionOptionText,
                            { color: isSelected ? "#FFFFFF" : theme.text },
                          ]}
                        >
                          {positionData.name}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Typography
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingRow}>
              <ThemedText>Font Size</ThemedText>
              <ThemedText style={{ color: theme.secondaryText }}>
                {Math.round(settings.fontSize)}pt
              </ThemedText>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={ReadingDefaults.minFontSize}
              maximumValue={ReadingDefaults.maxFontSize}
              value={settings.fontSize}
              onValueChange={(value) => updateSettings({ fontSize: value })}
              minimumTrackTintColor={theme.accent}
              maximumTrackTintColor={theme.backgroundTertiary}
              thumbTintColor={theme.accent}
            />
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingRow}>
              <ThemedText>Line Spacing</ThemedText>
              <ThemedText style={{ color: theme.secondaryText }}>
                {settings.lineSpacing.toFixed(1)}
              </ThemedText>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={ReadingDefaults.minLineSpacing}
              maximumValue={ReadingDefaults.maxLineSpacing}
              step={0.1}
              value={settings.lineSpacing}
              onValueChange={(value) => updateSettings({ lineSpacing: value })}
              minimumTrackTintColor={theme.accent}
              maximumTrackTintColor={theme.backgroundTertiary}
              thumbTintColor={theme.accent}
            />
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingRow}>
              <ThemedText>Letter Spacing</ThemedText>
              <ThemedText style={{ color: theme.secondaryText }}>
                {(settings.letterSpacing || 0).toFixed(1)}
              </ThemedText>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={ReadingDefaults.minLetterSpacing}
              maximumValue={ReadingDefaults.maxLetterSpacing}
              step={0.1}
              value={settings.letterSpacing || 0}
              onValueChange={(value) => updateSettings({ letterSpacing: value })}
              minimumTrackTintColor={theme.accent}
              maximumTrackTintColor={theme.backgroundTertiary}
              thumbTintColor={theme.accent}
            />
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={styles.cardLabel}>Font</ThemedText>
            <View style={styles.fontOptions}>
              {AvailableFonts.map((font) => (
                <Pressable
                  key={font.value}
                  style={[
                    styles.fontOption,
                    {
                      backgroundColor:
                        settings.fontFamily === font.value
                          ? theme.accent
                          : theme.backgroundSecondary,
                    },
                  ]}
                  onPress={() => handleFontChange(font.value)}
                >
                  <ThemedText
                    style={[
                      styles.fontOptionText,
                      {
                        color:
                          settings.fontFamily === font.value
                            ? "#FFFFFF"
                            : theme.text,
                      },
                    ]}
                  >
                    {font.name}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Reading Features
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Feather name="zap" size={20} color={theme.text} />
                <View>
                  <ThemedText style={styles.settingLabel}>Bionic Reading</ThemedText>
                  <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                    Bold first half of words for faster reading
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={settings.bionicReading}
                onValueChange={(value) => handleToggle("bionicReading", value)}
                trackColor={{ false: theme.backgroundTertiary, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Feather name="target" size={20} color={theme.text} />
                <View>
                  <ThemedText style={styles.settingLabel}>Focus Mode</ThemedText>
                  <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                    Zen mode with minimal UI and timer
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={settings.focusMode}
                onValueChange={(value) => handleToggle("focusMode", value)}
                trackColor={{ false: theme.backgroundTertiary, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
            {settings.focusMode && (
              <View style={[styles.focusHint, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="coffee" size={14} color={theme.accent} />
                <ThemedText style={[styles.focusHintText, { color: theme.secondaryText }]}>
                  Break reminder every 25 min (Pomodoro)
                </ThemedText>
              </View>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Feather name="smartphone" size={20} color={theme.text} />
                <View>
                  <ThemedText style={styles.settingLabel}>Haptic Feedback</ThemedText>
                  <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                    Vibration on interactions
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={settings.hapticFeedback}
                onValueChange={(value) => handleToggle("hapticFeedback", value)}
                trackColor={{ false: theme.backgroundTertiary, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Feather name="align-left" size={20} color={theme.text} />
                <View>
                  <ThemedText style={styles.settingLabel}>Text Alignment</ThemedText>
                  <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                    {settings.textAlignment === "left" ? "Left aligned" : "Justified"}
                  </ThemedText>
                </View>
              </View>
              <Pressable
                style={[styles.alignmentToggle, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => {
                  if (settings.hapticFeedback) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  updateSettings({ textAlignment: settings.textAlignment === "left" ? "justify" : "left" });
                }}
              >
                <ThemedText style={styles.alignmentToggleText}>
                  {settings.textAlignment === "left" ? "Left" : "Justify"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Goals
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingRow}>
              <ThemedText>Daily Reading Goal</ThemedText>
              <ThemedText style={{ color: theme.accent, fontWeight: "600" }}>
                {settings.dailyGoal} min
              </ThemedText>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={5}
              maximumValue={120}
              step={5}
              value={settings.dailyGoal}
              onValueChange={(value) => updateSettings({ dailyGoal: value })}
              minimumTrackTintColor={theme.accent}
              maximumTrackTintColor={theme.backgroundTertiary}
              thumbTintColor={theme.accent}
            />
            <ThemedText style={[styles.settingHint, { color: theme.secondaryText, marginTop: Spacing.sm }]}>
              Set your daily reading time target
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Тема приложения
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Feather name="sun" size={20} color={theme.text} />
                <View>
                  <ThemedText style={styles.settingLabel}>Авто тема</ThemedText>
                  <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                    Следовать системной теме
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={settings.autoAppTheme}
                onValueChange={(value) => {
                  if (settings.hapticFeedback) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  updateSettings({ autoAppTheme: value });
                }}
                trackColor={{ false: theme.backgroundTertiary, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={[styles.appThemeToggle, { backgroundColor: theme.backgroundDefault }]}>
            <Pressable
              style={[
                styles.appThemeOption,
                {
                  backgroundColor: !settings.autoAppTheme && settings.appTheme === "light" 
                    ? theme.accent 
                    : theme.backgroundSecondary,
                  opacity: settings.autoAppTheme ? 0.5 : 1,
                },
              ]}
              onPress={() => {
                if (!settings.autoAppTheme) {
                  if (settings.hapticFeedback) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  updateSettings({ appTheme: "light" });
                }
              }}
              disabled={settings.autoAppTheme}
            >
              <Feather 
                name="sun" 
                size={22} 
                color={!settings.autoAppTheme && settings.appTheme === "light" ? "#FFFFFF" : theme.text} 
              />
              <ThemedText
                style={[
                  styles.appThemeOptionText,
                  { color: !settings.autoAppTheme && settings.appTheme === "light" ? "#FFFFFF" : theme.text },
                ]}
              >
                Светлая
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.appThemeOption,
                {
                  backgroundColor: !settings.autoAppTheme && settings.appTheme === "dark" 
                    ? theme.accent 
                    : theme.backgroundSecondary,
                  opacity: settings.autoAppTheme ? 0.5 : 1,
                },
              ]}
              onPress={() => {
                if (!settings.autoAppTheme) {
                  if (settings.hapticFeedback) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  updateSettings({ appTheme: "dark" });
                }
              }}
              disabled={settings.autoAppTheme}
            >
              <Feather 
                name="moon" 
                size={22} 
                color={!settings.autoAppTheme && settings.appTheme === "dark" ? "#FFFFFF" : theme.text} 
              />
              <ThemedText
                style={[
                  styles.appThemeOptionText,
                  { color: !settings.autoAppTheme && settings.appTheme === "dark" ? "#FFFFFF" : theme.text },
                ]}
              >
                Тёмная
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Тема чтения
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Feather name="book-open" size={20} color={theme.text} />
                <View>
                  <ThemedText style={styles.settingLabel}>Авто тема чтения</ThemedText>
                  <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                    Следовать системной теме
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={settings.autoTheme}
                onValueChange={handleAutoThemeToggle}
                trackColor={{ false: theme.backgroundTertiary, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.themeGrid}>
            {themeOptions.map((option) => (
              <Pressable
                key={option.mode}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: option.bgColor,
                    borderWidth: !settings.autoTheme && settings.themeMode === option.mode ? 2 : 1,
                    borderColor:
                      !settings.autoTheme && settings.themeMode === option.mode
                        ? option.accentColor
                        : theme.border,
                    opacity: settings.autoTheme ? 0.5 : 1,
                  },
                ]}
                onPress={() => handleThemeChange(option.mode)}
                disabled={settings.autoTheme}
              >
                <View style={styles.themePreview}>
                  <View
                    style={[
                      styles.themePreviewLine,
                      { backgroundColor: option.textColor, width: "80%" },
                    ]}
                  />
                  <View
                    style={[
                      styles.themePreviewLine,
                      { backgroundColor: option.textColor, width: "50%" },
                    ]}
                  />
                </View>
                <ThemedText
                  style={[styles.themeLabel, { color: option.textColor }]}
                >
                  {option.label}
                </ThemedText>
                {!settings.autoTheme && settings.themeMode === option.mode && (
                  <View style={[styles.checkmark, { backgroundColor: option.accentColor }]}>
                    <Feather name="check" size={12} color="#FFFFFF" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Statistics
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>
                  {books.length}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>
                  Books
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>
                  {totalReadingMinutes}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>
                  Minutes Read
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>
                  {stats.averageReadingSpeed}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>
                  WPM
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>
                  {stats.longestStreak}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>
                  Best Streak
                </ThemedText>
              </View>
            </View>
            <View style={[styles.statsGrid, { marginTop: Spacing.lg }]}>
              <View style={styles.statItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>
                  {totalBookmarks}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>
                  Bookmarks
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>
                  {totalNotes}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>
                  Notes
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>
                  {stats.totalPagesRead}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>
                  Pages Read
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Data
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={styles.cardLabel}>Export</ThemedText>
            <View style={styles.exportButtons}>
              <Pressable
                style={[styles.exportButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={handleExportJSON}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <>
                    <Feather name="file-text" size={20} color={theme.text} />
                    <ThemedText style={styles.exportButtonText}>JSON</ThemedText>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[styles.exportButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={handleExportCSV}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <>
                    <Feather name="file" size={20} color={theme.text} />
                    <ThemedText style={styles.exportButtonText}>CSV</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
            <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
              Export bookmarks and notes
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            About
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.aboutRow}>
              <ThemedText>Version</ThemedText>
              <ThemedText style={{ color: theme.secondaryText }}>2.0.0</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing["2xl"],
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
  },
  progressStats: {
    flex: 1,
    gap: Spacing.lg,
  },
  progressStatItem: {
    alignItems: "flex-start",
  },
  cardLabel: {
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  settingLabel: {
    fontWeight: "500",
  },
  settingHint: {
    fontSize: 12,
  },
  slider: {
    marginTop: Spacing.md,
    height: 40,
  },
  readingModes: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  readingModeCard: {
    width: 140,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  readingModeName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  readingModeDesc: {
    fontSize: 12,
  },
  fontOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  fontOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  fontOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  themeCard: {
    width: "30%",
    aspectRatio: 0.85,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    justifyContent: "space-between",
  },
  themePreview: {
    gap: 4,
    marginTop: Spacing.xs,
  },
  themePreviewLine: {
    height: 3,
    borderRadius: 1.5,
    opacity: 0.4,
  },
  themeLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: Spacing.lg,
  },
  statItem: {
    alignItems: "center",
    minWidth: 70,
  },
  statLabel: {
    fontSize: 11,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  exportButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  exportButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  exportButtonText: {
    fontWeight: "600",
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alignmentToggle: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  alignmentToggleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  focusHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  focusHintText: {
    fontSize: 12,
  },
  linePositionOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  linePositionOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  linePositionOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  appThemeToggle: {
    flexDirection: "row",
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  appThemeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  appThemeOptionText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
