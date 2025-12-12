import React, { useEffect, useState, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet, Text, Dimensions, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import { KaraokeDefaults } from "@/constants/theme";
import type { KaraokeReaderProps, MeasuredLine, UnifiedScrollReaderRef } from "./types";
import { getFontFamily, renderBionicWord, generateLinesFromContentAsync, createTextStyle, calculateCharsPerLine, getAvailableWidth } from "./utils";

const getScreenDimensions = () => Dimensions.get("window");

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
}

const KaraokeLine = React.memo(
  ({
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
  }: KaraokeLineProps) => {
    const animatedStyle = useAnimatedStyle(() => {
      const currentLine = karaokeAnimatedLine.value;
      const distance = index - currentLine;

      const yPosition = screenCenter - lineHeight / 2 + distance * lineHeight * 1.3;

      let opacity: number;
      let scale: number;

      if (Math.abs(distance) < 0.1) {
        opacity = 1;
        scale = 1;
      } else if (distance < 0) {
        const fadeDistance = Math.abs(distance);
        opacity = interpolate(fadeDistance, [0, 1, 5], [1, KaraokeDefaults.readOpacity, 0.05], Extrapolation.CLAMP);
        scale = interpolate(fadeDistance, [0, 1, 3], [1, 0.92, 0.88], Extrapolation.CLAMP);
      } else {
        opacity = interpolate(distance, [0, 1, 5], [1, KaraokeDefaults.upcomingOpacity, 0.1], Extrapolation.CLAMP);
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
              fontWeight: isCurrent ? "700" : "400",
              fontSize,
              textAlign: "center",
              color: theme.text,
            },
          ]}
        >
          {bionicReading
            ? line.text.split(/(\s+)/).map((part, i) => renderBionicWord(part, i))
            : line.text.trim()}
        </Text>
      </Animated.View>
    );
  }
);

