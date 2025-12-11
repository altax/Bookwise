import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BookCard } from "@/components/BookCard";
import { useReading, Book } from "@/contexts/ReadingContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { books, addBook, removeBook, setCurrentBook, isLoading } = useReading();
  const [isImporting, setIsImporting] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"recent" | "title" | "date">("recent");

  const fabScale = useSharedValue(1);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const handleImportBook = async () => {
    try {
      setIsImporting(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/epub+zip",
          "application/pdf",
          "text/plain",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileName = file.name || "Unknown Book";
        const fileType = getFileType(file.mimeType || "", fileName);

        if (fileType) {
          await addBook({
            title: fileName.replace(/\.[^/.]+$/, ""),
            author: "Unknown Author",
            fileUri: file.uri,
            fileType,
            totalPages: fileType === "txt" ? 1 : 100,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert("Unsupported Format", "Please select an EPUB, PDF, or TXT file.");
        }
      }
    } catch (error) {
      console.error("Import error:", error);
      Alert.alert("Import Failed", "Could not import the book. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const getFileType = (mimeType: string, fileName: string): "epub" | "pdf" | "txt" | null => {
    if (mimeType.includes("epub") || fileName.endsWith(".epub")) return "epub";
    if (mimeType.includes("pdf") || fileName.endsWith(".pdf")) return "pdf";
    if (mimeType.includes("text") || fileName.endsWith(".txt")) return "txt";
    return null;
  };

  const handleOpenBook = (book: Book) => {
    setCurrentBook(book);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Reading", { book });
  };

  const handleDeleteBook = (book: Book) => {
    Alert.alert(
      "Delete Book",
      `Are you sure you want to delete "${book.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeBook(book.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const sortedBooks = React.useMemo(() => {
    const sorted = [...books];
    switch (sortBy) {
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "date":
        sorted.sort((a, b) => b.addedAt - a.addedAt);
        break;
      case "recent":
      default:
        sorted.sort((a, b) => b.lastRead - a.lastRead);
        break;
    }
    return sorted;
  }, [books, sortBy]);

  const renderBook = useCallback(
    ({ item }: { item: Book }) => (
      <BookCard
        book={item}
        onPress={() => handleOpenBook(item)}
        onLongPress={() => handleDeleteBook(item)}
        viewMode={viewMode}
      />
    ),
    [viewMode]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="book-open" size={48} color={theme.secondaryText} />
      </View>
      <ThemedText type="h4" style={styles.emptyTitle}>
        Your library is empty
      </ThemedText>
      <ThemedText
        style={[styles.emptyDescription, { color: theme.secondaryText }]}
      >
        Import your first book to start reading
      </ThemedText>
      <Pressable
        style={[styles.importButton, { backgroundColor: theme.accent }]}
        onPress={handleImportBook}
      >
        <Feather name="plus" size={20} color="#FFFFFF" />
        <ThemedText style={styles.importButtonText}>Import Book</ThemedText>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.accent} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={sortedBooks}
        keyExtractor={(item) => item.id}
        renderItem={renderBook}
        numColumns={viewMode === "grid" ? 2 : 1}
        key={viewMode}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + 80,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {books.length > 0 ? (
        <AnimatedPressable
          style={[
            styles.fab,
            { backgroundColor: theme.accent, bottom: tabBarHeight + Spacing.xl },
            fabAnimatedStyle,
          ]}
          onPress={handleImportBook}
          onPressIn={() => {
            fabScale.value = withSpring(0.9);
          }}
          onPressOut={() => {
            fabScale.value = withSpring(1);
          }}
          disabled={isImporting}
        >
          {isImporting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="plus" size={24} color="#FFFFFF" />
          )}
        </AnimatedPressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: Spacing["2xl"],
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  importButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 4,
  },
});
