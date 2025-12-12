import React, { useEffect, useState, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet, Text, Dimensions, LayoutChangeEvent, Pressable } from "react-native";
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
import Slider from "@react-native-community/slider";
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
  upcomingOpacity: number;
  readOpacity: number;
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
    upcomingOpacity,
    readOpacity,
  }: KaraokeLineProps) => {
    const animatedStyle = useAnimatedStyle(() => {
      const currentLine = karaokeAnimatedLine.value;
      const distance = index - currentLine;

      const dynamicLineSpacing = lineHeight * 1.8;
      const yPosition = screenCenter - lineHeight / 2 + distance * dynamicLineSpacing;

      let opacity: number;
      let scale: number;

      if (Math.abs(distance) < 0.1) {
        opacity = 1;
        scale = 1;
      } else if (distance < 0) {
        const fadeDistance = Math.abs(distance);
        opacity = interpolate(fadeDistance, [0, 1, 5], [1, readOpacity, 0.05], Extrapolation.CLAMP);
        scale = interpolate(fadeDistance, [0, 1, 3], [1, 0.92, 0.88], Extrapolation.CLAMP);
      } else {
        opacity = interpolate(distance, [0, 1, 5], [1, upcomingOpacity, 0.1], Extrapolation.CLAMP);
        scale = interpolate(distance, [0, 1, 3], [1, 0.95, 0.9], Extrapolation.CLAMP);
      }

      return {
        top: yPosition,
        opacity,
        transform: [{ scale }],
      };
    }, [index, screenCenter, lineHeight, upcomingOpacity, readOpacity]);

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
    const [availableWidth, setAvailableWidth] = useState(() => getAvailableWidth(32));
    const [isReady, setIsReady] = useState(false);
    const [karaokeCurrentLine, setKaraokeCurrentLine] = useState(0);
    const [karaokeLines, setKaraokeLines] = useState<MeasuredLine[]>([]);
    const [showControls, setShowControls] = useState(false);
    const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
    const karaokeAnimatedLine = useSharedValue(0);
    const generationIdRef = useRef(0);
    const onReadyCalledRef = useRef(false);
    const autoAdvanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    
    const karaokeStateRef = useRef({ currentLine: 0, totalLines: 0, isReady: false });

    const karaokeAutoAdvance = settings.karaokeAutoAdvance ?? false;
    const karaokeAutoAdvanceSpeed = settings.karaokeAutoAdvanceSpeed ?? KaraokeDefaults.defaultAutoAdvanceSpeed;
    const karaokeUpcomingOpacity = settings.karaokeUpcomingOpacity ?? KaraokeDefaults.upcomingOpacity;

    useEffect(() => {
      const subscription = Dimensions.addEventListener("change", ({ window }) => {
        setScreenDimensions(window);
        setAvailableWidth(window.width - 64);
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

    const goToLine = useCallback((lineIndex: number) => {
      const state = karaokeStateRef.current;
      if (!state.isReady || state.totalLines === 0) return;

      const clampedLine = Math.max(0, Math.min(state.totalLines - 1, Math.floor(lineIndex)));
      
      setKaraokeCurrentLine(clampedLine);
      karaokeStateRef.current.currentLine = clampedLine;

      karaokeAnimatedLine.value = withTiming(clampedLine, {
        duration: KaraokeDefaults.animationDuration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      if (state.totalLines > 1) {
        const progress = clampedLine / (state.totalLines - 1);
        onScrollProgress?.(Math.min(1, progress), clampedLine, state.totalLines);
      }
    }, [karaokeAnimatedLine, onScrollProgress]);

    const startAutoAdvance = useCallback(() => {
      if (autoAdvanceTimerRef.current) {
        clearInterval(autoAdvanceTimerRef.current);
      }
      
      const intervalMs = (1 / karaokeAutoAdvanceSpeed) * 1000;
      
      autoAdvanceTimerRef.current = setInterval(() => {
        const state = karaokeStateRef.current;
        if (state.currentLine >= state.totalLines - 1) {
          if (autoAdvanceTimerRef.current) {
            clearInterval(autoAdvanceTimerRef.current);
            autoAdvanceTimerRef.current = null;
          }
          setIsAutoAdvancing(false);
          onAutoScrollStateChange?.(false);
          return;
        }
        handleKaraokeAdvance();
      }, intervalMs);
      
      setIsAutoAdvancing(true);
      onAutoScrollStateChange?.(true);
    }, [karaokeAutoAdvanceSpeed, handleKaraokeAdvance, onAutoScrollStateChange]);

    const stopAutoAdvance = useCallback(() => {
      if (autoAdvanceTimerRef.current) {
        clearInterval(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      setIsAutoAdvancing(false);
      onAutoScrollStateChange?.(false);
    }, [onAutoScrollStateChange]);

    const toggleAutoAdvance = useCallback(() => {
      if (isAutoAdvancing) {
        stopAutoAdvance();
      } else {
        startAutoAdvance();
      }
    }, [isAutoAdvancing, startAutoAdvance, stopAutoAdvance]);

    useEffect(() => {
      if (karaokeAutoAdvance && isReady && !isAutoAdvancing) {
        startAutoAdvance();
      } else if (!karaokeAutoAdvance && isAutoAdvancing) {
        stopAutoAdvance();
      }
    }, [karaokeAutoAdvance, isReady]);

    useEffect(() => {
      return () => {
        if (autoAdvanceTimerRef.current) {
          clearInterval(autoAdvanceTimerRef.current);
        }
      };
    }, []);

    useEffect(() => {
      if (isAutoAdvancing && autoAdvanceTimerRef.current) {
        clearInterval(autoAdvanceTimerRef.current);
        const intervalMs = (1 / karaokeAutoAdvanceSpeed) * 1000;
        autoAdvanceTimerRef.current = setInterval(() => {
          const state = karaokeStateRef.current;
          if (state.currentLine >= state.totalLines - 1) {
            if (autoAdvanceTimerRef.current) {
              clearInterval(autoAdvanceTimerRef.current);
              autoAdvanceTimerRef.current = null;
            }
            setIsAutoAdvancing(false);
            onAutoScrollStateChange?.(false);
            return;
          }
          handleKaraokeAdvance();
        }, intervalMs);
      }
    }, [karaokeAutoAdvanceSpeed]);

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
        toggleAutoScroll: toggleAutoAdvance,
        isAutoScrolling: () => isAutoAdvancing,
        pauseAutoScroll: stopAutoAdvance,
      }),
      [scrollToPosition, getCurrentPosition, toggleAutoAdvance, isAutoAdvancing, stopAutoAdvance]
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
          if (karaokeAutoAdvance) {
            runOnJS(toggleAutoAdvance)();
          } else {
            runOnJS(handleKaraokeAdvance)();
          }
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
              <Text style={[styles.karaokeText, { color: "#FFFFFF" }]}>
                {isAutoAdvancing ? "Auto" : "Karaoke"}
              </Text>
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
                  upcomingOpacity={karaokeUpcomingOpacity}
                  readOpacity={KaraokeDefaults.readOpacity}
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

          {karaokeLines.length > 0 && (
            <View style={styles.progressSliderContainer}>
              <Pressable
                style={[styles.controlButton, { backgroundColor: "rgba(0,0,0,0.5)" }]}
                onPress={handleKaraokeBack}
              >
                <Feather name="chevron-left" size={20} color="#FFFFFF" />
              </Pressable>
              
              <View style={styles.sliderWrapper}>
                <Slider
                  style={styles.progressSlider}
                  minimumValue={0}
                  maximumValue={Math.max(1, karaokeLines.length - 1)}
                  value={karaokeCurrentLine}
                  onValueChange={goToLine}
                  minimumTrackTintColor={theme.accent || "#6366F1"}
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor={theme.accent || "#6366F1"}
                />
                <Text style={styles.progressText}>
                  {karaokeCurrentLine + 1} / {karaokeLines.length}
                </Text>
              </View>

              <Pressable
                style={[styles.controlButton, { backgroundColor: "rgba(0,0,0,0.5)" }]}
                onPress={karaokeAutoAdvance ? toggleAutoAdvance : handleKaraokeAdvance}
              >
                <Feather 
                  name={karaokeAutoAdvance ? (isAutoAdvancing ? "pause" : "play") : "chevron-right"} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </Pressable>
            </View>
          )}

          <View style={styles.karaokeHint}>
            <Text style={[styles.hintText, { color: theme.secondaryText }]}>
              {karaokeAutoAdvance 
                ? (isAutoAdvancing ? "Tap right to pause" : "Tap right to resume")
                : "Tap right to advance, left to go back"}
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
    left: 32,
    right: 32,
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
    bottom: 90,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hintText: {
    fontSize: 12,
    opacity: 0.6,
  },
  progressSliderContainer: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sliderWrapper: {
    flex: 1,
    alignItems: "center",
  },
  progressSlider: {
    width: "100%",
    height: 30,
  },
  progressText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});
