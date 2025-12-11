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
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ScrollMode } from "@/constants/theme";

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
  };
  initialPosition?: number;
}

export interface UnifiedScrollReaderRef {
  scrollToPosition: (position: number) => void;
  getCurrentPosition: () => number;
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
}, ref) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingRef = useRef(false);
  const lastTapTimeRef = useRef(0);
  const measuredLinesRef = useRef<MeasuredLine[]>([]);
  
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(SCREEN_HEIGHT);
  const [currentScrollY, setCurrentScrollY] = useState(0);
  const [highlightedLineY, setHighlightedLineY] = useState<number | null>(null);
  const [highlightedLineHeight, setHighlightedLineHeight] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [textContainerY, setTextContainerY] = useState(0);
  
  const highlightOpacity = useSharedValue(0);

  const lineHeight = settings.fontSize * settings.lineSpacing;
  const verticalPadding = 24;
  const paddingTop = insets.top + 60 + verticalPadding;
  const paddingBottom = insets.bottom + 120 + verticalPadding;

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
    
    const contentVisibleTop = currentScrollY - paddingTop - textContainerY;
    const contentVisibleBottom = currentScrollY + viewportHeight - paddingTop - textContainerY - verticalPadding;
    
    let lastFullyVisibleIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineTop = line.y;
      const lineBottom = line.y + line.height;
      
      if (lineTop >= contentVisibleTop && lineBottom <= contentVisibleBottom && line.text.trim().length > 0) {
        lastFullyVisibleIndex = i;
      }
    }
    
    return lastFullyVisibleIndex;
  }, [currentScrollY, viewportHeight, paddingTop, textContainerY]);

  const scrollToLineIndex = useCallback((lineIndex: number, highlight: boolean = true) => {
    const lines = measuredLinesRef.current;
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    
    const line = lines[lineIndex];
    const targetY = line.y + textContainerY + paddingTop - verticalPadding;
    
    isScrollingRef.current = true;
    
    scrollViewRef.current?.scrollTo({
      y: Math.max(0, targetY),
      animated: true,
    });
    
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 400);
    
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
  }, [paddingTop, textContainerY, highlightOpacity]);

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

  const handleScreenTap = useCallback(() => {
    if (scrollMode === "tapScroll") {
      handleTapScroll();
    } else {
      onTap?.();
    }
  }, [scrollMode, handleTapScroll, onTap]);

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
  }), [scrollToPosition, getCurrentPosition]);

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
    };
  }, []);

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

  const scrollViewProps = scrollMode === "tapScroll" ? {
    scrollEnabled: false,
    showsVerticalScrollIndicator: false,
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
