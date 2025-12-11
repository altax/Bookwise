import React, { useEffect, useState, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Platform,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
  Pressable,
  TextLayoutEventData,
  Easing,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  useAnimatedReaction,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ScrollMode, TapScrollLinePositionType } from "@/constants/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface UnifiedScrollReaderProps {
  content: string;
  scrollMode: ScrollMode;
  onScrollProgress?: (progress: number, currentPosition: number, totalHeight: number) => void;
  onError?: (error: string) => void;
  onTap?: () => void;
  theme: {
    text: string;
    backgroundRoot: string;
    secondaryText: string;
    highlightColor?: string;
  };
  settings: {
    fontSize: number;
    lineSpacing: number;
    fontFamily: string;
    marginHorizontal: number;
    letterSpacing: number;
    textAlignment: "left" | "justify";
    bionicReading: boolean;
    autoScrollSpeed?: number;
    tapScrollAnimationSpeed?: number;
    tapScrollLinePosition?: TapScrollLinePositionType;
  };
  initialPosition?: number;
  onAutoScrollStateChange?: (isPlaying: boolean) => void;
}

export interface UnifiedScrollReaderRef {
  scrollToPosition: (position: number) => void;
  getCurrentPosition: () => number;
  toggleAutoScroll: () => void;
  isAutoScrolling: () => boolean;
}

interface MeasuredLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  ascender: number;
  descender: number;
  capHeight: number;
  xHeight: number;
}

