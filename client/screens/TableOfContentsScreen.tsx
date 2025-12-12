import React, { useState } from "react";
import { View, FlatList, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp, CommonActions } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useReading, Bookmark, Note } from "@/contexts/ReadingContext";

type TOCRouteProp = RouteProp<RootStackParamList, "TableOfContents">;

interface Chapter {
  title: string;
  page: number;
}

type TabType = "chapters" | "bookmarks" | "notes";

export default function TableOfContentsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const route = useRoute<TOCRouteProp>();
  const { theme } = useTheme();
  const { book, chapters } = route.params;
  const { books, removeBookmark, removeNote, updateBookProgress } = useReading();
  
  const [activeTab, setActiveTab] = useState<TabType>("chapters");
  
  const currentBook = books.find(b => b.id === book.id);
  const bookmarks = currentBook?.bookmarks || [];
  const notes = currentBook?.notes || [];

  const navigateToPage = async (page: number) => {
    await updateBookProgress(book.id, page, book.totalPages);
    navigation.goBack();
  };

  const handleChapterPress = (chapter: Chapter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateToPage(chapter.page);
  };

  const handleBookmarkPress = (bookmark: Bookmark) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateToPage(bookmark.page);
  };

  const handleNotePress = (note: Note) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateToPage(note.page);
  };

  const handleRemoveBookmark = async (bookmarkId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await removeBookmark(book.id, bookmarkId);
  };

  const handleRemoveNote = async (noteId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await removeNote(book.id, noteId);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const renderChapter = ({ item, index }: { item: Chapter; index: number }) => {
    const isCurrentChapter = book.currentPage >= item.page && 
      (index === chapters.length - 1 || book.currentPage < chapters[index + 1].page);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.itemContainer,
          {
            backgroundColor: pressed
              ? theme.backgroundSecondary
              : theme.backgroundDefault,
            borderLeftColor: isCurrentChapter ? theme.accent : "transparent",
          },
        ]}
        onPress={() => handleChapterPress(item)}
      >
        <View style={styles.itemInfo}>
          <ThemedText
            style={[
              styles.itemTitle,
              isCurrentChapter && { color: theme.accent, fontWeight: "600" },
            ]}
          >
            {item.title}
          </ThemedText>
          <ThemedText style={[styles.itemSubtitle, { color: theme.secondaryText }]}>
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

  const renderBookmark = ({ item }: { item: Bookmark }) => {
    const isCurrentPage = book.currentPage === item.page;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.itemContainer,
          {
            backgroundColor: pressed
              ? theme.backgroundSecondary
              : theme.backgroundDefault,
            borderLeftColor: isCurrentPage ? theme.accent : "transparent",
          },
        ]}
        onPress={() => handleBookmarkPress(item)}
        onLongPress={() => handleRemoveBookmark(item.id)}
      >
        <View style={styles.itemInfo}>
          <ThemedText
            style={[
              styles.itemTitle,
              isCurrentPage && { color: theme.accent, fontWeight: "600" },
            ]}
          >
            Page {item.page + 1}
          </ThemedText>
          <ThemedText style={[styles.itemSubtitle, { color: theme.secondaryText }]}>
            {formatDate(item.createdAt)}
          </ThemedText>
        </View>
        <View style={styles.itemActions}>
          <Feather name="bookmark" size={18} color={isCurrentPage ? theme.accent : theme.secondaryText} />
        </View>
      </Pressable>
    );
  };

  const renderNote = ({ item }: { item: Note }) => {
    const isCurrentPage = book.currentPage === item.page;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.itemContainer,
          {
            backgroundColor: pressed
              ? theme.backgroundSecondary
              : theme.backgroundDefault,
            borderLeftColor: item.color,
          },
        ]}
        onPress={() => handleNotePress(item)}
        onLongPress={() => handleRemoveNote(item.id)}
      >
        <View style={styles.itemInfo}>
          {item.selectedText ? (
            <ThemedText
              style={[styles.noteQuote, { color: theme.secondaryText }]}
              numberOfLines={1}
            >
              "{item.selectedText}"
            </ThemedText>
          ) : null}
          <ThemedText
            style={[styles.itemTitle]}
            numberOfLines={2}
          >
            {item.content || "No note content"}
          </ThemedText>
          <ThemedText style={[styles.itemSubtitle, { color: theme.secondaryText }]}>
            Page {item.page + 1} · {formatDate(item.createdAt)}
          </ThemedText>
        </View>
        <Feather name="edit-3" size={16} color={theme.secondaryText} />
      </Pressable>
    );
  };

  const renderEmptyList = (type: TabType) => {
    const messages = {
      chapters: "No chapters found",
      bookmarks: "No bookmarks yet.\nTap the bookmark icon while reading to add one.",
      notes: "No notes yet.\nTap the note icon while reading to add one.",
    };
    const icons = {
      chapters: "list",
      bookmarks: "bookmark",
      notes: "edit-3",
    };

    return (
      <View style={styles.emptyContainer}>
        <Feather name={icons[type] as any} size={48} color={theme.secondaryText} />
        <ThemedText style={[styles.emptyText, { color: theme.secondaryText }]}>
          {messages[type]}
        </ThemedText>
      </View>
    );
  };

  const renderTabButton = (tab: TabType, label: string, icon: string, count?: number) => {
    const isActive = activeTab === tab;
    return (
      <Pressable
        style={[
          styles.tabButton,
          {
            backgroundColor: isActive ? theme.accent : theme.backgroundSecondary,
          },
        ]}
        onPress={() => {
          setActiveTab(tab);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Feather name={icon as any} size={16} color={isActive ? "#FFFFFF" : theme.text} />
        <ThemedText style={[styles.tabLabel, { color: isActive ? "#FFFFFF" : theme.text }]}>
          {label}
        </ThemedText>
        {count !== undefined && count > 0 && (
          <View style={[styles.badge, { backgroundColor: isActive ? "rgba(255,255,255,0.3)" : theme.accent }]}>
            <ThemedText style={[styles.badgeText, { color: isActive ? "#FFFFFF" : "#FFFFFF" }]}>
              {count}
            </ThemedText>
          </View>
        )}
      </Pressable>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "chapters":
        return (
          <FlatList
            data={chapters}
            keyExtractor={(item, index) => `chapter-${item.title}-${index}`}
            renderItem={renderChapter}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
            )}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyList("chapters")}
          />
        );
      case "bookmarks":
        return (
          <FlatList
            data={bookmarks}
            keyExtractor={(item) => `bookmark-${item.id}`}
            renderItem={renderBookmark}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
            )}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyList("bookmarks")}
          />
        );
      case "notes":
        return (
          <FlatList
            data={notes}
            keyExtractor={(item) => `note-${item.id}`}
            renderItem={renderNote}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
            )}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyList("notes")}
          />
        );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.tabsContainer, { marginTop: headerHeight }]}>
        {renderTabButton("chapters", "Chapters", "list", chapters.length)}
        {renderTabButton("bookmarks", "Bookmarks", "bookmark", bookmarks.length)}
        {renderTabButton("notes", "Notes", "edit-3", notes.length)}
      </View>
      
      <View style={[styles.contentContainer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {renderContent()}
      </View>
      
      {(activeTab === "bookmarks" || activeTab === "notes") && (
        <View style={[styles.hintContainer, { bottom: insets.bottom + Spacing.lg }]}>
          <ThemedText style={[styles.hintText, { color: theme.secondaryText }]}>
            Long press to delete
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    flexGrow: 1,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
  },
  itemSubtitle: {
    fontSize: 12,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  noteQuote: {
    fontSize: 12,
    fontStyle: "italic",
  },
  separator: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  hintContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hintText: {
    fontSize: 11,
  },
});
