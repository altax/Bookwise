import React, { useEffect, useState, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import {
  View,
  StyleSheet,
  Text,
  Platform,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
  Pressable,
  TextLayoutEventData,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  useAnimatedReaction,
  Easing,
  withSpring,
  useAnimatedRef,
  scrollTo,
  cancelAnimation,
  useDerivedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import type { ScrollMode } from "@/constants/theme";

const getScreenDimensions = () => Dimensions.get("window");

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
  };
  initialPosition?: number;
  onAutoScrollStateChange?: (isPlaying: boolean) => void;
  progressBarHeight?: number;
  pauseAutoScroll?: () => void;
}

export interface UnifiedScrollReaderRef {
  scrollToPosition: (position: number) => void;
  getCurrentPosition: () => number;
  toggleAutoScroll: () => void;
  isAutoScrolling: () => boolean;
  pauseAutoScroll: () => void;
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
  progressBarHeight = 0,
  pauseAutoScroll: externalPauseAutoScroll,
}, ref) => {
  const insets = useSafeAreaInsets();
  const animatedScrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingRef = useRef(false);
  const lastTapTimeRef = useRef(0);
  const measuredLinesRef = useRef<MeasuredLine[]>([]);
  const autoScrollPosition = useSharedValue(0);
  const isAutoScrollActive = useSharedValue(false);
  const autoScrollMaxY = useSharedValue(0);
  
  const [screenDimensions, setScreenDimensions] = useState(() => getScreenDimensions());
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(screenDimensions.height);
  const [currentScrollY, setCurrentScrollY] = useState(0);
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
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
  
  const highlightOpacity = useSharedValue(0);
  const animatedScrollY = useSharedValue(0);
  const isAnimatingScrollShared = useSharedValue(0);
  const scrollAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lineHeight = settings.fontSize * settings.lineSpacing;
  const paddingTop = insets.top + 60;
  const paddingBottom = insets.bottom + 60 + progressBarHeight;
  
  const autoScrollSpeed = Math.max(5, Math.min(settings.autoScrollSpeed || 50, 200));

  const updateScrollPosition = useCallback((y: number) => {
    scrollTo(animatedScrollViewRef, 0, y, false);
  }, [animatedScrollViewRef]);

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
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
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

  const findMiddleVisibleLineIndex = useCallback((): number => {
    const lines = measuredLinesRef.current;
    if (lines.length === 0) return -1;
    
    const scrollOffset = currentScrollY;
    const textAreaTop = paddingTop + textContainerY;
    const visibleTop = scrollOffset + paddingTop;
    const visibleBottom = scrollOffset + viewportHeight - paddingBottom;
    const visibleMiddle = (visibleTop + visibleBottom) / 2;
    
    let closestIndex = -1;
    let closestDistance = Infinity;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.text.trim().length === 0) continue;
      
      const lineAbsoluteTop = textAreaTop + line.y;
      const lineCenter = lineAbsoluteTop + line.height / 2;
      const distance = Math.abs(lineCenter - visibleMiddle);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }
    
    return closestIndex;
  }, [currentScrollY, viewportHeight, paddingTop, paddingBottom, textContainerY]);

  const findBottomLineInfo = useCallback((): { 
    lineIndex: number; 
    isPartiallyVisible: boolean; 
    visibleRatio: number;
    line: MeasuredLine | null;
  } => {
    const lines = measuredLinesRef.current;
    if (lines.length === 0) return { lineIndex: -1, isPartiallyVisible: false, visibleRatio: 0, line: null };
    
    const scrollOffset = currentScrollY;
    const textAreaTop = paddingTop + textContainerY;
    const visibleTop = scrollOffset + paddingTop;
    const visibleBottom = scrollOffset + viewportHeight - paddingBottom;
    
    let lastFullyVisibleIndex = -1;
    let partiallyVisibleIndex = -1;
    let partialVisibleRatio = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.text.trim().length === 0) continue;
      
      const lineAbsoluteTop = textAreaTop + line.y;
      const lineAbsoluteBottom = lineAbsoluteTop + line.height;
      
      if (lineAbsoluteTop >= visibleTop && lineAbsoluteBottom <= visibleBottom) {
        lastFullyVisibleIndex = i;
      }
      
      if (lineAbsoluteTop < visibleBottom && lineAbsoluteBottom > visibleBottom) {
        partiallyVisibleIndex = i;
        const visiblePart = visibleBottom - lineAbsoluteTop;
        partialVisibleRatio = visiblePart / line.height;
      }
    }
    
    if (partiallyVisibleIndex >= 0 && partialVisibleRatio >= 0.1 && partialVisibleRatio < 0.95) {
      return { 
        lineIndex: partiallyVisibleIndex, 
        isPartiallyVisible: true, 
        visibleRatio: partialVisibleRatio,
        line: lines[partiallyVisibleIndex]
      };
    }
    
    if (lastFullyVisibleIndex >= 0) {
      return { 
        lineIndex: lastFullyVisibleIndex, 
        isPartiallyVisible: false, 
        visibleRatio: 1,
        line: lines[lastFullyVisibleIndex]
      };
    }
    
    return { lineIndex: -1, isPartiallyVisible: false, visibleRatio: 0, line: null };
  }, [currentScrollY, viewportHeight, paddingTop, paddingBottom, textContainerY]);

  const findLastVisibleLineIndex = useCallback((): number => {
    return findBottomLineInfo().lineIndex;
  }, [findBottomLineInfo]);

  const scrollToLineTop = useCallback((lineIndex: number, duration: number, onComplete?: () => void) => {
    const lines = measuredLinesRef.current;
    if (lineIndex < 0 || lineIndex >= lines.length) {
      onComplete?.();
      return;
    }
    
    const line = lines[lineIndex];
    const textAreaTop = paddingTop + textContainerY;
    const lineAbsoluteY = textAreaTop + line.y;
    const targetY = lineAbsoluteY - paddingTop;
    
    const maxScroll = Math.max(0, contentHeight - viewportHeight + paddingTop + paddingBottom);
    const clampedTargetY = Math.max(0, Math.min(targetY, maxScroll));
    
    animateScrollTo(clampedTargetY, duration);
    
    if (onComplete) {
      setTimeout(onComplete, duration + 16);
    }
  }, [paddingTop, textContainerY, contentHeight, viewportHeight, paddingBottom, animateScrollTo]);

  const scrollLineIntoFullView = useCallback((lineIndex: number, duration: number, onComplete?: () => void) => {
    const lines = measuredLinesRef.current;
    if (lineIndex < 0 || lineIndex >= lines.length) {
      onComplete?.();
      return;
    }
    
    const line = lines[lineIndex];
    const textAreaTop = paddingTop + textContainerY;
    const lineAbsoluteBottom = textAreaTop + line.y + line.height;
    const visibleBottom = currentScrollY + viewportHeight - paddingBottom;
    
    const scrollNeeded = lineAbsoluteBottom - visibleBottom + 4;
    
    if (scrollNeeded > 0) {
      const targetY = currentScrollY + scrollNeeded;
      const maxScroll = Math.max(0, contentHeight - viewportHeight + paddingTop + paddingBottom);
      const clampedTargetY = Math.max(0, Math.min(targetY, maxScroll));
      
      animateScrollTo(clampedTargetY, duration);
      
      if (onComplete) {
        setTimeout(onComplete, duration + 16);
      }
    } else {
      onComplete?.();
    }
  }, [paddingTop, textContainerY, currentScrollY, viewportHeight, paddingBottom, contentHeight, animateScrollTo]);

  const highlightLine = useCallback((lineIndex: number) => {
    const lines = measuredLinesRef.current;
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    
    const line = lines[lineIndex];
    
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    
    setHighlightedLineY(line.y);
    setHighlightedLineHeight(line.height);
    
    highlightOpacity.value = withSequence(
      withTiming(1, { duration: 50 }),
      withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) })
    );
    
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedLineY(null);
      highlightTimeoutRef.current = null;
    }, 600);
  }, [highlightOpacity]);

  const updateScrollYFromWorklet = useCallback((y: number) => {
    setCurrentScrollY(y);
    if (contentHeight > 0) {
      const maxScroll = Math.max(1, contentHeight - viewportHeight + paddingTop + paddingBottom);
      const progress = Math.min(1, Math.max(0, y / maxScroll));
      onScrollProgress?.(progress, y, contentHeight);
    }
  }, [contentHeight, viewportHeight, paddingTop, paddingBottom, onScrollProgress]);

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
        easing: Easing.linear 
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
  }, [autoScrollSpeed, currentScrollY, contentHeight, viewportHeight, paddingTop, paddingBottom, onAutoScrollStateChange, autoScrollPosition, autoScrollMaxY, isAutoScrollActive, animatedScrollViewRef]);

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

  const handleCenterTap = useCallback(() => {
  }, []);

  const handleLeftTap = useCallback(() => {
    if (scrollMode === "autoScroll" && isAutoScrollPlaying) {
      stopAutoScroll();
    }
    onTap?.();
  }, [onTap, scrollMode, isAutoScrollPlaying, stopAutoScroll]);

  const scrollToPosition = useCallback((position: number) => {
    if (contentHeight <= 0) return;
    
    const ratio = position / content.length;
    const targetY = ratio * contentHeight;
    
    scrollTo(animatedScrollViewRef, 0, targetY, false);
  }, [contentHeight, content.length, animatedScrollViewRef]);

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
    pauseAutoScroll: stopAutoScroll,
  }), [scrollToPosition, getCurrentPosition, toggleAutoScroll, isAutoScrollPlaying, stopAutoScroll]);

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
    if (scrollMode === "autoScroll" && isReady && contentHeight > 0 && !hasUserStartedReadingRef.current) {
      setShowStartOverlay(true);
    } else if (scrollMode !== "autoScroll") {
      setShowStartOverlay(false);
      hasUserStartedReadingRef.current = false;
    }
  }, [scrollMode, isReady, contentHeight]);

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
      if (tapHintTimeoutRef.current) {
        clearTimeout(tapHintTimeoutRef.current);
      }
    };
  }, [autoScrollPosition]);

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

  const scrollViewProps = scrollMode === "autoScroll" ? {
    scrollEnabled: !isAutoScrollPlaying,
    showsVerticalScrollIndicator: false,
    decelerationRate: "normal" as const,
  } : {
    scrollEnabled: true,
    showsVerticalScrollIndicator: false,
    decelerationRate: "normal" as const,
  };

  const screenWidth = screenDimensions.width;
  const leftZoneWidth = screenWidth * 0.15;
  const centerZoneWidth = screenWidth * 0.52;
  const rightZoneWidth = screenWidth * 0.33;

  const centerTapGesture = useMemo(() => {
    return Gesture.Tap()
      .maxDuration(200)
      .onEnd((event) => {
        const x = event.x;
        if (x < leftZoneWidth) {
          runOnJS(handleLeftTap)();
        }
      });
  }, [handleLeftTap, leftZoneWidth]);

  const isSeamless = scrollMode === "seamless";

  const containerContent = (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]} onLayout={handleViewportLayout}>
      <Animated.ScrollView
        ref={animatedScrollViewRef}
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
        </View>
      </Animated.ScrollView>

      {scrollMode === "autoScroll" && (
        <View style={styles.tapZonesContainer} pointerEvents="box-none">
          <Pressable 
            style={[styles.tapZone, { width: leftZoneWidth }]} 
            onPress={handleLeftTap}
          />
          <View style={[styles.tapZone, { width: centerZoneWidth }]} />
          <View style={[styles.tapZone, { width: rightZoneWidth }]} />
        </View>
      )}

      {showStartOverlay && (
        <View style={styles.startOverlay}>
          <View style={[styles.startOverlayContent, { backgroundColor: theme.backgroundRoot + 'F2' }]}>
            <View style={[styles.startIconContainer, { backgroundColor: theme.highlightColor || 'rgba(99, 102, 241, 0.15)' }]}>
              <Text style={[styles.startIcon, { color: theme.text }]}>▶</Text>
            </View>
            <Text style={[styles.startTitle, { color: theme.text }]}>Ready to read</Text>
            <Text style={[styles.startSubtitle, { color: theme.secondaryText }]}>
              Auto-scroll: {autoScrollSpeed} px/sec
            </Text>
            <Pressable 
              style={({ pressed }) => [
                styles.startButton,
                { 
                  backgroundColor: theme.highlightColor || '#6366F1',
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }]
                }
              ]}
              onPress={handleStartReading}
            >
              <Text style={styles.startButtonText}>Start reading</Text>
            </Pressable>
            <Text style={[styles.startHint, { color: theme.secondaryText }]}>
              Tap screen to pause/resume
            </Text>
          </View>
        </View>
      )}

      {scrollMode === "autoScroll" && isAutoScrollPlaying && (
        <View style={styles.autoScrollIndicator}>
          <View style={[styles.autoScrollBadge, { backgroundColor: theme.backgroundRoot + 'E6' }]}>
            <Feather name="play" size={12} color={theme.text} />
            <Text style={[styles.autoScrollText, { color: theme.text }]}>
              {autoScrollSpeed} px/s
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  if (isSeamless) {
    return (
      <GestureDetector gesture={centerTapGesture}>
        {containerContent}
      </GestureDetector>
    );
  }

  return containerContent;
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
    zIndex: 1,
  },
  tapZonesContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 10,
  },
  tapZone: {
    height: "100%",
  },
  startOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    zIndex: 100,
  },
  startOverlayContent: {
    width: "85%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  startIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  startIcon: {
    fontSize: 28,
    marginLeft: 4,
  },
  startTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  startSubtitle: {
    fontSize: 15,
    marginBottom: 28,
    opacity: 0.8,
  },
  startButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  startHint: {
    fontSize: 13,
    textAlign: "center",
    opacity: 0.7,
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
});
