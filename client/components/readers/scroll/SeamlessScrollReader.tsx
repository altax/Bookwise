import React, { useEffect, useState, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import {
  View,
  StyleSheet,
  Text,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
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
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BaseReaderProps, MeasuredLine, UnifiedScrollReaderRef } from "./types";
import { getFontFamily, renderBionicWord, generateLinesFromContentAsync, createTextStyle } from "./utils";

const CHUNK_SIZE = 100;

export const SeamlessScrollReader = forwardRef<UnifiedScrollReaderRef, BaseReaderProps>(
  (
    {
      content,
      onScrollProgress,
      onTap,
      onReady,
      theme,
      settings,
      initialPosition = 0,
      progressBarHeight = 0,
    },
    ref
  ) => {
    const insets = useSafeAreaInsets();
    const animatedScrollViewRef = useAnimatedRef<Animated.ScrollView>();
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [contentHeight, setContentHeight] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [currentScrollY, setCurrentScrollY] = useState(0);
    const [highlightedLineY, setHighlightedLineY] = useState<number | null>(null);
    const [highlightedLineHeight, setHighlightedLineHeight] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [textContainerY, setTextContainerY] = useState(0);
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
        toggleAutoScroll: () => {},
        isAutoScrolling: () => false,
        pauseAutoScroll: () => {},
      }),
      [scrollToPosition, getCurrentPosition]
    );

    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        setCurrentScrollY(contentOffset.y);

        if (contentSize.height > 0) {
          const maxScroll = contentSize.height - layoutMeasurement.height;
          const progress = maxScroll > 0 ? contentOffset.y / maxScroll : 0;
          onScrollProgress?.(Math.min(1, Math.max(0, progress)), contentOffset.y, contentSize.height);

          const scrollPercent = maxScroll > 0 ? contentOffset.y / maxScroll : 0;
          if (scrollPercent > 0.7) {
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
        if (scrollAnimationTimeoutRef.current) {
          clearTimeout(scrollAnimationTimeoutRef.current);
        }
      };
    }, []);

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
        const screenWidth = viewportHeight > 0 ? viewportHeight : 400;
        const tapX = event.x;
        if (tapX < screenWidth * 0.25) {
          if (onTap) {
            runOnJS(onTap)();
          }
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
          >
            <View onLayout={handleContentLayout}>{renderContent()}</View>
          </Animated.ScrollView>
        </GestureDetector>
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
