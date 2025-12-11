import React from "react";
import { View, FlatList, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type TOCRouteProp = RouteProp<RootStackParamList, "TableOfContents">;

interface Chapter {
  title: string;
  page: number;
}

export default function TableOfContentsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const route = useRoute<TOCRouteProp>();
  const { theme } = useTheme();
  const { book, chapters } = route.params;

  const handleChapterPress = (chapter: Chapter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const renderChapter = ({ item, index }: { item: Chapter; index: number }) => {
    const isCurrentChapter = book.currentPage >= item.page && 
      (index === chapters.length - 1 || book.currentPage < chapters[index + 1].page);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.chapterItem,
          {
            backgroundColor: pressed
              ? theme.backgroundSecondary
              : theme.backgroundDefault,
            borderLeftColor: isCurrentChapter ? theme.accent : "transparent",
          },
        ]}
        onPress={() => handleChapterPress(item)}
      >
        <View style={styles.chapterInfo}>
          <ThemedText
            style={[
              styles.chapterTitle,
              isCurrentChapter && { color: theme.accent, fontWeight: "600" },
            ]}
          >
            {item.title}
          </ThemedText>
          <ThemedText style={[styles.chapterPage, { color: theme.secondaryText }]}>
            Page {item.page + 1}
          </ThemedText>
        </View>
        {isCurrentChapter ? (
          <Feather name="bookmark" size={18} color={theme.accent} />
        ) : (
          <Feather name="chevron-right" size={18} color={theme.secondaryText} />
        )}
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={chapters}
        keyExtractor={(item, index) => `${item.title}-${index}`}
        renderItem={renderChapter}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  chapterItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
  },
  chapterInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  chapterTitle: {
    fontSize: 16,
  },
  chapterPage: {
    fontSize: 13,
  },
  separator: {
    height: 1,
    marginVertical: Spacing.xs,
  },
});
