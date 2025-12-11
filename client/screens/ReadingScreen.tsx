import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  ActivityIndicator,
  ScrollView,
  Switch,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import Slider from "@react-native-community/slider";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

import { Spacing, Fonts, Motion, ReadingDefaults, ScrollModes, ScrollMode, TapScrollLinePosition, TapScrollLinePositionType, AutoScrollDefaults, TapScrollDefaults, ThemeMode } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useReading, Book } from "@/contexts/ReadingContext";
import { useTheme } from "@/hooks/useTheme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { NoteModal } from "@/components/NoteModal";
import { SearchModal } from "@/components/SearchModal";
import { GlassCard } from "@/components/GlassCard";
import { BookmarkRibbon } from "@/components/BookmarkRibbon";
import { ReadingTimer } from "@/components/ReadingTimer";
import { PdfReader, UnifiedScrollReader } from "@/components/readers";
import type { UnifiedScrollReaderRef } from "@/components/readers";
import { BookParserService, ParsedBook } from "@/services/BookParserService";

type ReadingRouteProp = RouteProp<RootStackParamList, "Reading">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PROGRESS_BAR_HEIGHT = 30;

const themeOptions: { mode: ThemeMode; label: string; bgColor: string }[] = [
  { mode: "light", label: "Day", bgColor: "#FAFAFA" },
  { mode: "dark", label: "Night", bgColor: "#0A0A0F" },
  { mode: "sepia", label: "Paper", bgColor: "#F8F4EC" },
  { mode: "dusk", label: "Dusk", bgColor: "#1A1625" },
  { mode: "midnight", label: "AMOLED", bgColor: "#000000" },
  { mode: "forest", label: "Forest", bgColor: "#0F1A14" },
];

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
    updateSettings,
  } = useReading();
  
  const activeBook = contextBook?.id === book.id ? contextBook : book;
  
  const { theme } = useTheme(settings.themeMode, settings.autoTheme);
  
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showUI, setShowUI] = useState(false);
  const [currentPage, setCurrentPage] = useState(book.currentPage || 0);
  const [totalPages, setTotalPages] = useState(book.totalPages || 1);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [estimatedReadingTime, setEstimatedReadingTime] = useState(0);
  const [parsedBook, setParsedBook] = useState<ParsedBook | null>(null);

  const startPageRef = useRef(currentPage);
  const sessionStartRef = useRef(Date.now());
  const readerRef = useRef<UnifiedScrollReaderRef>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const uiOpacity = useSharedValue(0);
  const settingsPanelTranslate = useSharedValue(SCREEN_HEIGHT);

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
      setLoadError(null);

      const fileInfo = await FileSystem.getInfoAsync(book.fileUri);
      if (!fileInfo.exists) {
        setLoadError("Book file not found. Please try re-importing the book.");
        setIsLoading(false);
        return;
      }

      let parsedContent = "";
      let pages = 1;

      if (book.fileType === "epub") {
        const parsed = await BookParserService.parseEpub(book.fileUri);
        setParsedBook(parsed);
        parsedContent = parsed.content;
        pages = parsed.totalPages;
      } else if (book.fileType === "fb2") {
        const parsed = await BookParserService.parseFb2(book.fileUri);
        setParsedBook(parsed);
        parsedContent = parsed.content;
        pages = parsed.totalPages;
      } else if (book.fileType === "txt") {
        parsedContent = await FileSystem.readAsStringAsync(book.fileUri);
        pages = Math.ceil(parsedContent.length / 2000);
      } else if (book.fileType === "pdf") {
        setTotalPages(book.totalPages || 10);
        setIsLoading(false);
        return;
      }

      if (!parsedContent || parsedContent.trim().length === 0) {
        setLoadError("Could not extract text from this book. The file may be corrupted.");
        setIsLoading(false);
        return;
      }

      setContent(parsedContent);
      setTotalPages(Math.max(pages, 1));
      
      const words = parsedContent.split(/\s+/).length;
      setWordCount(words);
      setEstimatedReadingTime(Math.ceil(words / stats.averageReadingSpeed));
      
    } catch (error) {
      console.error("Error loading book:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setLoadError(`Unable to load book: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerHaptic = useCallback((style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(style);
    }
  }, [settings.hapticFeedback]);

  const pauseAutoScrollIfPlaying = useCallback(() => {
    if (settings.scrollMode === "autoScroll" && readerRef.current?.isAutoScrolling()) {
      readerRef.current.pauseAutoScroll();
    }
  }, [settings.scrollMode]);

  const toggleUI = useCallback(() => {
    const newShowUI = !showUI;
    setShowUI(newShowUI);
    
    if (newShowUI) {
      pauseAutoScrollIfPlaying();
    }
    
    if (settings.animationsEnabled) {
      uiOpacity.value = withTiming(newShowUI ? 1 : 0, { 
        duration: Motion.duration.fast 
      });
    } else {
      uiOpacity.value = newShowUI ? 1 : 0;
    }
    
    triggerHaptic();
  }, [showUI, settings.animationsEnabled, triggerHaptic, pauseAutoScrollIfPlaying]);

  const openSettingsPanel = useCallback(() => {
    pauseAutoScrollIfPlaying();
    setShowUI(true);
    uiOpacity.value = withTiming(1, { duration: Motion.duration.fast });
    setShowSettingsPanel(true);
    settingsPanelTranslate.value = withTiming(0, { duration: 300 });
    triggerHaptic();
  }, [settingsPanelTranslate, triggerHaptic, uiOpacity, pauseAutoScrollIfPlaying]);

  const closeSettingsPanel = useCallback(() => {
    settingsPanelTranslate.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
    setTimeout(() => setShowSettingsPanel(false), 250);
    triggerHaptic();
  }, [settingsPanelTranslate, triggerHaptic]);

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

  const handlePdfPageChange = useCallback((page: number, total: number) => {
    setCurrentPage(page - 1);
    setTotalPages(total);
  }, []);

  const handleThemeChange = useCallback((mode: ThemeMode) => {
    triggerHaptic();
    updateSettings({ themeMode: mode, autoTheme: false });
  }, [updateSettings, triggerHaptic]);

  const handleScrollModeChange = useCallback((mode: ScrollMode) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    updateSettings({ scrollMode: mode });
  }, [updateSettings, triggerHaptic]);

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

  const settingsPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: settingsPanelTranslate.value }],
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
      <View style={[styles.container, styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <ThemedText style={[styles.loadingText, { color: theme.secondaryText }]}>
          Loading book...
        </ThemedText>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <Feather name="alert-circle" size={48} color={theme.secondaryText} style={{ marginBottom: 16 }} />
        <ThemedText style={[styles.errorText, { color: theme.text }]}>
          {loadError}
        </ThemedText>
        <Pressable 
          onPress={handleClose} 
          style={[styles.backButton, { borderColor: theme.border }]}
        >
          <ThemedText style={{ color: theme.text }}>Go Back</ThemedText>
        </Pressable>
      </View>
    );
  }

  const renderReader = () => {
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

    return (
      <UnifiedScrollReader
        ref={readerRef}
        content={content}
        scrollMode={settings.scrollMode}
        onScrollProgress={handleScrollProgress}
        onTap={toggleUI}
        onError={(err) => console.error("Reader error:", err)}
        theme={{ 
          text: theme.text, 
          backgroundRoot: theme.backgroundRoot, 
          secondaryText: theme.secondaryText,
          highlightColor: 'rgba(255, 215, 0, 0.4)',
        }}
        settings={{
          fontSize: settings.fontSize,
          lineSpacing: settings.lineSpacing,
          fontFamily: settings.fontFamily,
          marginHorizontal: settings.marginHorizontal,
          letterSpacing: settings.letterSpacing,
          textAlignment: settings.textAlignment,
          bionicReading: settings.bionicReading,
          autoScrollSpeed: settings.autoScrollSpeed,
          tapScrollAnimationSpeed: settings.tapScrollAnimationSpeed,
          tapScrollLinePosition: settings.tapScrollLinePosition,
        }}
        progressBarHeight={settings.showReadingProgress ? PROGRESS_BAR_HEIGHT : 0}
        pauseAutoScroll={pauseAutoScrollIfPlaying}
      />
    );
  };

  const renderSettingsPanel = () => (
    <Modal
      visible={showSettingsPanel}
      transparent
      animationType="none"
      onRequestClose={closeSettingsPanel}
    >
      <Pressable style={styles.settingsOverlay} onPress={closeSettingsPanel}>
        <Animated.View style={[styles.settingsPanel, { backgroundColor: theme.backgroundDefault }, settingsPanelStyle]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.settingsHandle}>
              <View style={[styles.settingsHandleBar, { backgroundColor: theme.border }]} />
            </View>
            
            <ScrollView 
              style={styles.settingsScroll} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            >
              <View style={styles.settingsSection}>
                <ThemedText style={[styles.settingsSectionTitle, { color: theme.text }]}>
                  Theme
                </ThemedText>
                <View style={styles.themeOptions}>
                  {themeOptions.map((opt) => (
                    <Pressable
                      key={opt.mode}
                      style={[
                        styles.themeOption,
                        { 
                          backgroundColor: opt.bgColor,
                          borderColor: settings.themeMode === opt.mode ? theme.accent : theme.border,
                          borderWidth: settings.themeMode === opt.mode ? 2 : 1,
                        },
                      ]}
                      onPress={() => handleThemeChange(opt.mode)}
                    >
                      <ThemedText style={[styles.themeOptionLabel, { color: settings.themeMode === opt.mode ? theme.accent : theme.secondaryText }]}>
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.settingsSection}>
                <ThemedText style={[styles.settingsSectionTitle, { color: theme.text }]}>
                  Scroll Mode
                </ThemedText>
                <View style={styles.scrollModeOptions}>
                  {(Object.keys(ScrollModes) as ScrollMode[]).map((mode) => {
                    const modeData = ScrollModes[mode];
                    const isSelected = settings.scrollMode === mode;
                    const iconName = mode === "seamless" ? "arrow-down" : mode === "tapScroll" ? "mouse-pointer" : "play";
                    return (
                      <Pressable
                        key={mode}
                        style={[
                          styles.scrollModeOption,
                          {
                            backgroundColor: isSelected ? theme.accent : theme.backgroundSecondary,
                          },
                        ]}
                        onPress={() => handleScrollModeChange(mode)}
                      >
                        <Feather name={iconName} size={16} color={isSelected ? "#FFFFFF" : theme.text} />
                        <ThemedText style={[styles.scrollModeLabel, { color: isSelected ? "#FFFFFF" : theme.text }]}>
                          {modeData.name}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {settings.scrollMode === "autoScroll" && (
                <View style={styles.settingsSection}>
                  <View style={styles.sliderHeader}>
                    <ThemedText style={[styles.settingsLabel, { color: theme.text }]}>Auto-Scroll Speed</ThemedText>
                    <ThemedText style={[styles.sliderValue, { color: theme.secondaryText }]}>{settings.autoScrollSpeed} px/s</ThemedText>
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
                <View style={styles.settingsSection}>
                  <View style={styles.sliderHeader}>
                    <ThemedText style={[styles.settingsLabel, { color: theme.text }]}>Animation Speed</ThemedText>
                    <ThemedText style={[styles.sliderValue, { color: theme.secondaryText }]}>{settings.tapScrollAnimationSpeed} ms</ThemedText>
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
                  <ThemedText style={[styles.settingsLabel, { color: theme.text, marginTop: 12 }]}>
                    Scroll Target Position
                  </ThemedText>
                  <View style={styles.tapScrollPositionOptions}>
                    {(Object.keys(TapScrollLinePosition) as TapScrollLinePositionType[]).map((position) => {
                      const isSelected = settings.tapScrollLinePosition === position;
                      return (
                        <Pressable
                          key={position}
                          style={[
                            styles.tapScrollPositionOption,
                            { backgroundColor: isSelected ? theme.accent : theme.backgroundSecondary },
                          ]}
                          onPress={() => {
                            triggerHaptic();
                            updateSettings({ tapScrollLinePosition: position });
                          }}
                        >
                          <ThemedText style={[styles.tapScrollPositionLabel, { color: isSelected ? "#FFFFFF" : theme.text }]}>
                            {TapScrollLinePosition[position].name}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.settingsSection}>
                <ThemedText style={[styles.settingsSectionTitle, { color: theme.text }]}>
                  Text Appearance
                </ThemedText>
                <View style={[styles.previewContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <ThemedText 
                    style={{ 
                      fontSize: settings.fontSize, 
                      lineHeight: settings.fontSize * settings.lineSpacing,
                      color: theme.text,
                      fontFamily: getFontFamily(),
                    }}
                    numberOfLines={3}
                  >
                    The quick brown fox jumps over the lazy dog. This is a preview of your reading settings.
                  </ThemedText>
                </View>
                <View style={styles.compactControls}>
                  <View style={styles.compactSliderRow}>
                    <View style={styles.compactLabelRow}>
                      <Feather name="type" size={14} color={theme.secondaryText} />
                      <ThemedText style={[styles.compactLabel, { color: theme.secondaryText }]}>Size</ThemedText>
                    </View>
                    <Slider
                      style={styles.compactSlider}
                      minimumValue={ReadingDefaults.minFontSize}
                      maximumValue={ReadingDefaults.maxFontSize}
                      value={settings.fontSize}
                      onValueChange={(value) => updateSettings({ fontSize: value })}
                      minimumTrackTintColor={theme.accent}
                      maximumTrackTintColor={theme.backgroundTertiary}
                      thumbTintColor={theme.accent}
                    />
                    <ThemedText style={[styles.compactValue, { color: theme.text }]}>{Math.round(settings.fontSize)}</ThemedText>
                  </View>
                  <View style={styles.compactSliderRow}>
                    <View style={styles.compactLabelRow}>
                      <Feather name="align-justify" size={14} color={theme.secondaryText} />
                      <ThemedText style={[styles.compactLabel, { color: theme.secondaryText }]}>Spacing</ThemedText>
                    </View>
                    <Slider
                      style={styles.compactSlider}
                      minimumValue={ReadingDefaults.minLineSpacing}
                      maximumValue={ReadingDefaults.maxLineSpacing}
                      step={0.1}
                      value={settings.lineSpacing}
                      onValueChange={(value) => updateSettings({ lineSpacing: value })}
                      minimumTrackTintColor={theme.accent}
                      maximumTrackTintColor={theme.backgroundTertiary}
                      thumbTintColor={theme.accent}
                    />
                    <ThemedText style={[styles.compactValue, { color: theme.text }]}>{settings.lineSpacing.toFixed(1)}</ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.settingsSection}>
                <View style={styles.toggleRow}>
                  <View>
                    <ThemedText style={[styles.settingsLabel, { color: theme.text }]}>Bionic Reading</ThemedText>
                    <ThemedText style={[styles.settingsHint, { color: theme.secondaryText }]}>Bold first half of words</ThemedText>
                  </View>
                  <Switch
                    value={settings.bionicReading}
                    onValueChange={(value) => updateSettings({ bionicReading: value })}
                    trackColor={{ false: theme.backgroundTertiary, true: theme.accent }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              <View style={styles.settingsSection}>
                <View style={styles.toggleRow}>
                  <View>
                    <ThemedText style={[styles.settingsLabel, { color: theme.text }]}>Focus Mode</ThemedText>
                    <ThemedText style={[styles.settingsHint, { color: theme.secondaryText }]}>Minimal UI, hides reading time</ThemedText>
                  </View>
                  <Switch
                    value={settings.focusMode}
                    onValueChange={(value) => updateSettings({ focusMode: value })}
                    trackColor={{ false: theme.backgroundTertiary, true: theme.accent }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ReadingTimer 
        visible={settings.showReadingTime || settings.focusMode} 
        focusMode={settings.focusMode}
        showTimer={settings.showReadingTime && !settings.focusMode}
        onBreakSuggested={handleBreakSuggested}
      />

      <View style={[styles.contentContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {renderReader()}
      </View>

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
            { 
              bottom: 0,
              paddingBottom: insets.bottom + Spacing.sm,
              backgroundColor: theme.backgroundRoot,
            },
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
                onPress={openSettingsPanel} 
                style={styles.footerButton}
              >
                <Feather name="sliders" size={20} color={theme.text} />
                <ThemedText style={[styles.footerButtonText, { color: theme.text }]}>
                  Settings
                </ThemedText>
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>
      )}

      {renderSettingsPanel()}

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
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  contentContainer: {
    flex: 1,
    width: "100%",
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
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 3,
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
    minWidth: 36,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
  },
  footerCard: {
    marginBottom: Spacing.sm,
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: Spacing.sm,
  },
  footerButton: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  footerButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  footerDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(128, 128, 128, 0.2)",
  },
  pageInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pageInfo: {
    fontSize: 16,
    fontWeight: "600",
  },
  pageInfoDivider: {
    fontSize: 14,
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  settingsPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  settingsHandle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  settingsHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  settingsScroll: {
    paddingHorizontal: 20,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  themeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeOption: {
    width: (SCREEN_WIDTH - 60) / 3 - 7,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  themeOptionLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  scrollModeOptions: {
    flexDirection: "row",
    gap: 10,
  },
  scrollModeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scrollModeLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  settingsHint: {
    fontSize: 12,
    marginTop: 2,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  compactControls: {
    gap: 12,
  },
  compactSliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compactLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 70,
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  compactSlider: {
    flex: 1,
    height: 32,
  },
  compactValue: {
    fontSize: 13,
    fontWeight: "600",
    width: 32,
    textAlign: "right",
  },
  tapScrollPositionOptions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  tapScrollPositionOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tapScrollPositionLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
});
