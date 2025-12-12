import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "./ThemedText";
import { GlassCard } from "./GlassCard";
import { BorderRadius, Spacing, Motion } from "@/constants/theme";

interface ReadingTimerProps {
  onBreakSuggested?: () => void;
  visible: boolean;
  focusMode?: boolean;
  showTimer?: boolean;
}

export function ReadingTimer({
  onBreakSuggested,
  visible,
  focusMode = false,
  showTimer = true,
}: ReadingTimerProps) {
  const { theme } = useTheme();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const pulseScale = useSharedValue(1);
  const breakReminderOpacity = useSharedValue(0);

  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused]);

  useEffect(() => {
    if (elapsedTime > 0 && elapsedTime % 1500 === 0) {
      setShowBreakReminder(true);
      breakReminderOpacity.value = withTiming(1, { duration: Motion.duration.normal });
      
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        3,
        false
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onBreakSuggested?.();
    }
  }, [elapsedTime]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDismissBreakReminder = () => {
    breakReminderOpacity.value = withTiming(0, { duration: Motion.duration.fast });
    setTimeout(() => setShowBreakReminder(false), Motion.duration.fast);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const breakReminderStyle = useAnimatedStyle(() => ({
    opacity: breakReminderOpacity.value,
  }));

  if (!visible || !showTimer) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.timerBadge, animatedPulseStyle, { backgroundColor: focusMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)' }]}>
        <Pressable onPress={togglePause} style={styles.timerContent}>
          <Feather
            name={isPaused ? "play" : "clock"}
            size={14}
            color={theme.accent}
          />
          <ThemedText style={[styles.timerText, { color: theme.accent }]} numberOfLines={1}>
            {formatTime(elapsedTime)}
          </ThemedText>
        </Pressable>
      </Animated.View>

      {showBreakReminder && (
        <Animated.View style={[styles.breakReminder, breakReminderStyle]}>
          <GlassCard intensity="strong" style={styles.breakCard}>
            <View style={styles.breakContent}>
              <View style={styles.breakIcon}>
                <Feather name="coffee" size={24} color={theme.warning} />
              </View>
              <View style={styles.breakTextContainer}>
                <ThemedText style={[styles.breakTitle, { color: theme.text }]}>
                  Time for a break?
                </ThemedText>
                <ThemedText style={[styles.breakSubtitle, { color: theme.secondaryText }]}>
                  You've been reading for 25 minutes
                </ThemedText>
              </View>
              <Pressable onPress={handleDismissBreakReminder} style={styles.dismissButton}>
                <Feather name="x" size={20} color={theme.secondaryText} />
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
  },
  timerBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    maxWidth: 120,
  },
  timerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  timerText: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  breakReminder: {
    position: "absolute",
    top: 50,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 100,
  },
  breakCard: {
    padding: 0,
  },
  breakContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  breakIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  breakTextContainer: {
    flex: 1,
  },
  breakTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  breakSubtitle: {
    fontSize: 13,
  },
  dismissButton: {
    padding: Spacing.sm,
  },
});
