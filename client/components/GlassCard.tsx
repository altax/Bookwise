import React from "react";
import { View, StyleSheet, ViewStyle, Platform } from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Shadows } from "@/constants/theme";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: "light" | "medium" | "strong";
  animatedOpacity?: SharedValue<number>;
  noPadding?: boolean;
}

export function GlassCard({
  children,
  style,
  intensity = "medium",
  animatedOpacity,
  noPadding = false,
}: GlassCardProps) {
  const { theme, isDark } = useTheme();

  const blurIntensity = {
    light: 40,
    medium: 60,
    strong: 80,
  }[intensity];

  const backgroundColor = {
    light: theme.glass,
    medium: theme.glass,
    strong: theme.glassStrong,
  }[intensity];

  const animatedStyle = useAnimatedStyle(() => {
    if (!animatedOpacity) return {};
    return {
      opacity: animatedOpacity.value,
      transform: [
        {
          translateY: interpolate(
            animatedOpacity.value,
            [0, 1],
            [10, 0]
          ),
        },
        {
          scale: interpolate(
            animatedOpacity.value,
            [0, 1],
            [0.98, 1]
          ),
        },
      ],
    };
  });

  const content = (
    <View style={[!noPadding && styles.content]}>{children}</View>
  );

  if (Platform.OS === "web") {
    return (
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor,
            borderColor: theme.glassBorder,
            shadowColor: theme.shadow,
          },
          Shadows.md,
          style,
          animatedOpacity ? animatedStyle : undefined,
        ]}
      >
        {content}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor: theme.glassBorder,
          shadowColor: theme.shadow,
          overflow: "hidden",
        },
        Shadows.md,
        style,
        animatedOpacity ? animatedStyle : undefined,
      ]}
    >
      <BlurView
        intensity={blurIntensity}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor },
        ]}
      />
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  content: {
    padding: 16,
  },
});
