import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Text,
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
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

import { Colors, Spacing, BorderRadius, Fonts, Motion, ReadingDefaults } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useReading, Book } from "@/contexts/ReadingContext";
import { useTheme } from "@/hooks/useTheme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { NoteModal } from "@/components/NoteModal";
import { SearchModal } from "@/components/SearchModal";
import { GlassCard } from "@/components/GlassCard";
import { BionicText } from "@/components/BionicText";
import { BookmarkRibbon } from "@/components/BookmarkRibbon";
import { ReadingTimer } from "@/components/ReadingTimer";
import { SkeletonReader } from "@/components/Skeleton";

type ReadingRouteProp = RouteProp<RootStackParamList, "Reading">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ReadingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReadingRouteProp>();
  const { book } = route.params;

  const { 
    settings, 
    stats,
    currentBook: contextBook,
    updateBookProgress, 
    addBookmark, 
    addNote, 
    removeBookmark, 
    startReadingSession,
    endReadingSession,
  } = useReading();
  
  const activeBook = contextBook?.id === book.id ? contextBook : book;
  
  const { theme, isDark } = useTheme(settings.themeMode, settings.autoTheme);
  
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showUI, setShowUI] = useState(false);
  const [currentPage, setCurrentPage] = useState(book.currentPage || 0);
  const [totalPages, setTotalPages] = useState(book.totalPages || 1);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [estimatedReadingTime, setEstimatedReadingTime] = useState(0);

  const startPageRef = useRef(currentPage);
  const sessionStartRef = useRef(Date.now());

  const uiOpacity = useSharedValue(0);
  const pageTransition = useSharedValue(0);

  useEffect(() => {
    loadBookContent();
    startReadingSession(book.id);
    sessionStartRef.current = Date.now();
    startPageRef.current = currentPage;

    return () => {
      const pagesRead = currentPage - startPageRef.current;
      const wordsRead = pagesRead * 250;
      endReadingSession(book.id, Math.max(0, pagesRead), Math.max(0, wordsRead));
    };
  }, [book.fileUri]);

  useEffect(() => {
    const hasBookmark = activeBook.bookmarks.some((b) => b.page === currentPage);
    setIsBookmarked(hasBookmark);
  }, [currentPage, activeBook.bookmarks]);

  const loadBookContent = async () => {
    try {
      setIsLoading(true);

      if (book.fileType === "txt") {
        const text = await FileSystem.readAsStringAsync(book.fileUri);
        setContent(text);
        const estimatedPages = Math.ceil(text.length / 2000);
        setTotalPages(estimatedPages);
        
        const words = text.split(/\s+/).length;
        setWordCount(words);
        setEstimatedReadingTime(Math.ceil(words / stats.averageReadingSpeed));
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

  const triggerHaptic = useCallback((style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(style);
    }
  }, [settings.hapticFeedback]);

  const toggleUI = useCallback(() => {
    const newShowUI = !showUI;
    setShowUI(newShowUI);
    
    if (settings.animationsEnabled) {
      uiOpacity.value = withTiming(newShowUI ? 1 : 0, { 
        duration: Motion.duration.fast 
      });
    } else {
      uiOpacity.value = newShowUI ? 1 : 0;
    }
    
    triggerHaptic();
  }, [showUI, settings.animationsEnabled, triggerHaptic]);

  const handleClose = () => {
    updateBookProgress(activeBook.id, currentPage, totalPages);
    navigation.goBack();
  };

  const handleBookmark = async () => {
    if (isBookmarked) {
      const bookmark = activeBook.bookmarks.find((b) => b.page === currentPage);
      if (bookmark) {
        await removeBookmark(activeBook.id, bookmark.id);
        setIsBookmarked(false);
      }
    } else {
      await addBookmark(activeBook.id, currentPage, 0);
      setIsBookmarked(true);
    }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleAddNote = () => {
    setSelectedText("");
    setShowNoteModal(true);
  };

  const handleSaveNote = async (noteContent: string) => {
    await addNote(activeBook.id, {
      page: currentPage,
      position: 0,
      selectedText: selectedText,
      content: noteContent,
      color: "#FFEB3B",
    });
  };

  const handleSearch = () => {
    setShowSearchModal(true);
  };

  const handleSearchResultSelect = (index: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePageChange = useCallback((direction: "next" | "prev") => {
    if (direction === "next" && currentPage < totalPages - 1) {
      if (settings.animationsEnabled) {
        pageTransition.value = withSpring(1, {
          damping: Motion.easing.springSnappy.damping,
          stiffness: Motion.easing.springSnappy.stiffness,
        }, () => {
          runOnJS(setCurrentPage)(currentPage + 1);
          pageTransition.value = 0;
        });
      } else {
        setCurrentPage(currentPage + 1);
      }
      triggerHaptic();
    } else if (direction === "prev" && currentPage > 0) {
      if (settings.animationsEnabled) {
        pageTransition.value = withSpring(-1, {
          damping: Motion.easing.springSnappy.damping,
          stiffness: Motion.easing.springSnappy.stiffness,
        }, () => {
          runOnJS(setCurrentPage)(currentPage - 1);
          pageTransition.value = 0;
        });
      } else {
        setCurrentPage(currentPage - 1);
      }
      triggerHaptic();
    }
  }, [currentPage, totalPages, settings.animationsEnabled, triggerHaptic]);

  const handleTableOfContents = () => {
    navigation.navigate("TableOfContents", {
      book: activeBook,
      chapters: [
        { title: "Chapter 1", page: 0 },
        { title: "Chapter 2", page: 3 },
        { title: "Chapter 3", page: 6 },
      ],
    });
  };

  const handleBreakSuggested = useCallback(() => {
    if (settings.hapticFeedback) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [settings.hapticFeedback]);

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      const tapX = event.x;
      const screenThird = SCREEN_WIDTH / 3;

      if (tapX < screenThird) {
        runOnJS(handlePageChange)("prev");
      } else if (tapX > screenThird * 2) {
        runOnJS(handlePageChange)("next");
      } else {
        runOnJS(toggleUI)();
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onEnd(() => {
      if (settings.hapticFeedback) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      runOnJS(setShowNoteModal)(true);
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  const progress = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
  const remainingPages = totalPages - currentPage - 1;
  const remainingTime = Math.ceil((remainingPages / totalPages) * estimatedReadingTime);

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
    pointerEvents: uiOpacity.value > 0.5 ? "auto" : "none",
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
    pointerEvents: uiOpacity.value > 0.5 ? "auto" : "none",
  }));

  const pageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          pageTransition.value,
          [-1, 0, 1],
          [SCREEN_WIDTH * 0.1, 0, -SCREEN_WIDTH * 0.1],
          Extrapolation.CLAMP
        ),
      },
    ],
    opacity: interpolate(
      Math.abs(pageTransition.value),
      [0, 0.5, 1],
      [1, 0.8, 1],
      Extrapolation.CLAMP
    ),
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

  const getTextStyle = () => ({
    fontSize: settings.fontSize,
    lineHeight: settings.fontSize * settings.lineSpacing,
    fontFamily: getFontFamily(),
    color: theme.text,
    letterSpacing: settings.letterSpacing || ReadingDefaults.letterSpacing,
    textAlign: settings.textAlignment as "left" | "justify",
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <SkeletonReader />
      </View>
    );
  }

  const renderContent = () => {
    if (settings.bionicReading) {
      return (
        <BionicText style={getTextStyle()} enabled={true}>
          {content}
        </BionicText>
      );
    }

    return (
      <Text style={[styles.bookText, getTextStyle()]}>
        {content}
      </Text>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ReadingTimer 
        visible={settings.focusMode} 
        focusMode={settings.focusMode}
        onBreakSuggested={handleBreakSuggested}
      />

      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.contentContainer, settings.animationsEnabled ? pageAnimatedStyle : undefined]}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.textContent,
              {
                paddingHorizontal: settings.marginHorizontal,
                paddingTop: insets.top + (settings.focusMode ? Spacing["5xl"] : Spacing["3xl"]),
                paddingBottom: insets.bottom + 100,
              },
            ]}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            {renderContent()}
          </ScrollView>
        </Animated.View>
      </GestureDetector>

      {!settings.focusMode && (
        <Animated.View
          style={[
            styles.header,
            { paddingTop: insets.top },
            headerAnimatedStyle,
          ]}
        >
          <GlassCard 
            intensity="medium" 
            style={styles.headerCard}
            animatedOpacity={uiOpacity}
            noPadding
          >
            <View style={styles.headerContent}>
              <Pressable onPress={handleClose} style={styles.headerButton}>
                <Feather name="chevron-left" size={24} color={theme.text} />
              </Pressable>
              <View style={styles.headerTitleContainer}>
                <ThemedText style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                  {book.title}
                </ThemedText>
                {settings.showTimeEstimate && remainingTime > 0 && (
                  <ThemedText style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
                    {remainingTime} min left
                  </ThemedText>
                )}
              </View>
              <View style={styles.headerActions}>
                <Pressable onPress={handleSearch} style={styles.headerButton}>
                  <Feather name="search" size={20} color={theme.text} />
                </Pressable>
                <BookmarkRibbon 
                  isBookmarked={isBookmarked} 
                  onPress={handleBookmark}
                  size={22}
                />
                <Pressable onPress={handleTableOfContents} style={styles.headerButton}>
                  <Feather name="list" size={20} color={theme.text} />
                </Pressable>
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      )}

      {settings.showReadingProgress && (
        <View
          style={[
            styles.progressContainer,
            { bottom: insets.bottom + Spacing.lg },
          ]}
        >
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
            <Animated.View
              style={[
                styles.progressFill,
                { 
                  backgroundColor: theme.progressBar, 
                  width: `${progress}%`,
                },
              ]}
            />
          </View>
          <ThemedText style={[styles.progressText, { color: theme.secondaryText }]}>
            {Math.round(progress)}%
          </ThemedText>
        </View>
      )}

      {!settings.focusMode && (
        <Animated.View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + Spacing["4xl"] },
            footerAnimatedStyle,
          ]}
        >
          <GlassCard 
            intensity="medium" 
            style={styles.footerCard}
            animatedOpacity={uiOpacity}
            noPadding
          >
            <View style={styles.footerContent}>
              <Pressable onPress={handleAddNote} style={styles.footerButton}>
                <Feather name="edit-3" size={20} color={theme.text} />
                <ThemedText style={[styles.footerButtonText, { color: theme.text }]}>
                  Note
                </ThemedText>
              </Pressable>
              <View style={styles.footerDivider} />
              <View style={styles.pageInfoContainer}>
                <ThemedText style={[styles.pageInfo, { color: theme.text }]}>
                  {currentPage + 1}
                </ThemedText>
                <ThemedText style={[styles.pageInfoDivider, { color: theme.secondaryText }]}>
                  /
                </ThemedText>
                <ThemedText style={[styles.pageInfo, { color: theme.secondaryText }]}>
                  {totalPages}
                </ThemedText>
              </View>
              <View style={styles.footerDivider} />
              <Pressable 
                onPress={() => {/* Toggle settings */}} 
                style={styles.footerButton}
              >
                <Feather name="type" size={20} color={theme.text} />
                <ThemedText style={[styles.footerButtonText, { color: theme.text }]}>
                  Aa
                </ThemedText>
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>
      )}

      <NoteModal
        visible={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSave={handleSaveNote}
        selectedText={selectedText}
        theme={theme}
      />

      <SearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        content={content}
        onResultSelect={handleSearchResultSelect}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: Spacing.md,
  },
  headerCard: {
    marginTop: Spacing.sm,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
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
    height: 3,
    borderRadius: 1.5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 1.5,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "600",
    minWidth: 32,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: Spacing.md,
  },
  footerCard: {
    marginBottom: Spacing.sm,
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  footerDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(150, 150, 150, 0.2)",
    marginHorizontal: Spacing.lg,
  },
  pageInfoContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  pageInfo: {
    fontSize: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  pageInfoDivider: {
    fontSize: 14,
    fontWeight: "400",
  },
});