export const UnifiedScrollReader = forwardRef<UnifiedScrollReaderRef, UnifiedScrollReaderProps>(({
  content,
  scrollMode,
  onScrollProgress,
  onTap,
  theme,
  settings,
  initialPosition = 0,
  onAutoScrollStateChange,
}, ref) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingRef = useRef(false);
  const lastTapTimeRef = useRef(0);
  const measuredLinesRef = useRef<MeasuredLine[]>([]);
  const autoScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(SCREEN_HEIGHT);
  const [currentScrollY, setCurrentScrollY] = useState(0);
  const [highlightedLineY, setHighlightedLineY] = useState<number | null>(null);
  const [highlightedLineHeight, setHighlightedLineHeight] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [textContainerY, setTextContainerY] = useState(0);
  const [isAutoScrollPlaying, setIsAutoScrollPlaying] = useState(false);
  
  const highlightOpacity = useSharedValue(0);
  const animatedScrollY = useSharedValue(0);
  const isAnimatingScrollShared = useSharedValue(0);
  const scrollAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lineHeight = settings.fontSize * settings.lineSpacing;
  const verticalPadding = 40;
  const headerSpace = 60;
  const footerSpace = 80;
  const paddingTop = headerSpace + verticalPadding;
  const paddingBottom = footerSpace + verticalPadding;
  
  const autoScrollSpeed = settings.autoScrollSpeed || 50;
  const tapScrollAnimationSpeed = settings.tapScrollAnimationSpeed || 300;
  const tapScrollLinePosition = settings.tapScrollLinePosition || "top";

  const updateScrollPosition = useCallback((y: number) => {
    scrollViewRef.current?.scrollTo({ y, animated: false });
  }, []);

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

  const animateScrollTo = useCallback((targetY: number, duration: number) => {
    if (scrollAnimationTimeoutRef.current) {
      clearTimeout(scrollAnimationTimeoutRef.current);
      scrollAnimationTimeoutRef.current = null;
    }
    
    isAnimatingScrollShared.value = 1;
    animatedScrollY.value = currentScrollY;
    
    animatedScrollY.value = withTiming(targetY, {
      duration: duration,
    }, (finished) => {
      'worklet';
      if (finished) {
        runOnJS(finishScrollAnimation)();
      }
    });
    
    scrollAnimationTimeoutRef.current = setTimeout(() => {
      isAnimatingScrollShared.value = 0;
      scrollAnimationTimeoutRef.current = null;
    }, duration + 50);
  }, [currentScrollY, animatedScrollY, isAnimatingScrollShared, finishScrollAnimation]);

  const handleTextLayout = useCallback((event: NativeSyntheticEvent<TextLayoutEventData>) => {
    const { lines } = event.nativeEvent;
    if (lines && lines.length > 0) {
      measuredLinesRef.current = lines.map(line => ({
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
      setIsReady(true);
    }
  }, []);

  const findLastFullyVisibleLineIndex = useCallback((): number => {
    const lines = measuredLinesRef.current;
    if (lines.length === 0) return -1;
    
    const scrollOffset = currentScrollY;
    const textAreaTop = paddingTop + textContainerY;
    
    let lastFullyVisibleIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineAbsoluteTop = textAreaTop + line.y;
      const lineAbsoluteBottom = lineAbsoluteTop + line.height;
      
      const lineScreenTop = lineAbsoluteTop - scrollOffset;
      const lineScreenBottom = lineAbsoluteBottom - scrollOffset;
      
      const visibleTop = 0;
      const visibleBottom = viewportHeight;
      
      const isFullyVisible = lineScreenTop >= visibleTop && lineScreenBottom <= visibleBottom;
      
      if (isFullyVisible && line.text.trim().length > 0) {
        lastFullyVisibleIndex = i;
      }
    }
    
    return lastFullyVisibleIndex;
  }, [currentScrollY, viewportHeight, paddingTop, textContainerY]);

  const scrollToLineIndex = useCallback((lineIndex: number, highlight: boolean = true) => {
    const lines = measuredLinesRef.current;
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    
    const line = lines[lineIndex];
    
    let targetY: number;
    if (tapScrollLinePosition === "center") {
      targetY = line.y + textContainerY + paddingTop - (viewportHeight / 2) + (line.height / 2);
    } else {
      targetY = line.y + textContainerY + paddingTop - verticalPadding;
    }
    
    isScrollingRef.current = true;
    
    const animDuration = Math.max(tapScrollAnimationSpeed, 100);
    animateScrollTo(Math.max(0, targetY), animDuration);
    
    setTimeout(() => {
      isScrollingRef.current = false;
    }, animDuration + 100);
    
    if (highlight) {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
      
      setHighlightedLineY(line.y);
      setHighlightedLineHeight(line.height);
      highlightOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(1, { duration: 700 }),
        withTiming(0, { duration: 300 })
      );
      
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedLineY(null);
        highlightTimeoutRef.current = null;
      }, 1100);
    }
  }, [paddingTop, textContainerY, highlightOpacity, tapScrollLinePosition, viewportHeight, tapScrollAnimationSpeed, animateScrollTo]);

  const handleTapScroll = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 350) return;
    lastTapTimeRef.current = now;
    
    if (isScrollingRef.current) return;
    
    const lastVisibleIndex = findLastFullyVisibleLineIndex();
    const lines = measuredLinesRef.current;
    
    if (lastVisibleIndex >= 0 && lastVisibleIndex < lines.length - 1) {
      scrollToLineIndex(lastVisibleIndex, true);
    }
  }, [findLastFullyVisibleLineIndex, scrollToLineIndex]);

  const startAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) return;
    
    const pixelsPerSecond = autoScrollSpeed;
    const intervalMs = 16;
    const pixelsPerInterval = pixelsPerSecond / (1000 / intervalMs);
    
    let currentY = currentScrollY;
    
    autoScrollIntervalRef.current = setInterval(() => {
      const maxScroll = contentHeight - viewportHeight + paddingTop + paddingBottom;
      currentY += pixelsPerInterval;
      
      if (currentY >= maxScroll) {
        stopAutoScroll();
        return;
      }
      
      scrollViewRef.current?.scrollTo({
        y: currentY,
        animated: false,
      });
    }, intervalMs);
    
    setIsAutoScrollPlaying(true);
    onAutoScrollStateChange?.(true);
  }, [autoScrollSpeed, currentScrollY, contentHeight, viewportHeight, paddingTop, paddingBottom, onAutoScrollStateChange]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    setIsAutoScrollPlaying(false);
    onAutoScrollStateChange?.(false);
  }, [onAutoScrollStateChange]);

  const toggleAutoScroll = useCallback(() => {
    if (isAutoScrollPlaying) {
      stopAutoScroll();
    } else {
      startAutoScroll();
    }
  }, [isAutoScrollPlaying, startAutoScroll, stopAutoScroll]);

  const handleScreenTap = useCallback(() => {
    if (scrollMode === "tapScroll") {
      handleTapScroll();
    } else if (scrollMode === "autoScroll") {
      toggleAutoScroll();
    } else {
      onTap?.();
    }
  }, [scrollMode, handleTapScroll, toggleAutoScroll, onTap]);

  const scrollToPosition = useCallback((position: number) => {
    if (contentHeight <= 0) return;
    
    const ratio = position / content.length;
    const targetY = ratio * contentHeight;
    
    scrollViewRef.current?.scrollTo({ y: targetY, animated: false });
  }, [contentHeight, content.length]);

  const getCurrentPosition = useCallback((): number => {
    if (contentHeight <= 0 || content.length === 0) return 0;
    const maxScroll = Math.max(contentHeight - viewportHeight + paddingTop + paddingBottom, 1);
    const ratio = currentScrollY / maxScroll;
    return Math.floor(Math.min(1, Math.max(0, ratio)) * content.length);
  }, [currentScrollY, contentHeight, content.length, viewportHeight, paddingTop, paddingBottom]);

  useImperativeHandle(ref, () => ({
    scrollToPosition,
    getCurrentPosition,
    toggleAutoScroll,
    isAutoScrolling: () => isAutoScrollPlaying,
  }), [scrollToPosition, getCurrentPosition, toggleAutoScroll, isAutoScrollPlaying]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    setCurrentScrollY(contentOffset.y);
    
    if (contentSize.height > 0) {
      const maxScroll = contentSize.height - layoutMeasurement.height;
      const progress = maxScroll > 0 ? contentOffset.y / maxScroll : 0;
      onScrollProgress?.(Math.min(1, Math.max(0, progress)), contentOffset.y, contentSize.height);
    }
  }, [onScrollProgress]);

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
        scrollViewRef.current?.scrollTo({ y: targetY, animated: false });
      }, 150);
    }
  }, [initialPosition, contentHeight, content.length, isReady]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
      if (scrollAnimationTimeoutRef.current) {
        clearTimeout(scrollAnimationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (scrollMode !== "autoScroll" && isAutoScrollPlaying) {
      stopAutoScroll();
    }
  }, [scrollMode, isAutoScrollPlaying, stopAutoScroll]);

  const getFontFamily = () => {
    switch (settings.fontFamily) {
      case "serif":
        return Platform.OS === "ios" ? "Georgia" : "serif";
      case "georgia":
        return Platform.OS === "ios" ? "Georgia" : "serif";
      case "times":
        return Platform.OS === "ios" ? "Times New Roman" : "serif";
      case "palatino":
        return Platform.OS === "ios" ? "Palatino" : "serif";
      default:
        return Platform.OS === "ios" ? "System" : "sans-serif";
    }
  };

  const textStyle = useMemo(() => ({
    fontSize: settings.fontSize,
    lineHeight: lineHeight,
    fontFamily: getFontFamily(),
    color: theme.text,
    letterSpacing: settings.letterSpacing,
    textAlign: settings.textAlignment as "left" | "justify",
  }), [settings.fontSize, lineHeight, settings.letterSpacing, settings.textAlignment, theme.text, settings.fontFamily]);

  const highlightAnimatedStyle = useAnimatedStyle(() => ({
    opacity: highlightOpacity.value,
  }));

  const renderBionicWord = (word: string, key: string | number) => {
    if (/^\s+$/.test(word)) {
      return <Text key={key}>{word}</Text>;
    }
    const midpoint = Math.ceil(word.length / 2);
    const boldPart = word.substring(0, midpoint);
    const normalPart = word.substring(midpoint);
    return (
      <Text key={key}>
        <Text style={{ fontWeight: 'bold' }}>{boldPart}</Text>
        {normalPart}
      </Text>
    );
  };

  const highlightColor = theme.highlightColor || 'rgba(255, 215, 0, 0.45)';

  const renderContent = () => {
    return (
      <View>
        <Text 
          style={[styles.content, textStyle, { position: 'absolute', opacity: 0 }]} 
          onTextLayout={handleTextLayout}
        >
          {content}
        </Text>
        {settings.bionicReading ? (
          <Text style={[styles.content, textStyle]}>
            {content.split(/(\s+)/).map((part, i) => renderBionicWord(part, i))}
          </Text>
        ) : (
          <Text style={[styles.content, textStyle]}>
            {content}
          </Text>
        )}
      </View>
    );
  };

  const handleScrollEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (scrollMode !== "tapScroll") return;
    
    const { contentOffset } = event.nativeEvent;
    const lines = measuredLinesRef.current;
    if (lines.length === 0) return;
    
    const textAreaTop = paddingTop + textContainerY;
    
    let closestLineIndex = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineScrollPosition = textAreaTop + line.y - verticalPadding;
      const distance = Math.abs(contentOffset.y - lineScrollPosition);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestLineIndex = i;
      }
    }
    
    const targetLine = lines[closestLineIndex];
    const targetY = textAreaTop + targetLine.y - verticalPadding;
    
    scrollViewRef.current?.scrollTo({
      y: Math.max(0, targetY),
      animated: true,
    });
  }, [scrollMode, paddingTop, textContainerY, verticalPadding]);

  const scrollViewProps = scrollMode === "tapScroll" ? {
    scrollEnabled: true,
    showsVerticalScrollIndicator: false,
    decelerationRate: 0.99 as const,
    onScrollEndDrag: handleScrollEndDrag,
    onMomentumScrollEnd: handleScrollEndDrag,
  } : scrollMode === "autoScroll" ? {
    scrollEnabled: !isAutoScrollPlaying,
    showsVerticalScrollIndicator: false,
    decelerationRate: "normal" as const,
  } : scrollMode === "seamless" ? {
    scrollEnabled: true,
    showsVerticalScrollIndicator: false,
    decelerationRate: "normal" as const,
  } : {
    scrollEnabled: true,
    showsVerticalScrollIndicator: false,
    decelerationRate: "fast" as const,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]} onLayout={handleViewportLayout}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleScreenTap}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            {
              paddingHorizontal: settings.marginHorizontal,
              paddingTop: paddingTop,
              paddingBottom: paddingBottom,
            },
          ]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          {...scrollViewProps}
        >
          <View style={styles.textWrapper}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View onLayout={handleContentLayout} pointerEvents="none">
                {renderContent()}
                
                {highlightedLineY !== null && (
                  <Animated.View
                    style={[
                      styles.lineHighlight,
                      {
                        top: highlightedLineY - 2,
                        height: highlightedLineHeight + 4,
                        backgroundColor: highlightColor,
                      },
                      highlightAnimatedStyle,
                    ]}
                  />
                )}
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </Pressable>
    </View>
  );
});

UnifiedScrollReader.displayName = "UnifiedScrollReader";

export default UnifiedScrollReader;

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
  textWrapper: {
    position: "relative",
  },
  content: {
    textAlign: "left",
  },
  lineHighlight: {
    position: "absolute",
    left: -4,
    right: -4,
    borderRadius: 4,
    zIndex: -1,
  },
});
