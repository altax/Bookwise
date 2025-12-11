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
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface SmartScrollReaderProps {
  content: string;
  onScrollProgress?: (progress: number, currentPosition: number, totalHeight: number) => void;
  onError?: (error: string) => void;
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

export interface SmartScrollReaderRef {
  handleTapToScroll: () => void;
  scrollToPosition: (position: number) => void;
  getCurrentPosition: () => number;
}

interface WordLayout {
  word: string;
  index: number;
  startChar: number;
  endChar: number;
  yPosition: number;
  height: number;
}

export const SmartScrollReader = forwardRef<SmartScrollReaderRef, SmartScrollReaderProps>(({
  content,
  onScrollProgress,
  theme,
  settings,
  initialPosition = 0,
}, ref) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(SCREEN_HEIGHT);
  const [currentScrollY, setCurrentScrollY] = useState(0);
  const [highlightedRange, setHighlightedRange] = useState<{ start: number; end: number } | null>(null);
  const [wordLayouts, setWordLayouts] = useState<WordLayout[]>([]);
  
  const highlightOpacity = useSharedValue(0);

  const lineHeight = settings.fontSize * settings.lineSpacing;
  const contentWidth = Dimensions.get("window").width - settings.marginHorizontal * 2;
  const avgCharWidth = settings.fontSize * 0.55;

  const words = useMemo(() => {
    const result: { word: string; index: number; startChar: number; endChar: number }[] = [];
    const regex = /\S+/g;
    let match;
    let index = 0;
    
    while ((match = regex.exec(content)) !== null) {
      result.push({
        word: match[0],
        index,
        startChar: match.index,
        endChar: match.index + match[0].length,
      });
      index++;
    }
    
    return result;
  }, [content]);

  useEffect(() => {
    if (words.length === 0 || contentHeight === 0) return;
    
    const layouts: WordLayout[] = [];
    let currentX = 0;
    let currentY = 0;
    
    for (const word of words) {
      const wordWidth = word.word.length * avgCharWidth;
      const spaceWidth = avgCharWidth;
      
      if (currentX + wordWidth > contentWidth && currentX > 0) {
        currentX = 0;
        currentY += lineHeight;
      }
      
      layouts.push({
        ...word,
        yPosition: currentY,
        height: lineHeight,
      });
      
      currentX += wordWidth + spaceWidth;
    }
    
    setWordLayouts(layouts);
  }, [words, contentHeight, avgCharWidth, contentWidth, lineHeight]);

  const findLastVisibleWord = useCallback((): WordLayout | null => {
    if (wordLayouts.length === 0) return null;
    
    const viewportBottom = currentScrollY + viewportHeight - insets.bottom - 120;
    const paddingTop = insets.top + 60;
    const adjustedBottom = viewportBottom - paddingTop;
    
    let lastVisibleWord: WordLayout | null = null;
    
    for (let i = wordLayouts.length - 1; i >= 0; i--) {
      const word = wordLayouts[i];
      if (word.yPosition + word.height <= adjustedBottom) {
        lastVisibleWord = word;
        break;
      }
    }
    
    return lastVisibleWord;
  }, [wordLayouts, currentScrollY, viewportHeight, insets]);

  const scrollToWord = useCallback((word: WordLayout, highlight: boolean = true) => {
    const paddingTop = insets.top + 60;
    const targetY = word.yPosition + paddingTop - 20;
    
    scrollViewRef.current?.scrollTo({
      y: Math.max(0, targetY),
      animated: true,
    });
    
    if (highlight) {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
      
      setHighlightedRange({ start: word.startChar, end: word.endChar });
      highlightOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: 700 }),
        withTiming(0, { duration: 350 })
      );
      
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedRange(null);
        highlightTimeoutRef.current = null;
      }, 1200);
    }
  }, [insets.top, highlightOpacity]);

  const handleTapToScroll = useCallback(() => {
    const lastWord = findLastVisibleWord();
    
    if (lastWord && lastWord.index < words.length - 1) {
      scrollToWord(lastWord, true);
    }
  }, [findLastVisibleWord, scrollToWord, words.length]);

  const scrollToPosition = useCallback((position: number) => {
    if (wordLayouts.length === 0) return;
    
    for (const word of wordLayouts) {
      if (word.startChar >= position) {
        scrollToWord(word, false);
        return;
      }
    }
  }, [wordLayouts, scrollToWord]);

  const getCurrentPosition = useCallback((): number => {
    if (contentHeight <= 0 || content.length === 0) return 0;
    const ratio = currentScrollY / contentHeight;
    return Math.floor(ratio * content.length);
  }, [currentScrollY, contentHeight, content.length]);

  useImperativeHandle(ref, () => ({
    handleTapToScroll,
    scrollToPosition,
    getCurrentPosition,
  }), [handleTapToScroll, scrollToPosition, getCurrentPosition]);

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
  }, []);

  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height);
  }, []);

  useEffect(() => {
    if (initialPosition > 0 && contentHeight > 0) {
      const ratio = initialPosition / content.length;
      const targetY = ratio * contentHeight;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: targetY, animated: false });
      }, 100);
    }
  }, [initialPosition, contentHeight, content.length]);

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

  const textStyle = {
    fontSize: settings.fontSize,
    lineHeight: lineHeight,
    fontFamily: getFontFamily(),
    color: theme.text,
    letterSpacing: settings.letterSpacing,
    textAlign: settings.textAlignment as "left" | "justify",
  };

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

  const renderContent = () => {
    const highlightColor = theme.highlightColor || 'rgba(255, 215, 0, 0.5)';
    
    if (!highlightedRange) {
      if (settings.bionicReading) {
        const parts = content.split(/(\s+)/);
        return (
          <Text style={[styles.content, textStyle]}>
            {parts.map((part, i) => renderBionicWord(part, i))}
          </Text>
        );
      }
      return <Text style={[styles.content, textStyle]}>{content}</Text>;
    }

    const before = content.substring(0, highlightedRange.start);
    const highlighted = content.substring(highlightedRange.start, highlightedRange.end);
    const after = content.substring(highlightedRange.end);

    if (settings.bionicReading) {
      const beforeParts = before.split(/(\s+)/);
      const afterParts = after.split(/(\s+)/);
      
      return (
        <Text style={[styles.content, textStyle]}>
          {beforeParts.map((part, i) => renderBionicWord(part, `b${i}`))}
          <Animated.Text style={[{ backgroundColor: highlightColor, borderRadius: 4 }, highlightAnimatedStyle]}>
            {renderBionicWord(highlighted, 'h')}
          </Animated.Text>
          {afterParts.map((part, i) => renderBionicWord(part, `a${i}`))}
        </Text>
      );
    }

    return (
      <Text style={[styles.content, textStyle]}>
        {before}
        <Animated.Text style={[{ backgroundColor: highlightColor, borderRadius: 4 }, highlightAnimatedStyle]}>
          {highlighted}
        </Animated.Text>
        {after}
      </Text>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]} onLayout={handleViewportLayout}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingHorizontal: settings.marginHorizontal,
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
      >
        <View onLayout={handleContentLayout}>
          {renderContent()}
        </View>
      </ScrollView>
    </View>
  );
});

SmartScrollReader.displayName = "SmartScrollReader";

export default SmartScrollReader;

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
    textAlign: "left",
  },
});
