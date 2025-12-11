import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle, DimensionValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius } from "@/constants/theme";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = BorderRadius.sm,
  style,
}: SkeletonProps) {
  const { theme } = useTheme();
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withTiming(1, {
        duration: 1200,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      shimmerProgress.value,
      [0, 0.5, 1],
      [0.3, 0.6, 0.3]
    );
    return {
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.backgroundTertiary,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: DimensionValue;
  spacing?: number;
  style?: ViewStyle;
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = "60%",
  spacing = 12,
  style,
}: SkeletonTextProps) {
  return (
    <View style={[styles.textContainer, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : "100%"}
          height={16}
          style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
        />
      ))}
    </View>
  );
}

interface SkeletonBookCardProps {
  style?: ViewStyle;
}

export function SkeletonBookCard({ style }: SkeletonBookCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.bookCard,
        { backgroundColor: theme.backgroundDefault },
        style,
      ]}
    >
      <Skeleton
        width="100%"
        height={180}
        borderRadius={BorderRadius.md}
        style={styles.bookCover}
      />
      <Skeleton width="80%" height={18} style={styles.bookTitle} />
      <Skeleton width="50%" height={14} />
    </View>
  );
}

interface SkeletonReaderProps {
  style?: ViewStyle;
}

export function SkeletonReader({ style }: SkeletonReaderProps) {
  return (
    <View style={[styles.readerContainer, style]}>
      <SkeletonText lines={8} spacing={16} style={styles.readerText} />
      <View style={styles.readerGap} />
      <SkeletonText lines={6} spacing={16} lastLineWidth="40%" />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
  textContainer: {
    width: "100%",
  },
  bookCard: {
    width: 140,
    borderRadius: BorderRadius.lg,
    padding: 12,
  },
  bookCover: {
    marginBottom: 12,
  },
  bookTitle: {
    marginBottom: 8,
  },
  readerContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  readerText: {
    marginBottom: 24,
  },
  readerGap: {
    height: 20,
  },
});
