import React, { useState } from "react";
import { View, StyleSheet, Switch, Pressable, ScrollView, Alert, Share, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, ReadingDefaults, AvailableFonts, ThemeMode } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useReading } from "@/contexts/ReadingContext";

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  bgColor: string;
  textColor: string;
}

const themeOptions: ThemeOption[] = [
  { mode: "light", label: "Day", bgColor: "#FFFFFF", textColor: "#333333" },
  { mode: "dark", label: "Night", bgColor: "#1A1A1A", textColor: "#E0E0E0" },
  { mode: "sepia", label: "Sepia", bgColor: "#F4ECD8", textColor: "#5B4636" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { settings, updateSettings, exportData, books } = useReading();
  const [isExporting, setIsExporting] = useState(false);

  const handleThemeChange = (mode: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ themeMode: mode, autoTheme: false });
  };

  const handleAutoThemeToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ autoTheme: value });
  };

  const handleFontChange = (fontValue: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ fontFamily: fontValue });
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
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Export Failed", "Could not export your data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const totalBookmarks = books.reduce((acc, book) => acc + book.bookmarks.length, 0);
  const totalNotes = books.reduce((acc, book) => acc + book.notes.length, 0);

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
            Reading
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
              <ThemedText>Margins</ThemedText>
              <ThemedText style={{ color: theme.secondaryText }}>
                {Math.round(settings.marginHorizontal)}px
              </ThemedText>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={8}
              maximumValue={48}
              value={settings.marginHorizontal}
              onValueChange={(value) => updateSettings({ marginHorizontal: value })}
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
            Theme
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Feather name="sun" size={20} color={theme.text} />
                <ThemedText style={styles.settingLabel}>Auto Theme</ThemedText>
              </View>
              <Switch
                value={settings.autoTheme}
                onValueChange={handleAutoThemeToggle}
                trackColor={{ false: theme.backgroundTertiary, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
            <ThemedText style={[styles.settingHint, { color: theme.secondaryText }]}>
              Follow system appearance
            </ThemedText>
          </View>

          <View style={styles.themeOptions}>
            {themeOptions.map((option) => (
              <Pressable
                key={option.mode}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: option.bgColor,
                    borderWidth: !settings.autoTheme && settings.themeMode === option.mode ? 3 : 1,
                    borderColor:
                      !settings.autoTheme && settings.themeMode === option.mode
                        ? theme.accent
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
                      { backgroundColor: option.textColor, width: "60%" },
                    ]}
                  />
                  <View
                    style={[
                      styles.themePreviewLine,
                      { backgroundColor: option.textColor, width: "70%" },
                    ]}
                  />
                </View>
                <ThemedText
                  style={[styles.themeLabel, { color: option.textColor }]}
                >
                  {option.label}
                </ThemedText>
                {!settings.autoTheme && settings.themeMode === option.mode ? (
                  <View style={[styles.checkmark, { backgroundColor: theme.accent }]}>
                    <Feather name="check" size={14} color="#FFFFFF" />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Data
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.statsRow}>
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
            </View>
          </View>

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
              <ThemedText style={{ color: theme.secondaryText }}>1.0.0</ThemedText>
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
    borderRadius: BorderRadius.md,
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
    gap: Spacing.sm,
  },
  settingLabel: {
    marginLeft: Spacing.xs,
  },
  settingHint: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  slider: {
    marginTop: Spacing.md,
    height: 40,
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
  themeOptions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  themeCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    justifyContent: "space-between",
  },
  themePreview: {
    gap: Spacing.xs,
  },
  themePreviewLine: {
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    marginTop: Spacing.xs,
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
});
