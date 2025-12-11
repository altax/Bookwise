import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "./ThemedText";
import { Motion } from "@/constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  label?: string;
  color?: string;
  backgroundColor?: string;
  animated?: boolean;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  showPercentage = true,
  label,
  color,
  backgroundColor,
  animated = true,
}: ProgressRingProps) {
  const { theme } = useTheme();
  const animatedProgress = useSharedValue(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;

  useEffect(() => {
    if (animated) {
      animatedProgress.value = withSpring(Math.min(progress, 100) / 100, {
        damping: Motion.easing.springGentle.damping,
        stiffness: Motion.easing.springGentle.stiffness,
      });
    } else {
      animatedProgress.value = Math.min(progress, 100) / 100;
    }
  }, [progress, animated]);

  const ringColor = color || theme.accent;
  const bgColor = backgroundColor || theme.backgroundSecondary;

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedProgress.value);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.content}>
        {showPercentage && (
          <ThemedText style={[styles.percentage, { fontSize: size * 0.22 }]}>
            {Math.round(progress)}%
          </ThemedText>
        )}
        {label && (
          <ThemedText style={[styles.label, { color: theme.secondaryText }]}>
            {label}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    position: "absolute",
  },
  content: {
    alignItems: "center",
  },
  percentage: {
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
});
