import React, { useEffect } from "react";
import { StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { Motion } from "@/constants/theme";

interface BookmarkRibbonProps {
  isBookmarked: boolean;
  onPress: () => void;
  size?: number;
}

export function BookmarkRibbon({
  isBookmarked,
  onPress,
  size = 28,
}: BookmarkRibbonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const fillProgress = useSharedValue(isBookmarked ? 1 : 0);

  useEffect(() => {
    fillProgress.value = withSpring(isBookmarked ? 1 : 0, {
      damping: Motion.easing.springSnappy.damping,
      stiffness: Motion.easing.springSnappy.stiffness,
    });
  }, [isBookmarked]);

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.85, { damping: 10, stiffness: 400 }),
      withSpring(1.1, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );

    if (!isBookmarked) {
      rotation.value = withSequence(
        withTiming(-10, { duration: 100 }),
        withTiming(10, { duration: 100 }),
        withTiming(-5, { duration: 80 }),
        withTiming(0, { duration: 80 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress();
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const animatedFillStyle = useAnimatedStyle(() => ({
    opacity: fillProgress.value,
    transform: [
      {
        scale: interpolate(
          fillProgress.value,
          [0, 1],
          [0.5, 1],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <Feather
          name="bookmark"
          size={size}
          color={isBookmarked ? theme.accent : theme.text}
        />
        <Animated.View style={[styles.fill, animatedFillStyle]}>
          <Feather
            name="bookmark"
            size={size}
            color={theme.accent}
            style={{ position: "absolute" }}
          />
          <Feather
            name="check"
            size={size * 0.5}
            color={theme.backgroundRoot}
            style={styles.checkIcon}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  fill: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  checkIcon: {
    marginTop: 2,
  },
});
