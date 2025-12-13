import React, { useState } from "react";
import { View, StyleSheet, Switch, Pressable, ScrollView, Alert, Share, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme, useAppTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, ReadingDefaults, AvailableFonts, ReadingModes, ReadingMode, ScrollModes, ScrollMode, AutoScrollDefaults, KaraokeDefaults } from "@/constants/theme";
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
  const { settings, updateSettings, exportData, books, stats, applyReadingMode } = useReading();
  const [isExporting, setIsExporting] = useState(false);

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
                    дней
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            Чтение
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Feather name="book-open" size={20} color={theme.accent} />
                <ThemedText style={styles.settingText}>Режим чтения</ThemedText>
              </View>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {(Object.keys(ReadingModes) as ReadingMode[]).map((mode) => {
                const modeData = ReadingModes[mode];
                const isSelected = settings.readingMode === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[
                      styles.modeChip,
                      {
                        backgroundColor: isSelected ? theme.accent : theme.backgroundSecondary,
                      },
                    ]}
                    onPress={() => handleReadingModeChange(mode)}
                  >
                    <ThemedText
                      style={[
                        styles.modeChipText,
                        { color: isSelected ? "#FFFFFF" : theme.text },
                      ]}
                    >
                      {modeData.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Feather name="arrow-down" size={20} color={theme.accent} />
                <ThemedText style={styles.settingText}>Прокрутка</ThemedText>
              </View>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {(Object.keys(ScrollModes) as ScrollMode[]).map((mode) => {
                const modeData = ScrollModes[mode];
                const isSelected = settings.scrollMode === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[
                      styles.modeChip,
                      {
                        backgroundColor: isSelected ? theme.accent : theme.backgroundSecondary,
                      },
                    ]}
                    onPress={() => handleScrollModeChange(mode)}
                  >
                    <ThemedText
                      style={[
                        styles.modeChipText,
                        { color: isSelected ? "#FFFFFF" : theme.text },
                      ]}
                    >
                      {modeData.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {settings.scrollMode === "autoScroll" && (
              <View style={styles.subSetting}>
                <View style={styles.sliderHeader}>
                  <ThemedText style={[styles.subSettingLabel, { color: theme.secondaryText }]}>
                    Скорость
                  </ThemedText>
                  <ThemedText style={[styles.sliderValue, { color: theme.accent }]}>
                    {settings.autoScrollSpeed} px/сек
                  </ThemedText>
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

            {settings.scrollMode === "karaoke" && (
              <>
                <View style={styles.subSettingToggle}>
                  <ThemedText style={[styles.subSettingLabel, { color: theme.secondaryText }]}>
                    Автопереход
                  </ThemedText>
                  <Switch
                    value={settings.karaokeAutoAdvance}
                    onValueChange={(value) => handleToggle("karaokeAutoAdvance", value)}
                    trackColor={{ false: theme.backgroundTertiary, true: theme.accent }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {settings.karaokeAutoAdvance && (
                  <View style={styles.subSetting}>
                    <View style={styles.sliderHeader}>
                      <ThemedText style={[styles.subSettingLabel, { color: theme.secondaryText }]}>
                        Скорость
                      </ThemedText>
                      <ThemedText style={[styles.sliderValue, { color: theme.accent }]}>
                        {settings.karaokeAutoAdvanceSpeed?.toFixed(1) || KaraokeDefaults.defaultAutoAdvanceSpeed} л/сек
                      </ThemedText>
                    </View>
                    <Slider
                      style={styles.slider}
                      minimumValue={KaraokeDefaults.minAutoAdvanceSpeed}
                      maximumValue={KaraokeDefaults.maxAutoAdvanceSpeed}
                      step={0.1}
                      value={settings.karaokeAutoAdvanceSpeed || KaraokeDefaults.defaultAutoAdvanceSpeed}
                      onValueChange={(value) => updateSettings({ karaokeAutoAdvanceSpeed: value })}
                      minimumTrackTintColor={theme.accent}
                      maximumTrackTintColor={theme.backgroundTertiary}
                      thumbTintColor={theme.accent}
                    />
                  </View>
                )}

                <View style={styles.subSetting}>
                  <View style={styles.sliderHeader}>
                    <ThemedText style={[styles.subSettingLabel, { color: theme.secondaryText }]}>
                      Видимость следующих строк
                    </ThemedText>
                    <ThemedText style={[styles.sliderValue, { color: theme.accent }]}>
                      {Math.round((settings.karaokeUpcomingOpacity || KaraokeDefaults.upcomingOpacity) * 100)}%
                    </ThemedText>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={KaraokeDefaults.minUpcomingOpacity}
                    maximumValue={KaraokeDefaults.maxUpcomingOpacity}
                    step={0.05}
                    value={settings.karaokeUpcomingOpacity || KaraokeDefaults.upcomingOpacity}
                    onValueChange={(value) => updateSettings({ karaokeUpcomingOpacity: value })}
                    minimumTrackTintColor={theme.accent}
                    maximumTrackTintColor={theme.backgroundTertiary}
                    thumbTintColor={theme.accent}
                  />
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            Типографика
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.sliderRow}>
              <View style={styles.sliderHeader}>
                <View style={styles.settingLeft}>
                  <Feather name="type" size={18} color={theme.accent} />
                  <ThemedText style={styles.settingText}>Размер шрифта</ThemedText>
                </View>
                <ThemedText style={[styles.sliderValue, { color: theme.accent }]}>
                  {Math.round(settings.fontSize)}
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

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.sliderRow}>
              <View style={styles.sliderHeader}>
                <View style={styles.settingLeft}>
                  <Feather name="align-justify" size={18} color={theme.accent} />
                  <ThemedText style={styles.settingText}>Межстрочный</ThemedText>
                </View>
                <ThemedText style={[styles.sliderValue, { color: theme.accent }]}>
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

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.sliderRow}>
              <View style={styles.sliderHeader}>
                <View style={styles.settingLeft}>
                  <Feather name="more-horizontal" size={18} color={theme.accent} />
                  <ThemedText style={styles.settingText}>Межбуквенный</ThemedText>
                </View>
                <ThemedText style={[styles.sliderValue, { color: theme.accent }]}>
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
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Feather name="edit-3" size={18} color={theme.accent} />
                <ThemedText style={styles.settingText}>Шрифт</ThemedText>
              </View>
            </View>
            <View style={styles.fontGrid}>
              {AvailableFonts.map((font) => (
                <Pressable
                  key={font.value}
                  style={[
                    styles.fontChip,
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
                      styles.fontChipText,
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
          <ThemedText style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            Функции
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.toggleRow}>
              <View style={styles.settingLeft}>
                <Feather name="zap" size={20} color={theme.accent} />
                <View>
                  <ThemedText style={styles.settingText}>Bionic Reading</ThemedText>
                  <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                    Выделение начала слов
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

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.toggleRow}>
              <View style={styles.settingLeft}>
                <Feather name="target" size={20} color={theme.accent} />
                <View>
                  <ThemedText style={styles.settingText}>Фокус-режим</ThemedText>
                  <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                    Минимальный интерфейс + помодоро
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

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.toggleRow}>
              <View style={styles.settingLeft}>
                <Feather name="align-left" size={20} color={theme.accent} />
                <View>
                  <ThemedText style={styles.settingText}>Выравнивание</ThemedText>
                  <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
                    {settings.textAlignment === "left" ? "По левому краю" : "По ширине"}
                  </ThemedText>
                </View>
              </View>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => {
                  if (settings.hapticFeedback) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  updateSettings({ textAlignment: settings.textAlignment === "left" ? "justify" : "left" });
                }}
              >
                <ThemedText style={styles.toggleButtonText}>
                  {settings.textAlignment === "left" ? "Лево" : "Ширина"}
                </ThemedText>
              </Pressable>
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
                  <Feather name="clock" size={18} color={theme.accent} />
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
                <ThemedText type="h3" style={{ color: theme.accent }}>{totalBookmarks}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>закладок</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="h3" style={{ color: theme.accent }}>{totalNotes}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>заметок</ThemedText>
              </View>
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
                <Feather name="download" size={18} color={theme.accent} />
                <ThemedText style={styles.settingText}>Экспорт закладок</ThemedText>
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
                  <ThemedText style={styles.exportButtonText}>JSON</ThemedText>
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
                  <ThemedText style={styles.exportButtonText}>CSV</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            Оформление
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
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.aboutRow}>
              <ThemedText style={{ color: theme.secondaryText }}>Версия</ThemedText>
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
    marginBottom: Spacing.sm,
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
  horizontalList: {
    gap: Spacing.sm,
  },
  modeChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  modeChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  subSetting: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  subSettingToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  subSettingLabel: {
    fontSize: 13,
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
  fontGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  fontChip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  fontChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
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
