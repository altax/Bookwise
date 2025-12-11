import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Book } from "@/contexts/ReadingContext";

interface BookCardProps {
  book: Book;
  onPress: () => void;
  onLongPress: () => void;
  viewMode: "grid" | "list";
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function BookCard({ book, onPress, onLongPress, viewMode }: BookCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const getFileIcon = () => {
    switch (book.fileType) {
      case "epub":
        return "book";
      case "pdf":
        return "file-text";
      case "txt":
        return "file";
      default:
        return "book";
    }
  };

  if (viewMode === "list") {
    return (
      <AnimatedPressable
        style={[
          styles.listCard,
          { backgroundColor: theme.backgroundDefault },
          animatedStyle,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={500}
      >
        <View style={[styles.listCover, { backgroundColor: theme.backgroundSecondary }]}>
          {book.coverUri ? (
            <Image
              source={{ uri: book.coverUri }}
              style={styles.listCoverImage}
              contentFit="cover"
            />
          ) : (
            <Feather name={getFileIcon()} size={28} color={theme.secondaryText} />
          )}
        </View>
        <View style={styles.listInfo}>
          <ThemedText style={styles.listTitle} numberOfLines={2}>
            {book.title}
          </ThemedText>
          <ThemedText style={[styles.listAuthor, { color: theme.secondaryText }]} numberOfLines={1}>
            {book.author}
          </ThemedText>
          <View style={styles.listProgress}>
            <View style={[styles.progressTrack, { backgroundColor: theme.backgroundTertiary }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.progressBar,
                    width: `${book.progress}%`,
                  },
                ]}
              />
            </View>
            <ThemedText style={[styles.progressText, { color: theme.secondaryText }]}>
              {Math.round(book.progress)}%
            </ThemedText>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={theme.secondaryText} />
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      style={[styles.gridCard, animatedStyle]}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayLongPress={500}
    >
      <View style={[styles.gridCover, { backgroundColor: theme.backgroundDefault }]}>
        {book.coverUri ? (
          <Image
            source={{ uri: book.coverUri }}
            style={styles.gridCoverImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.placeholderCover, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name={getFileIcon()} size={36} color={theme.secondaryText} />
          </View>
        )}
        <View style={[styles.gridProgressBar, { backgroundColor: theme.backgroundTertiary }]}>
          <View
            style={[
              styles.gridProgressFill,
              {
                backgroundColor: theme.progressBar,
                width: `${book.progress}%`,
              },
            ]}
          />
        </View>
      </View>
      <View style={styles.gridInfo}>
        <ThemedText style={styles.gridTitle} numberOfLines={1}>
          {book.title}
        </ThemedText>
        <ThemedText
          style={[styles.gridAuthor, { color: theme.secondaryText }]}
          numberOfLines={1}
        >
          {book.author}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    flex: 1,
    maxWidth: "50%",
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  gridCover: {
    aspectRatio: 2 / 3,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  gridCoverImage: {
    width: "100%",
    height: "100%",
  },
  placeholderCover: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gridProgressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  gridProgressFill: {
    height: "100%",
  },
  gridInfo: {
    gap: 2,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  gridAuthor: {
    fontSize: 12,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  listCover: {
    width: 60,
    height: 90,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  listCoverImage: {
    width: "100%",
    height: "100%",
  },
  listInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  listAuthor: {
    fontSize: 13,
  },
  listProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    minWidth: 30,
  },
});
