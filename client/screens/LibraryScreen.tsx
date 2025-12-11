import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BookCard } from "@/components/BookCard";
import { ProgressRing } from "@/components/ProgressRing";
import { useReading, Book } from "@/contexts/ReadingContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SwipeableBookCardProps {
  book: Book;
  onPress: () => void;
  onDelete: () => void;
  viewMode: "grid" | "list";
  theme: any;
}

function SwipeableBookCard({ book, onPress, onDelete, viewMode, theme }: SwipeableBookCardProps) {
  const translateX = useSharedValue(0);
  const deleteWidth = 80;

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      if (viewMode === "list") {
        translateX.value = Math.max(-deleteWidth, Math.min(0, event.translationX));
      }
    })
    .onEnd(() => {
      if (translateX.value < -deleteWidth / 2) {
        translateX.value = withSpring(-deleteWidth);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -10 ? 1 : 0,
  }));

  if (viewMode === "grid") {
    return (
      <BookCard
        book={book}
        onPress={onPress}
        onLongPress={onDelete}
        viewMode={viewMode}
      />
    );
  }

  return (
    <View style={styles.swipeContainer}>
      <Animated.View
        style={[
          styles.deleteAction,
          { backgroundColor: "#E53935" },
          deleteButtonStyle,
        ]}
      >
        <Pressable
          style={styles.deleteActionButton}
          onPress={() => {
            translateX.value = withSpring(0);
            onDelete();
          }}
        >
          <Feather name="trash-2" size={24} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={cardStyle}>
          <BookCard
            book={book}
            onPress={onPress}
            onLongPress={onDelete}
            viewMode={viewMode}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { books, addBook, removeBook, setCurrentBook, isLoading, stats, settings } = useReading();
  const [isImporting, setIsImporting] = useState(false);

  const dailyGoalProgress = settings.dailyGoal > 0 
    ? Math.min(100, (stats.todayReadingTime / 60 / settings.dailyGoal) * 100) 
    : 0;
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"recent" | "title" | "date">("recent");

  const fabScale = useSharedValue(1);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const handleImportBook = async () => {
    try {
      setIsImporting(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/epub+zip",
          "application/pdf",
          "text/plain",
          "application/x-fictionbook+xml",
          "application/xml",
          "*/*",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileName = file.name || "Unknown Book";
        const fileType = getFileType(file.mimeType || "", fileName);

        if (fileType) {
          await addBook({
            title: fileName.replace(/\.[^/.]+$/, ""),
            author: "Unknown Author",
            fileUri: file.uri,
            fileType,
            totalPages: fileType === "txt" ? 1 : 100,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert("Unsupported Format", "Please select an EPUB, PDF, FB2, or TXT file.");
        }
      }
    } catch (error) {
      console.error("Import error:", error);
      Alert.alert("Import Failed", "Could not import the book. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const getFileType = (mimeType: string, fileName: string): "epub" | "pdf" | "txt" | "fb2" | null => {
    if (mimeType.includes("epub") || fileName.endsWith(".epub")) return "epub";
    if (mimeType.includes("pdf") || fileName.endsWith(".pdf")) return "pdf";
    if (mimeType.includes("text") || fileName.endsWith(".txt")) return "txt";
    if (mimeType.includes("fictionbook") || fileName.endsWith(".fb2") || fileName.endsWith(".fb2.zip")) return "fb2";
    return null;
  };

  const handleOpenBook = useCallback((book: Book) => {
    setCurrentBook(book);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Reading", { book });
  }, [setCurrentBook, navigation]);

  const handleDeleteBook = useCallback((book: Book) => {
    Alert.alert(
      "Delete Book",
      `Are you sure you want to delete "${book.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeBook(book.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [removeBook]);

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "grid" ? "list" : "grid"));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const cycleSortBy = () => {
    setSortBy((prev) => {
      if (prev === "recent") return "title";
      if (prev === "title") return "date";
      return "recent";
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const sortedBooks = React.useMemo(() => {
    const sorted = [...books];
    switch (sortBy) {
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "date":
        sorted.sort((a, b) => b.addedAt - a.addedAt);
        break;
      case "recent":
      default:
        sorted.sort((a, b) => b.lastRead - a.lastRead);
        break;
    }
    return sorted;
  }, [books, sortBy]);

  const renderBook = useCallback(
    ({ item }: { item: Book }) => (
      <SwipeableBookCard
        book={item}
        onPress={() => handleOpenBook(item)}
        onDelete={() => handleDeleteBook(item)}
        viewMode={viewMode}
        theme={theme}
      />
    ),
    [viewMode, theme, handleOpenBook, handleDeleteBook]
  );

  const renderStatsCard = () => (
    <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.statsCardContent}>
        <ProgressRing 
          progress={dailyGoalProgress} 
          size={56}
          strokeWidth={5}
        />
        <View style={styles.statsCardInfo}>
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Feather name="zap" size={14} color={theme.accent} />
              <ThemedText style={[styles.statValue, { color: theme.accent }]}>
                {stats.currentStreak}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>
                streak
              </ThemedText>
            </View>
            <View style={styles.statBadge}>
              <Feather name="clock" size={14} color={theme.text} />
              <ThemedText style={[styles.statValue, { color: theme.text }]}>
                {Math.round(stats.todayReadingTime / 60)}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>
                min today
              </ThemedText>
            </View>
            <View style={styles.statBadge}>
              <Feather name="activity" size={14} color={theme.text} />
              <ThemedText style={[styles.statValue, { color: theme.text }]}>
                {stats.averageReadingSpeed}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.secondaryText }]}>
                WPM
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.listHeaderContainer}>
      {renderStatsCard()}
      <View style={styles.listHeader}>
        <View style={styles.sortToggle}>
          <Pressable
            style={[styles.toggleButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={cycleSortBy}
          >
            <Feather
              name={sortBy === "title" ? "type" : sortBy === "date" ? "calendar" : "clock"}
              size={16}
              color={theme.text}
            />
            <ThemedText style={styles.toggleText}>
              {sortBy === "title" ? "A-Z" : sortBy === "date" ? "Added" : "Recent"}
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.viewToggle}>
          <Pressable
            style={[
              styles.viewButton,
              viewMode === "grid" && { backgroundColor: theme.accent + "20" },
            ]}
            onPress={() => setViewMode("grid")}
          >
            <Feather
              name="grid"
              size={18}
              color={viewMode === "grid" ? theme.accent : theme.secondaryText}
            />
          </Pressable>
          <Pressable
            style={[
              styles.viewButton,
              viewMode === "list" && { backgroundColor: theme.accent + "20" },
            ]}
            onPress={() => setViewMode("list")}
          >
            <Feather
              name="list"
              size={18}
              color={viewMode === "list" ? theme.accent : theme.secondaryText}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="book-open" size={48} color={theme.secondaryText} />
      </View>
      <ThemedText type="h4" style={styles.emptyTitle}>
        Your library is empty
      </ThemedText>
      <ThemedText
        style={[styles.emptyDescription, { color: theme.secondaryText }]}
      >
        Import your first book to start reading
      </ThemedText>
      <Pressable
        style={[styles.importButton, { backgroundColor: theme.accent }]}
        onPress={handleImportBook}
      >
        <Feather name="plus" size={20} color="#FFFFFF" />
        <ThemedText style={styles.importButtonText}>Import Book</ThemedText>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.accent} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={sortedBooks}
        keyExtractor={(item) => item.id}
        renderItem={renderBook}
        numColumns={viewMode === "grid" ? 2 : 1}
        key={viewMode}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.sm,
            paddingBottom: tabBarHeight + 80,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListHeaderComponent={books.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {books.length > 0 ? (
        <AnimatedPressable
          style={[
            styles.fab,
            { backgroundColor: theme.accent, bottom: tabBarHeight + Spacing.xl },
            fabAnimatedStyle,
          ]}
          onPress={handleImportBook}
          onPressIn={() => {
            fabScale.value = withSpring(0.9);
          }}
          onPressOut={() => {
            fabScale.value = withSpring(1);
          }}
          disabled={isImporting}
        >
          {isImporting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="plus" size={24} color="#FFFFFF" />
          )}
        </AnimatedPressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  listHeaderContainer: {
    gap: Spacing.lg,
  },
  statsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  statsCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  statsCardInfo: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statBadge: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sortToggle: {
    flexDirection: "row",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  viewToggle: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  viewButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  swipeContainer: {
    position: "relative",
    marginBottom: Spacing.sm,
  },
  deleteAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.md,
  },
  deleteActionButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: Spacing["2xl"],
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  importButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 4,
  },
});
