import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  FlatList,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useReading } from "@/contexts/ReadingContext";
import { Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    id: "1",
    icon: "book-open",
    title: "Welcome to Bookwise",
    description:
      "Your minimalist reading companion. Focus on what matters - the story.",
  },
  {
    id: "2",
    icon: "upload",
    title: "Import Your Books",
    description:
      "Add books in EPUB, PDF, or TXT format. Your library, your way.",
  },
  {
    id: "3",
    icon: "sliders",
    title: "Personalize Everything",
    description:
      "Adjust fonts, themes, and spacing. Create your perfect reading environment.",
  },
  {
    id: "4",
    icon: "bookmark",
    title: "Never Lose Your Place",
    description:
      "Bookmark pages, add notes, and track your progress across all your books.",
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { updateSettings } = useReading();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);

  const handleComplete = async () => {
    await updateSettings({ hasSeenOnboarding: true });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.accent + "20" },
        ]}
      >
        <Feather name={item.icon} size={64} color={theme.accent} />
      </View>
      <ThemedText type="h2" style={styles.title}>
        {item.title}
      </ThemedText>
      <ThemedText
        style={[styles.description, { color: theme.secondaryText }]}
      >
        {item.description}
      </ThemedText>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.pagination}>
      {slides.map((_, index) => {
        const dotStyle = useAnimatedStyle(() => {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ];
          const width = interpolate(
            scrollX.value,
            inputRange,
            [8, 24, 8],
            Extrapolation.CLAMP
          );
          const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.4, 1, 0.4],
            Extrapolation.CLAMP
          );
          return { width, opacity };
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: theme.accent },
              dotStyle,
            ]}
          />
        );
      })}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <ThemedText style={{ color: theme.secondaryText }}>Skip</ThemedText>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        onScroll={(event) => {
          scrollX.value = event.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
      />

      {renderPagination()}

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Pressable
          style={[styles.nextButton, { backgroundColor: theme.accent }]}
          onPress={handleNext}
        >
          <ThemedText style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
          </ThemedText>
          <Feather
            name={currentIndex === slides.length - 1 ? "check" : "arrow-right"}
            size={20}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
  },
  skipButton: {
    padding: Spacing.sm,
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  description: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
