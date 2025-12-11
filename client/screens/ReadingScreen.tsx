import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  FadeIn,
  FadeOut,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useReading, Book } from "@/contexts/ReadingContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type ReadingRouteProp = RouteProp<RootStackParamList, "Reading">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ReadingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReadingRouteProp>();
  const { book } = route.params;

  const { settings, updateBookProgress, addBookmark, currentBook } = useReading();
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showUI, setShowUI] = useState(false);
  const [currentPage, setCurrentPage] = useState(book.currentPage || 0);
  const [totalPages, setTotalPages] = useState(book.totalPages || 1);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const uiOpacity = useSharedValue(0);

  const theme = Colors[settings.autoTheme ? "light" : settings.themeMode] || Colors.light;

  useEffect(() => {
    loadBookContent();
  }, [book.fileUri]);

  useEffect(() => {
    const hasBookmark = book.bookmarks.some((b) => b.page === currentPage);
    setIsBookmarked(hasBookmark);
  }, [currentPage, book.bookmarks]);

  const loadBookContent = async () => {
    try {
      setIsLoading(true);

      if (book.fileType === "txt") {
        const text = await FileSystem.readAsStringAsync(book.fileUri);
        setContent(text);
        const estimatedPages = Math.ceil(text.length / 2000);
        setTotalPages(estimatedPages);
      } else if (book.fileType === "pdf") {
        setContent("PDF viewing is not yet fully supported.\n\nThis is a preview of your PDF book. Full PDF rendering will be available in a future update.");
        setTotalPages(book.totalPages || 10);
      } else if (book.fileType === "epub") {
        setContent("EPUB viewing is not yet fully supported.\n\nThis is a preview of your EPUB book. Full EPUB rendering with chapters will be available in a future update.");
        setTotalPages(book.totalPages || 10);
      }
    } catch (error) {
      console.error("Error loading book:", error);
      setContent("Unable to load book content. The file may be corrupted or in an unsupported format.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUI = useCallback(() => {
    setShowUI((prev) => !prev);
    uiOpacity.value = withTiming(showUI ? 0 : 1, { duration: 200 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [showUI]);

  const handleClose = () => {
    updateBookProgress(book.id, currentPage, totalPages);
    navigation.goBack();
  };

  const handleBookmark = async () => {
    if (isBookmarked) {
      const bookmark = book.bookmarks.find((b) => b.page === currentPage);
      if (bookmark) {
        setIsBookmarked(false);
      }
    } else {
      await addBookmark(book.id, currentPage, 0);
      setIsBookmarked(true);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePageChange = (direction: "next" | "prev") => {
    if (direction === "next" && currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (direction === "prev" && currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleTableOfContents = () => {
    navigation.navigate("TableOfContents", {
      book,
      chapters: [
        { title: "Chapter 1", page: 0 },
        { title: "Chapter 2", page: 3 },
        { title: "Chapter 3", page: 6 },
      ],
    });
  };

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      const tapX = event.x;
      const screenThird = SCREEN_WIDTH / 3;

      if (tapX < screenThird) {
        handlePageChange("prev");
      } else if (tapX > screenThird * 2) {
        handlePageChange("next");
      } else {
        toggleUI();
      }
    });

  const progress = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: uiOpacity.value,
    transform: [
      {
        translateY: interpolate(
          uiOpacity.value,
          [0, 1],
          [-20, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const footerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: uiOpacity.value,
    transform: [
      {
        translateY: interpolate(
          uiOpacity.value,
          [0, 1],
          [20, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const getFontFamily = () => {
    switch (settings.fontFamily) {
      case "serif":
        return Fonts?.serif || "serif";
      case "georgia":
        return Platform.OS === "ios" ? "Georgia" : "serif";
      case "times":
        return Platform.OS === "ios" ? "Times New Roman" : "serif";
      case "palatino":
        return Platform.OS === "ios" ? "Palatino" : "serif";
      default:
        return Fonts?.sans || "system-ui";
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <GestureDetector gesture={tapGesture}>
        <View style={styles.contentContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.textContent,
              {
                paddingHorizontal: settings.marginHorizontal,
                paddingTop: insets.top + Spacing["3xl"],
                paddingBottom: insets.bottom + 80,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText
              style={[
                styles.bookText,
                {
                  fontSize: settings.fontSize,
                  lineHeight: settings.fontSize * settings.lineSpacing,
                  fontFamily: getFontFamily(),
                  color: theme.text,
                },
              ]}
            >
              {content}
            </ThemedText>
          </ScrollView>
        </View>
      </GestureDetector>

      {showUI ? (
        <Animated.View
          style={[
            styles.header,
            { paddingTop: insets.top },
            headerAnimatedStyle,
          ]}
        >
          <View style={[styles.headerContent, { backgroundColor: theme.backgroundDefault }]}>
            <Pressable onPress={handleClose} style={styles.headerButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
            <ThemedText style={styles.headerTitle} numberOfLines={1}>
              {book.title}
            </ThemedText>
            <View style={styles.headerActions}>
              <Pressable onPress={handleBookmark} style={styles.headerButton}>
                <Feather
                  name="heart"
                  size={22}
                  color={isBookmarked ? theme.accent : theme.text}
                  fill={isBookmarked ? theme.accent : "transparent"}
                />
              </Pressable>
              <Pressable onPress={handleTableOfContents} style={styles.headerButton}>
                <Feather name="list" size={22} color={theme.text} />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      ) : null}

      <View
        style={[
          styles.progressContainer,
          { bottom: insets.bottom + Spacing.lg },
        ]}
      >
        <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: theme.progressBar, width: `${progress}%` },
            ]}
          />
        </View>
        <ThemedText style={[styles.progressText, { color: theme.secondaryText }]}>
          {Math.round(progress)}%
        </ThemedText>
      </View>

      {showUI ? (
        <Animated.View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + Spacing["3xl"] },
            footerAnimatedStyle,
          ]}
        >
          <View style={[styles.footerContent, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={[styles.pageInfo, { color: theme.secondaryText }]}>
              Page {currentPage + 1} of {totalPages}
            </ThemedText>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    width: "100%",
  },
  scrollView: {
    flex: 1,
  },
  textContent: {
    flexGrow: 1,
  },
  bookText: {
    textAlign: "left",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "600",
    marginHorizontal: Spacing.md,
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  progressContainer: {
    position: "absolute",
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
    minWidth: 35,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  pageInfo: {
    fontSize: 14,
  },
});
