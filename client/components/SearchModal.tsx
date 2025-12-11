import React, { useState, useCallback } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SearchResult {
  index: number;
  text: string;
  context: string;
}

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  content: string;
  onResultSelect: (index: number) => void;
  theme: {
    backgroundDefault: string;
    backgroundRoot: string;
    text: string;
    secondaryText: string;
    accent: string;
    border: string;
  };
}

export function SearchModal({
  visible,
  onClose,
  content,
  onResultSelect,
  theme,
}: SearchModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  const performSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      const foundResults: SearchResult[] = [];
      const lowerContent = content.toLowerCase();
      const lowerQuery = searchQuery.toLowerCase();
      let startIndex = 0;

      while (startIndex < content.length) {
        const index = lowerContent.indexOf(lowerQuery, startIndex);
        if (index === -1) break;

        const contextStart = Math.max(0, index - 40);
        const contextEnd = Math.min(content.length, index + searchQuery.length + 40);
        const context = content.substring(contextStart, contextEnd);

        foundResults.push({
          index,
          text: content.substring(index, index + searchQuery.length),
          context:
            (contextStart > 0 ? "..." : "") +
            context +
            (contextEnd < content.length ? "..." : ""),
        });

        startIndex = index + 1;

        if (foundResults.length >= 50) break;
      }

      setResults(foundResults);
      if (foundResults.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [content]
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
    performSearch(text);
  };

  const handleResultPress = (result: SearchResult) => {
    onResultSelect(result.index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <ThemedText
          key={index}
          style={[styles.highlight, { backgroundColor: theme.accent + "40" }]}
        >
          {part}
        </ThemedText>
      ) : (
        <ThemedText key={index} style={{ color: theme.secondaryText }}>
          {part}
        </ThemedText>
      )
    );
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <Pressable
      style={[
        styles.resultItem,
        { backgroundColor: theme.backgroundRoot, borderColor: theme.border },
      ]}
      onPress={() => handleResultPress(item)}
    >
      <View style={styles.resultContent}>
        <ThemedText style={[styles.resultContext, { color: theme.secondaryText }]}>
          {highlightMatch(item.context, query)}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={20} color={theme.secondaryText} />
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: theme.backgroundRoot, borderColor: theme.border },
            ]}
          >
            <Feather name="search" size={20} color={theme.secondaryText} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Search in book..."
              placeholderTextColor={theme.secondaryText}
              value={query}
              onChangeText={handleQueryChange}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => handleQueryChange("")}>
                <Feather name="x-circle" size={18} color={theme.secondaryText} />
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <ThemedText style={{ color: theme.accent }}>Cancel</ThemedText>
          </Pressable>
        </View>

        {results.length > 0 ? (
          <View style={styles.resultsHeader}>
            <ThemedText style={[styles.resultsCount, { color: theme.secondaryText }]}>
              {results.length} result{results.length !== 1 ? "s" : ""} found
            </ThemedText>
          </View>
        ) : null}

        {query.length >= 2 && results.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="search" size={48} color={theme.secondaryText} />
            <ThemedText
              style={[styles.emptyStateText, { color: theme.secondaryText }]}
            >
              No results found for "{query}"
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.index.toString()}
            renderItem={renderResult}
            contentContainerStyle={[
              styles.resultsList,
              { paddingBottom: insets.bottom + Spacing.lg },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
  },
  resultsHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  resultsCount: {
    fontSize: 14,
  },
  resultsList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  resultContent: {
    flex: 1,
  },
  resultContext: {
    fontSize: 14,
    lineHeight: 20,
  },
  highlight: {
    fontWeight: "600",
    borderRadius: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.lg,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: "center",
  },
});
