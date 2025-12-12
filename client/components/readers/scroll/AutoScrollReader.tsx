import React, { useEffect, useState, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  useAnimatedReaction,
  Easing,
  useAnimatedRef,
  scrollTo,
  cancelAnimation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import type { AutoScrollReaderProps, MeasuredLine, UnifiedScrollReaderRef } from "./types";
import { getFontFamily, renderBionicWord, generateLinesFromContentAsync, createTextStyle } from "./utils";

const getScreenDimensions = () => Dimensions.get("window");
const CHUNK_SIZE = 100;

export const AutoScrollReader = forwardRef<UnifiedScrollReaderRef, AutoScrollReaderProps>(
  (
    {
      content,
      onScrollProgress,
      onTap,
      onReady,
      theme,
      settings,
      initialPosition = 0,
      onAutoScrollStateChange,
      progressBarHeight = 0,
    },
    ref
  ) => {
    const insets = useSafeAreaInsets();
    const animatedScrollViewRef = useAnimatedRef<Animated.ScrollView>();
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoScrollPosition = useSharedValue(0);
    const isAutoScrollActive = useSharedValue(false);
    const autoScrollMaxY = useSharedValue(0);

    const [screenDimensions, setScreenDimensions] = useState(() => getScreenDimensions());
    const [contentHeight, setContentHeight] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(screenDimensions.height);
    const [currentScrollY, setCurrentScrollY] = useState(0);

    useEffect(() => {
      const subscription = Dimensions.addEventListener("change", ({ window }) => {
        setScreenDimensions(window);
      });
      return () => subscription?.remove();
    }, []);

    const [highlightedLineY, setHighlightedLineY] = useState<number | null>(null);
    const [highlightedLineHeight, setHighlightedLineHeight] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [textContainerY, setTextContainerY] = useState(0);
    const [isAutoScrollPlaying, setIsAutoScrollPlaying] = useState(false);
    const [showStartOverlay, setShowStartOverlay] = useState(false);
    const hasUserStartedReadingRef = useRef(false);
    const [displayedLines, setDisplayedLines] = useState<MeasuredLine[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const allLinesRef = useRef<MeasuredLine[]>([]);
    const generationIdRef = useRef(0);
    const onReadyCalledRef = useRef(false);

    const highlightOpacity = useSharedValue(0);
    const animatedScrollY = useSharedValue(0);
    const isAnimatingScrollShared = useSharedValue(0);
    const scrollAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const lineHeight = settings.fontSize * settings.lineSpacing;
    const paddingTop = insets.top + 60;
    const paddingBottom = insets.bottom + 60 + progressBarHeight;

    const autoScrollSpeed = Math.max(5, Math.min(settings.autoScrollSpeed || 50, 200));

    useEffect(() => {
      if (!content || content.length === 0) {
        setDisplayedLines([]);
        setIsReady(false);
        onReadyCalledRef.current = false;
        return;
      }

      const currentGenerationId = ++generationIdRef.current;
      onReadyCalledRef.current = false;
      setIsReady(false);
      setDisplayedLines([]);
      allLinesRef.current = [];

      generateLinesFromContentAsync(
        content,
        lineHeight,
        50,
        (firstChunkLines) => {
          if (currentGenerationId !== generationIdRef.current) return;
          allLinesRef.current = firstChunkLines;
          setDisplayedLines(firstChunkLines.slice(0, CHUNK_SIZE));
          setIsReady(true);
          if (!onReadyCalledRef.current) {
            onReadyCalledRef.current = true;
            onReady?.();
          }
        },
        CHUNK_SIZE
      ).then((allLines) => {
        if (currentGenerationId !== generationIdRef.current) return;
        allLinesRef.current = allLines;
        if (!onReadyCalledRef.current && allLines.length > 0) {
          setDisplayedLines(allLines.slice(0, CHUNK_SIZE));
          onReadyCalledRef.current = true;
          setIsReady(true);
          onReady?.();
        }
      });

      return () => {
        generationIdRef.current++;
      };
    }, [content, lineHeight, onReady]);

    const loadMoreLines = useCallback(() => {
      if (isLoadingMore) return;
      if (displayedLines.length >= allLinesRef.current.length) return;

      setIsLoadingMore(true);
      setTimeout(() => {
        const nextChunk = allLinesRef.current.slice(
          displayedLines.length,
          displayedLines.length + CHUNK_SIZE
        );
        setDisplayedLines(prev => [...prev, ...nextChunk]);
        setIsLoadingMore(false);
      }, 0);
    }, [displayedLines.length, isLoadingMore]);

    const updateScrollPosition = useCallback(
      (y: number) => {
        scrollTo(animatedScrollViewRef, 0, y, false);
      },
      [animatedScrollViewRef]
    );

    const finishScrollAnimation = useCallback(() => {
      isAnimatingScrollShared.value = 0;
    }, [isAnimatingScrollShared]);

    useAnimatedReaction(
      () => ({ y: animatedScrollY.value, isAnimating: isAnimatingScrollShared.value }),
      (current) => {
        if (current.isAnimating === 1) {
          runOnJS(updateScrollPosition)(current.y);
        }
      },
      [updateScrollPosition]
    );

    const updateScrollYFromWorklet = useCallback(
      (y: number) => {
        setCurrentScrollY(y);
        if (contentHeight > 0) {
          const maxScroll = Math.max(1, contentHeight - viewportHeight + paddingTop + paddingBottom);
          const progress = Math.min(1, Math.max(0, y / maxScroll));
          onScrollProgress?.(progress, y, contentHeight);

          if (progress > 0.7) {
            loadMoreLines();
          }
        }
      },
      [contentHeight, viewportHeight, paddingTop, paddingBottom, onScrollProgress, loadMoreLines]
    );

    useAnimatedReaction(
      () => ({ active: isAutoScrollActive.value, pos: autoScrollPosition.value }),
      (current, previous) => {
        if (current.active) {
          scrollTo(animatedScrollViewRef, 0, current.pos, false);
          if (!previous || Math.abs(current.pos - (previous.pos || 0)) > 5) {
            runOnJS(updateScrollYFromWorklet)(current.pos);
          }
        }
      },
      [animatedScrollViewRef, updateScrollYFromWorklet]
    );

    const startAutoScroll = useCallback(() => {
      if (isAutoScrollActive.value) return;

      const maxScroll = Math.max(0, contentHeight - viewportHeight + paddingTop + paddingBottom);
      autoScrollMaxY.value = maxScroll;
      autoScrollPosition.value = currentScrollY;
      isAutoScrollActive.value = true;

      const remainingDistance = maxScroll - currentScrollY;
      const duration = (remainingDistance / autoScrollSpeed) * 1000;

      autoScrollPosition.value = withTiming(
        maxScroll,
        {
          duration: Math.max(100, duration),
          easing: Easing.linear,
        },
        (finished) => {
          if (finished) {
            isAutoScrollActive.value = false;
            runOnJS(setIsAutoScrollPlaying)(false);
            if (onAutoScrollStateChange) {
              runOnJS(onAutoScrollStateChange)(false);
            }
          }
        }
      );

      setIsAutoScrollPlaying(true);
      onAutoScrollStateChange?.(true);
    }, [
      autoScrollSpeed,
      currentScrollY,
      contentHeight,
      viewportHeight,
      paddingTop,
      paddingBottom,
      onAutoScrollStateChange,
      autoScrollPosition,
      autoScrollMaxY,
      isAutoScrollActive,
    ]);

    const stopAutoScroll = useCallback(() => {
      cancelAnimation(autoScrollPosition);
      isAutoScrollActive.value = false;
      setIsAutoScrollPlaying(false);
      onAutoScrollStateChange?.(false);
    }, [onAutoScrollStateChange, autoScrollPosition, isAutoScrollActive]);

    const toggleAutoScroll = useCallback(() => {
      if (isAutoScrollPlaying) {
        stopAutoScroll();
      } else {
        startAutoScroll();
      }
    }, [isAutoScrollPlaying, startAutoScroll, stopAutoScroll]);

    const handleLeftTap = useCallback(() => {
      if (isAutoScrollPlaying) {
        stopAutoScroll();
      }
      onTap?.();
    }, [onTap, isAutoScrollPlaying, stopAutoScroll]);

    const scrollToPosition = useCallback(
      (position: number) => {
        if (contentHeight <= 0) return;

        const ratio = position / content.length;
        const targetY = ratio * contentHeight;

        scrollTo(animatedScrollViewRef, 0, targetY, false);
      },
      [contentHeight, content.length, animatedScrollViewRef]
    );

    const getCurrentPosition = useCallback((): number => {
      if (contentHeight <= 0 || content.length === 0) return 0;
      const maxScroll = Math.max(contentHeight - viewportHeight + paddingTop + paddingBottom, 1);
      const ratio = currentScrollY / maxScroll;
      return Math.floor(Math.min(1, Math.max(0, ratio)) * content.length);
    }, [currentScrollY, contentHeight, content.length, viewportHeight, paddingTop, paddingBottom]);

    useImperativeHandle(
      ref,
      () => ({
        scrollToPosition,
        getCurrentPosition,
        toggleAutoScroll,
        isAutoScrolling: () => isAutoScrollPlaying,
        pauseAutoScroll: stopAutoScroll,
      }),
      [scrollToPosition, getCurrentPosition, toggleAutoScroll, isAutoScrollPlaying, stopAutoScroll]
    );

    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        setCurrentScrollY(contentOffset.y);

        if (contentSize.height > 0) {
          const maxScroll = contentSize.height - layoutMeasurement.height;
          const progress = maxScroll > 0 ? contentOffset.y / maxScroll : 0;
          onScrollProgress?.(Math.min(1, Math.max(0, progress)), contentOffset.y, contentSize.height);

          if (progress > 0.7) {
            loadMoreLines();
          }
        }
      },
      [onScrollProgress, loadMoreLines]
    );

    const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
      setContentHeight(event.nativeEvent.layout.height);
      setTextContainerY(event.nativeEvent.layout.y);
    }, []);

    const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
      setViewportHeight(event.nativeEvent.layout.height);
    }, []);

    useEffect(() => {
      if (isReady && contentHeight > 0 && !hasUserStartedReadingRef.current) {
        setShowStartOverlay(true);
      }
    }, [isReady, contentHeight]);

    const handleStartReading = useCallback(() => {
      hasUserStartedReadingRef.current = true;
      setShowStartOverlay(false);
      setTimeout(() => {
        startAutoScroll();
      }, 300);
    }, [startAutoScroll]);

    useEffect(() => {
      if (initialPosition > 0 && contentHeight > 0 && isReady) {
        const ratio = initialPosition / content.length;
        const targetY = ratio * contentHeight;
        setTimeout(() => {
          scrollTo(animatedScrollViewRef, 0, targetY, false);
        }, 150);
      }
    }, [initialPosition, contentHeight, content.length, isReady]);

    useEffect(() => {
      return () => {
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        cancelAnimation(autoScrollPosition);
        if (scrollAnimationTimeoutRef.current) {
          clearTimeout(scrollAnimationTimeoutRef.current);
        }
      };
    }, [autoScrollPosition]);

    const textStyle = useMemo(
      () => createTextStyle(settings, lineHeight, theme.text),
      [settings, lineHeight, theme.text]
    );

    const highlightAnimatedStyle = useAnimatedStyle(() => ({
      opacity: highlightOpacity.value,
    }));

    const highlightColor = theme.highlightColor || "rgba(255, 215, 0, 0.45)";

    const tapGesture = Gesture.Tap()
      .onEnd((event) => {
        const screenWidth = screenDimensions.width;
        const tapX = event.x;
        if (tapX < screenWidth * 0.25) {
          runOnJS(handleLeftTap)();
        } else if (tapX > screenWidth * 0.75) {
          runOnJS(toggleAutoScroll)();
        }
      })
      .runOnJS(true);

    const renderContent = () => {
      if (!isReady) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.accent || theme.text} />
            <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
              Loading...
            </Text>
          </View>
        );
      }

      const textToRender = displayedLines.map((line, index) => {
        const lineText = settings.bionicReading
          ? line.text.split(/(\s+)/).map((part, i) => renderBionicWord(part, `${index}-${i}`))
          : line.text;
        return (
          <Text key={index} style={[styles.lineText, textStyle]}>
            {lineText}
            {"\n"}
          </Text>
        );
      });

      return (
        <>
          {textToRender}
          {isLoadingMore && (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={theme.accent || theme.text} />
            </View>
          )}
        </>
      );
    };

    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]} onLayout={handleViewportLayout}>
        {isAutoScrollPlaying && (
          <View style={styles.autoScrollIndicator}>
            <View style={[styles.autoScrollBadge, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
              <Feather name="play" size={10} color="#FFFFFF" />
              <Text style={[styles.autoScrollText, { color: "#FFFFFF" }]}>Auto</Text>
            </View>
          </View>
        )}

        {highlightedLineY !== null && (
          <Animated.View
            style={[
              styles.highlightOverlay,
              highlightAnimatedStyle,
              {
                top: highlightedLineY - currentScrollY + textContainerY + paddingTop,
                height: highlightedLineHeight,
                backgroundColor: highlightColor,
              },
            ]}
          />
        )}

        <GestureDetector gesture={tapGesture}>
          <Animated.ScrollView
            ref={animatedScrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={[
              styles.contentContainer,
              {
                paddingTop,
                paddingBottom,
                paddingHorizontal: settings.marginHorizontal,
              },
            ]}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            scrollEnabled={!isAutoScrollPlaying}
          >
            <View onLayout={handleContentLayout}>{renderContent()}</View>
          </Animated.ScrollView>
        </GestureDetector>

        {showStartOverlay && (
          <View style={styles.startOverlay}>
            <View style={[styles.startContent, { backgroundColor: theme.backgroundRoot }]}>
              <View style={[styles.startIconContainer, { backgroundColor: "rgba(100, 100, 255, 0.15)" }]}>
                <Feather name="play" size={32} color={theme.text} />
              </View>
              <Text style={[styles.startTitle, { color: theme.text }]}>Auto-Scroll Mode</Text>
              <Text style={[styles.startDescription, { color: theme.secondaryText }]}>
                Text will scroll automatically at your preferred speed. Tap the left edge to pause.
              </Text>
              <Pressable
                style={[styles.startButton, { backgroundColor: theme.text }]}
                onPress={handleStartReading}
              >
                <Feather name="play" size={18} color={theme.backgroundRoot} />
                <Text style={[styles.startButtonText, { color: theme.backgroundRoot }]}>Start Reading</Text>
              </Pressable>
              <Text style={[styles.startHint, { color: theme.secondaryText }]}>
                Speed: {autoScrollSpeed} px/s
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  lineText: {
    flexWrap: "wrap",
  },
  highlightOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1,
    pointerEvents: "none",
  },
  autoScrollIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 50,
  },
  autoScrollBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  autoScrollText: {
    fontSize: 11,
    fontWeight: "500",
  },
  startOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  startContent: {
    width: "85%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
  },
  startIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  startTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  startDescription: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginBottom: 12,
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  startHint: {
    fontSize: 13,
    textAlign: "center",
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
