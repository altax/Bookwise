import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

import { Spacing, Fonts, Motion, ReadingDefaults } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useReading, Book } from "@/contexts/ReadingContext";
import { useTheme } from "@/hooks/useTheme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { NoteModal } from "@/components/NoteModal";
import { SearchModal } from "@/components/SearchModal";
import { GlassCard } from "@/components/GlassCard";
import { BookmarkRibbon } from "@/components/BookmarkRibbon";
import { ReadingTimer } from "@/components/ReadingTimer";
import { SkeletonReader } from "@/components/Skeleton";
import { EpubReader, PdfReader, SmartScrollReader } from "@/components/readers";
import type { SmartScrollReaderRef } from "@/components/readers/SmartScrollReader";
import { BookParserService, ParsedBook } from "@/services/BookParserService";

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
  const [parsedBook, setParsedBook] = useState<ParsedBook | null>(null);
  const [useNativeReader, setUseNativeReader] = useState(false);

  const startPageRef = useRef(currentPage);
  const sessionStartRef = useRef(Date.now());
  const smartReaderRef = useRef<SmartScrollReaderRef>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const uiOpacity = useSharedValue(0);

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

      const fileInfo = await FileSystem.getInfoAsync(book.fileUri);
      if (!fileInfo.exists) {
        setContent("Book file not found. It may have been moved or deleted from the device cache.\n\nPlease try re-importing the book.");
        setIsLoading(false);
        return;
      }

      if (book.fileType === "epub") {
        if (Platform.OS !== "web") {
          setUseNativeReader(true);
          try {
            const parsed = await BookParserService.parseEpub(book.fileUri);
            setParsedBook(parsed);
            setContent(parsed.content);
            setTotalPages(parsed.totalPages);
            const words = parsed.content.split(/\s+/).length;
            setWordCount(words);
            setEstimatedReadingTime(Math.ceil(words / stats.averageReadingSpeed));
          } catch (err) {
            console.error("Error parsing EPUB:", err);
            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            if (errorMsg.includes("container.xml") || errorMsg.includes("OPF")) {
              setContent("This EPUB file appears to be corrupted or in an unsupported format.\n\nPlease try downloading the book again from a different source.");
            } else {
              setContent(`Error loading EPUB: ${errorMsg}\n\nPlease try again or use a different book file.`);
            }
            setUseNativeReader(false);
          }
        } else {
          setContent("EPUB viewing is available on mobile devices.\n\nPlease use the Expo Go app for the best reading experience.");
          setTotalPages(book.totalPages || 10);
        }
      } else if (book.fileType === "fb2") {
        try {
          const parsed = await BookParserService.parseFb2(book.fileUri);
          setParsedBook(parsed);
          setContent(parsed.content);
          setTotalPages(parsed.totalPages);
          const words = parsed.content.split(/\s+/).length;
          setWordCount(words);
          setEstimatedReadingTime(Math.ceil(words / stats.averageReadingSpeed));
        } catch (err) {
          console.error("Error parsing FB2:", err);
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          setContent(`Error loading FB2: ${errorMsg}\n\nPlease check if the file is a valid FB2 format.`);
        }
      } else if (book.fileType === "pdf") {
        setUseNativeReader(true);
        setContent("PDF content");
        setTotalPages(book.totalPages || 10);
      } else if (book.fileType === "txt") {
        try {
          const text = await FileSystem.readAsStringAsync(book.fileUri);
          setContent(text);
          const estimatedPages = Math.ceil(text.length / 2000);
          setTotalPages(estimatedPages);
          
          const words = text.split(/\s+/).length;
          setWordCount(words);
          setEstimatedReadingTime(Math.ceil(words / stats.averageReadingSpeed));
        } catch (err) {
          console.error("Error reading TXT:", err);
          setContent("Error reading text file. The file may be corrupted.");
        }
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

  const handleSmartTap = useCallback(() => {
    if (smartReaderRef.current) {
      smartReaderRef.current.handleTapToScroll();
      triggerHaptic();
    }
  }, [triggerHaptic]);

  const handleScrollProgress = useCallback((progress: number, currentPosition: number, totalHeight: number) => {
    setScrollProgress(progress);
    const estimatedPage = Math.floor(progress * totalPages);
    setCurrentPage(prev => {
      const newPage = Math.min(estimatedPage, totalPages - 1);
      return prev !== newPage ? newPage : prev;
    });
  }, [totalPages]);

  const handleTableOfContents = () => {
    const chapters = parsedBook?.chapters || [
      { title: "Chapter 1", order: 0 },
      { title: "Chapter 2", order: 3 },
      { title: "Chapter 3", order: 6 },
    ];
    navigation.navigate("TableOfContents", {
      book: activeBook,
      chapters: chapters.map((c, i) => ({ title: c.title, page: 'order' in c ? c.order : i })),
    });
  };

  const handleBreakSuggested = useCallback(() => {
    if (settings.hapticFeedback) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [settings.hapticFeedback]);

  const handleEpubLocationChange = useCallback((location: { start: { percentage: number }; end: { percentage: number } }) => {
    if (location?.start?.percentage !== undefined) {
      const newPage = Math.floor(location.start.percentage * totalPages);
      setCurrentPage(prev => prev !== newPage ? newPage : prev);
    }
  }, [totalPages]);

  const handlePdfPageChange = useCallback((page: number, total: number) => {
    setCurrentPage(page - 1);
    setTotalPages(total);
  }, []);

  const handleFb2ContentLoaded = useCallback((parsed: ParsedBook) => {
    setParsedBook(parsed);
    setTotalPages(parsed.totalPages);
    const words = parsed.content.split(/\s+/).length;
    setWordCount(words);
    setEstimatedReadingTime(Math.ceil(words / stats.averageReadingSpeed));
  }, [stats.averageReadingSpeed]);

  const handleTxtContentLoaded = useCallback((content: string, pages: number) => {
    setContent(content);
    setTotalPages(pages);
    const words = content.split(/\s+/).length;
    setWordCount(words);
    setEstimatedReadingTime(Math.ceil(words / stats.averageReadingSpeed));
  }, [stats.averageReadingSpeed]);

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      const tapX = event.x;
      const screenThird = SCREEN_WIDTH / 3;

      if (tapX < screenThird) {
        runOnJS(toggleUI)();
      } else if (tapX > screenThird * 2) {
        runOnJS(handleSmartTap)();
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

  const progress = scrollProgress * 100;
  const remainingTime = Math.ceil((1 - scrollProgress) * estimatedReadingTime);

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

  const renderReader = () => {
    if (book.fileType === "epub" && useNativeReader && Platform.OS !== "web") {
      return (
        <EpubReader
          fileUri={book.fileUri}
          onLocationChange={handleEpubLocationChange}
          onReady={() => setIsLoading(false)}
          onError={(err) => console.error("EPUB error:", err)}
          theme={{ text: theme.text, backgroundRoot: theme.backgroundRoot }}
          settings={{
            fontSize: settings.fontSize,
            lineSpacing: settings.lineSpacing,
            fontFamily: getFontFamily(),
          }}
        />
      );
    }

    if (book.fileType === "pdf") {
      return (
        <PdfReader
          fileUri={book.fileUri}
          onPageChange={handlePdfPageChange}
          onReady={() => setIsLoading(false)}
          onError={(err) => console.error("PDF error:", err)}
          theme={{ text: theme.text, backgroundRoot: theme.backgroundRoot }}
        />
      );
    }

    if (book.fileType === "fb2" || book.fileType === "txt" || content) {
      return (
        <SmartScrollReader
          ref={smartReaderRef}
          content={content}
          onScrollProgress={handleScrollProgress}
          onError={(err) => console.error("Reader error:", err)}
          theme={{ 
            text: theme.text, 
            backgroundRoot: theme.backgroundRoot, 
            secondaryText: theme.secondaryText,
            highlightColor: 'rgba(255, 215, 0, 0.5)',
          }}
          settings={{
            fontSize: settings.fontSize,
            lineSpacing: settings.lineSpacing,
            fontFamily: settings.fontFamily,
            marginHorizontal: settings.marginHorizontal,
            letterSpacing: settings.letterSpacing,
            textAlignment: settings.textAlignment,
            bionicReading: settings.bionicReading,
          }}
        />
      );
    }

    return null;
  };

  const shouldUseGestures = book.fileType === "txt" || book.fileType === "fb2" || (book.fileType === "epub" && !useNativeReader);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ReadingTimer 
        visible={settings.focusMode} 
        focusMode={settings.focusMode}
        onBreakSuggested={handleBreakSuggested}
      />

      {shouldUseGestures ? (
        <GestureDetector gesture={composedGesture}>
          <View style={styles.contentContainer}>
            {renderReader()}
          </View>
        </GestureDetector>
      ) : (
        <View style={styles.contentContainer}>
          {renderReader()}
        </View>
      )}

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
                onPress={() => {}} 
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
