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
  runOnJS,
  useAnimatedReaction,
  Easing,
  useAnimatedRef,
  scrollTo,
  cancelAnimation,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import type { ScrollMode } from "@/constants/theme";
import { KaraokeDefaults } from "@/constants/theme";

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

interface KaraokeLineProps {
  line: MeasuredLine;
  index: number;
  karaokeAnimatedLine: { value: number };
  currentLineIndex: number;
  screenCenter: number;
  lineHeight: number;
  theme: { text: string };
  textStyle: object;
  fontSize: number;
  bionicReading: boolean;
  renderBionicWord: (word: string, key: string | number) => React.ReactNode;
}

const KaraokeLine = React.memo(({
  line,
  index,
  karaokeAnimatedLine,
  currentLineIndex,
  screenCenter,
  lineHeight,
  theme,
  textStyle,
  fontSize,
  bionicReading,
  renderBionicWord,
}: KaraokeLineProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const currentLine = karaokeAnimatedLine.value;
    const distance = index - currentLine;
    
    const yPosition = screenCenter - lineHeight / 2 + (distance * lineHeight * 1.3);
    
    let opacity: number;
    let scale: number;
    
    if (Math.abs(distance) < 0.1) {
      opacity = 1;
      scale = 1;
    } else if (distance < 0) {
      const fadeDistance = Math.abs(distance);
      opacity = interpolate(
        fadeDistance,
        [0, 1, 5],
        [1, KaraokeDefaults.readOpacity, 0.05],
        Extrapolation.CLAMP
      );
      scale = interpolate(fadeDistance, [0, 1, 3], [1, 0.92, 0.88], Extrapolation.CLAMP);
    } else {
      opacity = interpolate(
        distance,
        [0, 1, 5],
        [1, KaraokeDefaults.upcomingOpacity, 0.1],
        Extrapolation.CLAMP
      );
      scale = interpolate(distance, [0, 1, 3], [1, 0.95, 0.9], Extrapolation.CLAMP);
    }
    
    return {
      top: yPosition,
      opacity,
      transform: [{ scale }],
    };
  }, [index, screenCenter, lineHeight]);

  const isCurrent = index === currentLineIndex;

  return (
    <Animated.View style={[styles.karaokeLineAbsolute, animatedStyle]}>
      <Text
        style={[
          styles.content,
          textStyle,
          {
            fontWeight: isCurrent ? '700' : '400',
            fontSize,
            textAlign: 'center',
            color: theme.text,
          },
        ]}
        numberOfLines={1}
      >
        {bionicReading 
          ? line.text.split(/(\s+)/).map((part, i) => renderBionicWord(part, i))
          : line.text.trim()}
      </Text>
    </Animated.View>
  );
});

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
}, ref) => {
  const insets = useSafeAreaInsets();
  const animatedScrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  
  const [karaokeCurrentLine, setKaraokeCurrentLine] = useState(0);
  const [nonEmptyLines, setNonEmptyLines] = useState<MeasuredLine[]>([]);
  const nonEmptyLinesRef = useRef<MeasuredLine[]>([]);
  const karaokeAnimatedLine = useSharedValue(0);
  
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

  const generateFallbackLines = useCallback(() => {
    if (!content || content.trim().length === 0) return;
    
    const paragraphs = content.split(/\n+/);
    const lines: MeasuredLine[] = [];
    const avgCharsPerLine = 50;
    
    paragraphs.forEach((paragraph, pIndex) => {
      if (paragraph.trim().length === 0) return;
      
      const words = paragraph.trim().split(/\s+/);
      let currentLine = '';
      
      words.forEach((word) => {
        if ((currentLine + ' ' + word).length > avgCharsPerLine && currentLine.length > 0) {
          lines.push({
            text: currentLine.trim(),
            x: 0,
            y: lines.length * lineHeight,
            width: 300,
            height: lineHeight,
            ascender: 0,
            descender: 0,
            capHeight: 0,
            xHeight: 0,
          });
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        }
      });
      
      if (currentLine.trim().length > 0) {
        lines.push({
          text: currentLine.trim(),
          x: 0,
          y: lines.length * lineHeight,
          width: 300,
          height: lineHeight,
          ascender: 0,
          descender: 0,
          capHeight: 0,
          xHeight: 0,
        });
      }
    });
    
    if (lines.length > 0) {
      measuredLinesRef.current = lines;
      nonEmptyLinesRef.current = lines;
      setNonEmptyLines(lines);
      setIsReady(true);
    }
  }, [content, lineHeight]);

  const handleTextLayout = useCallback((event: NativeSyntheticEvent<TextLayoutEventData>) => {
    const { lines } = event.nativeEvent;
    if (lines && lines.length > 0) {
      const allLines = lines.map(line => ({
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
      const filtered = allLines.filter(line => line.text.trim().length > 0);
      nonEmptyLinesRef.current = filtered;
      setNonEmptyLines(filtered);
      setIsReady(true);
    } else if (scrollMode === "karaoke" && !isReady) {
      generateFallbackLines();
    }
  }, [scrollMode, isReady, generateFallbackLines]);

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
  }, [autoScrollSpeed, currentScrollY, contentHeight, viewportHeight, paddingTop, paddingBottom, onAutoScrollStateChange, autoScrollPosition, autoScrollMaxY, isAutoScrollActive]);

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
    if (scrollMode === "karaoke") {
      return karaokeCurrentLine;
    }
    if (contentHeight <= 0 || content.length === 0) return 0;
    const maxScroll = Math.max(contentHeight - viewportHeight + paddingTop + paddingBottom, 1);
    const ratio = currentScrollY / maxScroll;
    return Math.floor(Math.min(1, Math.max(0, ratio)) * content.length);
  }, [scrollMode, karaokeCurrentLine, currentScrollY, contentHeight, content.length, viewportHeight, paddingTop, paddingBottom]);

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

  useEffect(() => {
    if (scrollMode === "karaoke" && isReady) {
      setKaraokeCurrentLine(0);
      karaokeAnimatedLine.value = 0;
    }
  }, [scrollMode, isReady]);

  useEffect(() => {
    if (scrollMode === "karaoke" && content && content.length > 0) {
      console.log('[Karaoke] Generating lines, content length:', content.length, 'nonEmptyLines:', nonEmptyLines.length);
      
      if (nonEmptyLines.length === 0) {
        const paragraphs = content.split(/\n+/);
        const lines: MeasuredLine[] = [];
        const avgCharsPerLine = 50;
        const currentLineHeight = settings.fontSize * settings.lineSpacing;
        
        paragraphs.forEach((paragraph) => {
          if (paragraph.trim().length === 0) return;
          
          const words = paragraph.trim().split(/\s+/);
          let currentLine = '';
          
          words.forEach((word) => {
            if ((currentLine + ' ' + word).length > avgCharsPerLine && currentLine.length > 0) {
              lines.push({
                text: currentLine.trim(),
                x: 0,
                y: lines.length * currentLineHeight,
                width: 300,
                height: currentLineHeight,
                ascender: 0,
                descender: 0,
                capHeight: 0,
                xHeight: 0,
              });
              currentLine = word;
            } else {
              currentLine = currentLine ? currentLine + ' ' + word : word;
            }
          });
          
          if (currentLine.trim().length > 0) {
            lines.push({
              text: currentLine.trim(),
              x: 0,
              y: lines.length * currentLineHeight,
              width: 300,
              height: currentLineHeight,
              ascender: 0,
              descender: 0,
              capHeight: 0,
              xHeight: 0,
            });
          }
        });
        
        console.log('[Karaoke] Generated lines:', lines.length);
        
        if (lines.length > 0) {
          measuredLinesRef.current = lines;
          nonEmptyLinesRef.current = lines;
          setNonEmptyLines(lines);
          setIsReady(true);
        }
      }
    }
  }, [scrollMode, content, settings.fontSize, settings.lineSpacing, nonEmptyLines.length]);

  const handleKaraokeAdvance = useCallback(() => {
    if (nonEmptyLines.length === 0) return;
    
    if (karaokeCurrentLine >= nonEmptyLines.length - 1) {
      return;
    }

    const nextLine = karaokeCurrentLine + 1;
    setKaraokeCurrentLine(nextLine);
    
    karaokeAnimatedLine.value = withTiming(nextLine, {
      duration: KaraokeDefaults.animationDuration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    if (nonEmptyLines.length > 0) {
      const progress = nextLine / (nonEmptyLines.length - 1);
      onScrollProgress?.(Math.min(1, progress), nextLine, nonEmptyLines.length);
    }
  }, [karaokeCurrentLine, nonEmptyLines, karaokeAnimatedLine, onScrollProgress]);

  const handleKaraokeBack = useCallback(() => {
    if (karaokeCurrentLine <= 0) return;
    
    const prevLine = karaokeCurrentLine - 1;
    setKaraokeCurrentLine(prevLine);
    
    karaokeAnimatedLine.value = withTiming(prevLine, {
      duration: KaraokeDefaults.animationDuration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    if (nonEmptyLines.length > 0) {
      const progress = prevLine / (nonEmptyLines.length - 1);
      onScrollProgress?.(Math.min(1, progress), prevLine, nonEmptyLines.length);
    }
  }, [karaokeCurrentLine, nonEmptyLines, karaokeAnimatedLine, onScrollProgress]);

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

  const renderBionicWord = useCallback((word: string, key: string | number) => {
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
  }, []);

  const highlightColor = theme.highlightColor || 'rgba(255, 215, 0, 0.45)';

  const isKaraoke = scrollMode === "karaoke";
  const screenCenter = viewportHeight / 2;

  const renderKaraokeView = () => {
    return (
      <View style={[styles.karaokeFullScreen, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.measurementContainer}>
          <Text 
            style={[
              styles.content, 
              textStyle, 
              { 
                opacity: 0,
                paddingHorizontal: 24,
              }
            ]} 
            onTextLayout={handleTextLayout}
          >
            {content}
          </Text>
        </View>
        
        <View style={styles.karaokeContent}>
          {nonEmptyLines.length > 0 && nonEmptyLines.map((line, index) => (
            <KaraokeLine
              key={index}
              line={line}
              index={index}
              karaokeAnimatedLine={karaokeAnimatedLine}
              currentLineIndex={karaokeCurrentLine}
              screenCenter={screenCenter}
              lineHeight={lineHeight}
              theme={theme}
              textStyle={textStyle}
              fontSize={settings.fontSize}
              bionicReading={settings.bionicReading}
              renderBionicWord={renderBionicWord}
            />
          ))}
        </View>
        
        {nonEmptyLines.length === 0 && (
          <View style={[styles.karaokeLine, { top: screenCenter - lineHeight / 2 }]}>
            <Text style={[styles.content, textStyle, { textAlign: 'center', opacity: 0.5 }]}>
              {!content || content.length === 0 ? 'No content' : 'Loading...'}
            </Text>
          </View>
        )}
      </View>
    );
  };

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

  if (isKaraoke) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]} onLayout={handleViewportLayout}>
        {renderKaraokeView()}
        
        <View style={styles.tapZonesContainer} pointerEvents="box-none">
          <Pressable 
            style={[styles.tapZone, { width: screenWidth * 0.25 }]} 
            onPress={handleKaraokeBack}
          />
          <Pressable 
            style={[styles.tapZone, { width: screenWidth * 0.75 }]} 
            onPress={handleKaraokeAdvance}
          />
        </View>

        <View style={styles.karaokeIndicator}>
          <View style={[styles.karaokeBadge, { backgroundColor: theme.backgroundRoot + 'E6' }]}>
            <Feather name="mic" size={12} color={theme.text} />
            <Text style={[styles.karaokeText, { color: theme.text }]}>
              {karaokeCurrentLine + 1}/{nonEmptyLines.length || '?'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

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
  karaokeFullScreen: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  measurementContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
    pointerEvents: 'none',
  },
  karaokeContent: {
    flex: 1,
    position: 'relative',
  },
  karaokeLine: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  karaokeLineAbsolute: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 0,
  },
  karaokeIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 50,
  },
  karaokeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  karaokeText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
