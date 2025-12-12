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
  runOnJS,
  useAnimatedRef,
  scrollTo,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BaseReaderProps, UnifiedScrollReaderRef } from "./types";
import { renderBionicWord, createTextStyle } from "./utils";

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

    const [contentHeight, setContentHeight] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [currentScrollY, setCurrentScrollY] = useState(0);
    const [isReady, setIsReady] = useState(false);

    const onReadyCalledRef = useRef(false);

    const lineHeight = settings.fontSize * settings.lineSpacing;
    const paddingTop = insets.top + 60;
    const paddingBottom = insets.bottom + 60 + progressBarHeight;

    const normalizedContent = useMemo(() => {
      if (!content || content.length === 0) return "";
      return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    }, [content]);

    useEffect(() => {
      if (!content || content.length === 0) {
        setIsReady(false);
        onReadyCalledRef.current = false;
        return;
      }

      setIsReady(true);
      if (!onReadyCalledRef.current) {
        onReadyCalledRef.current = true;
        onReady?.();
      }
    }, [content, onReady]);

    const scrollToPosition = useCallback(
      (position: number) => {
        if (contentHeight <= 0 || content.length === 0) return;

        const ratio = position / content.length;
        const maxScroll = Math.max(contentHeight - viewportHeight, 0);
        const targetY = ratio * maxScroll;

        scrollTo(animatedScrollViewRef, 0, targetY, false);
      },
      [contentHeight, content.length, viewportHeight, animatedScrollViewRef]
    );

    const getCurrentPosition = useCallback((): number => {
      if (contentHeight <= 0 || content.length === 0) return 0;
      const maxScroll = Math.max(contentHeight - viewportHeight, 1);
      const ratio = Math.min(1, Math.max(0, currentScrollY / maxScroll));
      return Math.floor(ratio * content.length);
    }, [currentScrollY, contentHeight, content.length, viewportHeight]);

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
    }, []);

    const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
      setViewportHeight(event.nativeEvent.layout.height);
    }, []);

    useEffect(() => {
      if (initialPosition > 0 && contentHeight > 0 && viewportHeight > 0 && isReady) {
        const ratio = initialPosition / content.length;
        const maxScroll = Math.max(contentHeight - viewportHeight, 0);
        const targetY = ratio * maxScroll;
        setTimeout(() => {
          scrollTo(animatedScrollViewRef, 0, targetY, false);
        }, 150);
      }
    }, [initialPosition, contentHeight, viewportHeight, content.length, isReady, animatedScrollViewRef]);

    const textStyle = useMemo(
      () => createTextStyle(settings, lineHeight, theme.text),
      [settings, lineHeight, theme.text]
    );

    const tapGesture = Gesture.Tap()
      .onEnd(() => {
        if (onTap) {
          runOnJS(onTap)();
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

      if (settings.bionicReading) {
        const words = normalizedContent.split(/(\s+)/);
        return (
          <Text style={[styles.contentText, textStyle]}>
            {words.map((word, i) => renderBionicWord(word, i))}
          </Text>
        );
      }

      return (
        <Text style={[styles.contentText, textStyle]}>
          {normalizedContent}
        </Text>
      );
    };

    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]} onLayout={handleViewportLayout}>
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
  contentText: {
    flexWrap: "wrap",
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
});
