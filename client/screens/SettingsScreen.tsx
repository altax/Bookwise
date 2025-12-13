import React, { useState } from "react";
import { View, StyleSheet, Switch, Pressable, ScrollView, Alert, Share, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme, useAppTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useReading } from "@/contexts/ReadingContext";
import { ProgressRing } from "@/components/ProgressRing";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { isDark } = useAppTheme();
  const { settings, updateSettings, exportData, books, stats } = useReading();
  const [isExporting, setIsExporting] = useState(false);

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({ [key]: value });
  };

  const handleAppThemeToggle = () => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (settings.autoAppTheme) {
      updateSettings({ autoAppTheme: false, appTheme: isDark ? "light" : "dark" });
    } else {
      updateSettings({ appTheme: settings.appTheme === "light" ? "dark" : "light" });
    }
  };

  const handleAutoAppThemeToggle = (value: boolean) => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({ autoAppTheme: value });
  };

  const handleExportJSON = async () => {
    if (books.length === 0) {
      Alert.alert("Нет данных", "У вас нет книг с закладками или заметками для экспорта.");
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
      Alert.alert("Ошибка экспорта", "Не удалось экспортировать данные. Попробуйте ещё раз.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (books.length === 0) {
      Alert.alert("Нет данных", "У вас нет книг с закладками или заметками для экспорта.");
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
      Alert.alert("Ошибка экспорта", "Не удалось экспортировать данные. Попробуйте ещё раз.");
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
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.progressSection}>
            <ProgressRing 
              progress={dailyGoalProgress} 
              size={80}
              strokeWidth={6}
              label=""
            />
            <View style={styles.progressInfo}>
              <ThemedText type="h4">Сегодня</ThemedText>
              <View style={styles.progressRow}>
                <View style={styles.progressItem}>
                  <ThemedText type="h3" style={{ color: theme.accent }}>
                    {Math.round(stats.todayReadingTime / 60)}
                  </ThemedText>
                  <ThemedText style={[styles.progressLabel, { color: theme.secondaryText }]}>
                    мин
                  </ThemedText>
                </View>
                <View style={[styles.progressDivider, { backgroundColor: theme.border }]} />
                <View style={styles.progressItem}>
                  <ThemedText type="h3" style={{ color: theme.accent }}>
                    {stats.currentStreak}
                  </ThemedText>
                  <ThemedText style={[styles.progressLabel, { color: theme.secondaryText }]}>
                    дней подряд
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            Цель
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.sliderRow}>
              <View style={styles.sliderHeader}>
                <View style={styles.settingLeft}>
                  <Feather name="target" size={20} color={theme.accent} />
                  <ThemedText style={styles.settingText}>Ежедневная цель</ThemedText>
                </View>
                <ThemedText style={[styles.sliderValue, { color: theme.accent }]}>
                  {settings.dailyGoal} мин
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
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            Статистика
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>{books.length}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>книг</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>{totalReadingMinutes}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>минут</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>{stats.longestStreak}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>рекорд</ThemedText>
              </View>
            </View>
            <View style={[styles.statsGrid, { marginTop: Spacing.lg }]}>
              <View style={styles.statItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>{totalBookmarks}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>закладок</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>{totalNotes}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>заметок</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>{stats.totalPagesRead}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>страниц</ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            Приложение
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.toggleRow}>
              <View style={styles.settingLeft}>
                <Feather name="moon" size={20} color={theme.accent} />
                <View>
                  <ThemedText style={styles.settingText}>Тёмная тема</ThemedText>
                  <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                    Внешний вид приложения
                  </ThemedText>
                </View>
              </View>
              <Pressable
                style={[
                  styles.themeToggle,
                  { backgroundColor: isDark ? theme.accent : theme.backgroundSecondary }
                ]}
                onPress={handleAppThemeToggle}
              >
                <Feather 
                  name={isDark ? "moon" : "sun"} 
                  size={16} 
                  color={isDark ? "#FFFFFF" : theme.text} 
                />
              </Pressable>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.toggleRow}>
              <View style={styles.settingLeft}>
                <Feather name="sun" size={20} color={theme.accent} />
                <View>
                  <ThemedText style={styles.settingText}>Авто</ThemedText>
                  <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                    По системным настройкам
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={settings.autoAppTheme}
                onValueChange={handleAutoAppThemeToggle}
                trackColor={{ false: theme.backgroundTertiary, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.toggleRow}>
              <View style={styles.settingLeft}>
                <Feather name="smartphone" size={20} color={theme.accent} />
                <View>
                  <ThemedText style={styles.settingText}>Вибрация</ThemedText>
                  <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                    Тактильный отклик
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
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            Данные
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Feather name="download" size={20} color={theme.accent} />
                <View>
                  <ThemedText style={styles.settingText}>Экспорт</ThemedText>
                  <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                    Закладки и заметки
                  </ThemedText>
                </View>
              </View>
            </View>
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
                    <Feather name="file-text" size={18} color={theme.text} />
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
                    <Feather name="file" size={18} color={theme.text} />
                    <ThemedText style={styles.exportButtonText}>CSV</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            О приложении
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.aboutRow}>
              <ThemedText>Версия</ThemedText>
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
    paddingHorizontal: Spacing.md,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: Spacing.xs,
  },
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  progressInfo: {
    flex: 1,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: Spacing.lg,
  },
  progressItem: {
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 12,
  },
  progressDivider: {
    width: 1,
    height: 30,
  },
  settingItem: {
    marginBottom: Spacing.md,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  settingText: {
    fontSize: 15,
    fontWeight: "500",
  },
  settingHint: {
    fontSize: 12,
    marginTop: 2,
  },
  sliderRow: {
    gap: Spacing.xs,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  slider: {
    height: 36,
    marginHorizontal: -Spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    minWidth: 70,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  exportButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  exportButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  exportButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
