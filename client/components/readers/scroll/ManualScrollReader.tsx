import React, { useEffect, useState, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import {
  View,
  StyleSheet,
  Text,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
  TextLayoutEventData,
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
import { getFontFamily, renderBionicWord, generateLinesFromContent, createTextStyle } from "./utils";

export const ManualScrollReader = forwardRef<UnifiedScrollReaderRef, BaseReaderProps>(
  (
    {
      content,
      onScrollProgress,
      onTap,
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
    const measuredLinesRef = useRef<MeasuredLine[]>([]);

    const [contentHeight, setContentHeight] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [currentScrollY, setCurrentScrollY] = useState(0);
    const [highlightedLineY, setHighlightedLineY] = useState<number | null>(null);
    const [highlightedLineHeight, setHighlightedLineHeight] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [textContainerY, setTextContainerY] = useState(0);

    const highlightOpacity = useSharedValue(0);
    const animatedScrollY = useSharedValue(0);
    const isAnimatingScrollShared = useSharedValue(0);
    const scrollAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const lineHeight = settings.fontSize * settings.lineSpacing;
    const paddingTop = insets.top + 60;
    const paddingBottom = insets.bottom + 60 + progressBarHeight;

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

    const animateScrollTo = useCallback(
      (targetY: number, duration: number) => {
        if (scrollAnimationTimeoutRef.current) {
          clearTimeout(scrollAnimationTimeoutRef.current);
          scrollAnimationTimeoutRef.current = null;
        }

        isAnimatingScrollShared.value = 1;
        animatedScrollY.value = currentScrollY;

        animatedScrollY.value = withTiming(
          targetY,
          {
            duration: duration,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          },
          (finished) => {
            "worklet";
            if (finished) {
              runOnJS(finishScrollAnimation)();
            }
          }
        );

        scrollAnimationTimeoutRef.current = setTimeout(() => {
          isAnimatingScrollShared.value = 0;
          scrollAnimationTimeoutRef.current = null;
        }, duration + 50);
      },
      [currentScrollY, animatedScrollY, isAnimatingScrollShared, finishScrollAnimation]
    );

    const generateFallbackLines = useCallback(() => {
      if (!content || content.trim().length === 0) return;

      const lines = generateLinesFromContent(content, lineHeight);
      if (lines.length > 0) {
        measuredLinesRef.current = lines;
        setIsReady(true);
      }
    }, [content, lineHeight]);

    const handleTextLayout = useCallback(
      (event: NativeSyntheticEvent<TextLayoutEventData>) => {
        const { lines } = event.nativeEvent;
        if (lines && lines.length > 0) {
          const allLines = lines.map((line) => ({
            text: line.text,
            x: line.x,
            y: line.y,
            width: line.width,
            height: line.height,
            ascender: line.ascender,
            descender: line.descender,
            capHeight: line.capHeight,
            xHeight: line.xHeight,
          }));
          measuredLinesRef.current = allLines;
          setIsReady(true);
        } else if (!isReady) {
          generateFallbackLines();
        }
      },
      [isReady, generateFallbackLines]
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
        }
      },
      [onScrollProgress]
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
      const textToRender = settings.bionicReading
        ? content.split(/(\s+)/).map((part, i) => renderBionicWord(part, i))
        : content;

      return (
        <Text style={[styles.content, textStyle]} onTextLayout={handleTextLayout}>
          {textToRender}
        </Text>
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
  content: {
    flexWrap: "wrap",
  },
  highlightOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1,
    pointerEvents: "none",
  },
});