export const KaraokeReader = forwardRef<UnifiedScrollReaderRef, KaraokeReaderProps>(
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
    const [screenDimensions, setScreenDimensions] = useState(() => getScreenDimensions());
    const [viewportHeight, setViewportHeight] = useState(screenDimensions.height);
    const [availableWidth, setAvailableWidth] = useState(() => getAvailableWidth(24));
    const [isReady, setIsReady] = useState(false);
    const [karaokeCurrentLine, setKaraokeCurrentLine] = useState(0);
    const [karaokeLines, setKaraokeLines] = useState<MeasuredLine[]>([]);
    const karaokeAnimatedLine = useSharedValue(0);
    const generationIdRef = useRef(0);
    const onReadyCalledRef = useRef(false);
    
    const karaokeStateRef = useRef({ currentLine: 0, totalLines: 0, isReady: false });

    useEffect(() => {
      const subscription = Dimensions.addEventListener("change", ({ window }) => {
        setScreenDimensions(window);
        setAvailableWidth(window.width - 48);
      });
      return () => subscription?.remove();
    }, []);

    useEffect(() => {
      karaokeStateRef.current = {
        currentLine: karaokeCurrentLine,
        totalLines: karaokeLines.length,
        isReady,
      };
    }, [karaokeCurrentLine, karaokeLines.length, isReady]);

    const lineHeight = settings.fontSize * settings.lineSpacing;
    const screenCenter = viewportHeight / 2;
    
    const charsPerLine = useMemo(() => {
      return calculateCharsPerLine(availableWidth, settings.fontSize, settings.letterSpacing);
    }, [availableWidth, settings.fontSize, settings.letterSpacing]);

    useEffect(() => {
      if (!content || content.length === 0) {
        setKaraokeLines([]);
        setIsReady(false);
        onReadyCalledRef.current = false;
        karaokeStateRef.current = { currentLine: 0, totalLines: 0, isReady: false };
        return;
      }

      const currentGenerationId = ++generationIdRef.current;
      onReadyCalledRef.current = false;
      setIsReady(false);

      generateLinesFromContentAsync(
        content,
        lineHeight,
        charsPerLine,
        (firstChunkLines) => {
          if (currentGenerationId !== generationIdRef.current) return;
          setKaraokeLines(firstChunkLines);
          setKaraokeCurrentLine(0);
          karaokeAnimatedLine.value = 0;
          setIsReady(true);
          karaokeStateRef.current = { currentLine: 0, totalLines: firstChunkLines.length, isReady: true };
          if (!onReadyCalledRef.current) {
            onReadyCalledRef.current = true;
            onReady?.();
          }
        },
        30
      ).then((allLines) => {
        if (currentGenerationId !== generationIdRef.current) return;
        setKaraokeLines(allLines);
        karaokeStateRef.current.totalLines = allLines.length;
        if (!onReadyCalledRef.current && allLines.length > 0) {
          onReadyCalledRef.current = true;
          setIsReady(true);
          karaokeStateRef.current.isReady = true;
          onReady?.();
        }
      });

      return () => {
        generationIdRef.current++;
      };
    }, [content, lineHeight, charsPerLine, onReady]);

    const handleKaraokeAdvance = useCallback(() => {
      const state = karaokeStateRef.current;
      
      if (!state.isReady || state.totalLines === 0) {
        return;
      }

      if (state.currentLine >= state.totalLines - 1) {
        return;
      }

      const nextLine = state.currentLine + 1;
      setKaraokeCurrentLine(nextLine);
      karaokeStateRef.current.currentLine = nextLine;

      karaokeAnimatedLine.value = withTiming(nextLine, {
        duration: KaraokeDefaults.animationDuration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      if (state.totalLines > 1) {
        const progress = nextLine / (state.totalLines - 1);
        onScrollProgress?.(Math.min(1, progress), nextLine, state.totalLines);
      }
    }, [karaokeAnimatedLine, onScrollProgress]);

    const handleKaraokeBack = useCallback(() => {
      const state = karaokeStateRef.current;
      
      if (!state.isReady || state.currentLine <= 0) return;

      const prevLine = state.currentLine - 1;
      setKaraokeCurrentLine(prevLine);
      karaokeStateRef.current.currentLine = prevLine;

      karaokeAnimatedLine.value = withTiming(prevLine, {
        duration: KaraokeDefaults.animationDuration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      if (state.totalLines > 1) {
        const progress = prevLine / (state.totalLines - 1);
        onScrollProgress?.(Math.min(1, progress), prevLine, state.totalLines);
      }
    }, [karaokeAnimatedLine, onScrollProgress]);

    const scrollToPosition = useCallback(
      (position: number) => {
        if (karaokeLines.length === 0) return;

        const targetLine = Math.floor((position / content.length) * karaokeLines.length);
        const clampedLine = Math.max(0, Math.min(karaokeLines.length - 1, targetLine));

        setKaraokeCurrentLine(clampedLine);
        karaokeAnimatedLine.value = withTiming(clampedLine, {
          duration: KaraokeDefaults.animationDuration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      },
      [content.length, karaokeLines, karaokeAnimatedLine]
    );

    const getCurrentPosition = useCallback((): number => {
      return karaokeCurrentLine;
    }, [karaokeCurrentLine]);

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

    const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
      setViewportHeight(event.nativeEvent.layout.height);
    }, []);

    const textStyle = useMemo(
      () => createTextStyle(settings, lineHeight, theme.text),
      [settings, lineHeight, theme.text]
    );

    const tapGesture = Gesture.Tap()
      .onEnd((event) => {
        const screenWidth = screenDimensions.width;
        const tapX = event.x;

        if (tapX < screenWidth * 0.25) {
          if (onTap) {
            runOnJS(onTap)();
          }
        } else if (tapX < screenWidth * 0.5) {
          runOnJS(handleKaraokeBack)();
        } else {
          runOnJS(handleKaraokeAdvance)();
        }
      })
      .runOnJS(true);

    const VIRTUALIZATION_WINDOW = 15;
    
    const visibleLines = useMemo(() => {
      if (karaokeLines.length === 0) return [];
      
      const startIndex = Math.max(0, karaokeCurrentLine - VIRTUALIZATION_WINDOW);
      const endIndex = Math.min(karaokeLines.length, karaokeCurrentLine + VIRTUALIZATION_WINDOW + 1);
      
      return karaokeLines.slice(startIndex, endIndex).map((line, i) => ({
        line,
        originalIndex: startIndex + i,
      }));
    }, [karaokeLines, karaokeCurrentLine]);

    return (
      <GestureDetector gesture={tapGesture}>
        <View
          style={[styles.karaokeFullScreen, { backgroundColor: theme.backgroundRoot }]}
          onLayout={handleViewportLayout}
        >
          <View style={styles.karaokeIndicator}>
            <View style={[styles.karaokeBadge, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
              <Feather name="align-center" size={10} color="#FFFFFF" />
              <Text style={[styles.karaokeText, { color: "#FFFFFF" }]}>Karaoke</Text>
            </View>
          </View>

          <View style={styles.karaokeContent}>
            {visibleLines.length > 0 ? (
              visibleLines.map(({ line, originalIndex }) => (
                <KaraokeLine
                  key={originalIndex}
                  line={line}
                  index={originalIndex}
                  karaokeAnimatedLine={karaokeAnimatedLine}
                  currentLineIndex={karaokeCurrentLine}
                  screenCenter={screenCenter}
                  lineHeight={lineHeight}
                  theme={theme}
                  textStyle={textStyle}
                  fontSize={settings.fontSize}
                  bionicReading={settings.bionicReading}
                />
              ))
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
                  {content && content.length > 0 ? "Preparing text..." : "No text content available"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.karaokeHint}>
            <Text style={[styles.hintText, { color: theme.secondaryText }]}>
              Tap right to advance, left to go back
            </Text>
          </View>
        </View>
      </GestureDetector>
    );
  }
);

const styles = StyleSheet.create({
  karaokeFullScreen: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  karaokeContent: {
    flex: 1,
    position: "relative",
  },
  content: {
    flexWrap: "wrap",
  },
  karaokeLineAbsolute: {
    position: "absolute",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  karaokeHint: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hintText: {
    fontSize: 12,
    opacity: 0.6,
  },
});
