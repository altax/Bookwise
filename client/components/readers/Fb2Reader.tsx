import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
} from "react-native";
import { BookParserService, ParsedBook } from "@/services/BookParserService";
import { ThemedText } from "@/components/ThemedText";
import { BionicText } from "@/components/BionicText";

interface Fb2ReaderProps {
  fileUri: string;
  currentPage: number;
  onContentLoaded?: (parsedBook: ParsedBook) => void;
  onError?: (error: string) => void;
  theme: {
    text: string;
    backgroundRoot: string;
    secondaryText: string;
  };
  settings: {
    fontSize: number;
    lineSpacing: number;
    fontFamily: string;
    marginHorizontal: number;
    letterSpacing: number;
    textAlignment: "left" | "justify";
    bionicReading: boolean;
  };
}

export function Fb2Reader({
  fileUri,
  currentPage,
  onContentLoaded,
  onError,
  theme,
  settings,
}: Fb2ReaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedBook, setParsedBook] = useState<ParsedBook | null>(null);
  const [pageContent, setPageContent] = useState<string>("");

  useEffect(() => {
    loadBook();
  }, [fileUri]);

  useEffect(() => {
    if (parsedBook) {
      const content = parsedBook.content;
      const charsPerPage = 2000;
      const startIndex = currentPage * charsPerPage;
      const endIndex = Math.min(startIndex + charsPerPage, content.length);
      setPageContent(content.substring(startIndex, endIndex));
    }
  }, [currentPage, parsedBook]);

  const loadBook = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const parsed = await BookParserService.parseFb2(fileUri);
      setParsedBook(parsed);
      onContentLoaded?.(parsed);

      const charsPerPage = 2000;
      const startIndex = currentPage * charsPerPage;
      const endIndex = Math.min(startIndex + charsPerPage, parsed.content.length);
      setPageContent(parsed.content.substring(startIndex, endIndex));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load FB2";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getFontFamily = () => {
    switch (settings.fontFamily) {
      case "serif":
        return Platform.OS === "ios" ? "Georgia" : "serif";
      case "georgia":
        return Platform.OS === "ios" ? "Georgia" : "serif";
      case "times":
        return Platform.OS === "ios" ? "Times New Roman" : "serif";
      case "palatino":
        return Platform.OS === "ios" ? "Palatino" : "serif";
      default:
        return Platform.OS === "ios" ? "System" : "sans-serif";
    }
  };

  const textStyle = {
    fontSize: settings.fontSize,
    lineHeight: settings.fontSize * settings.lineSpacing,
    fontFamily: getFontFamily(),
    color: theme.text,
    letterSpacing: settings.letterSpacing,
    textAlign: settings.textAlignment as "left" | "justify",
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.text} />
        <ThemedText style={[styles.loadingText, { color: theme.secondaryText }]}>
          Loading book...
        </ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText style={styles.errorText}>
          Error loading FB2: {error}
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingHorizontal: settings.marginHorizontal },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {parsedBook?.metadata && currentPage === 0 && (
        <View style={styles.header}>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            {parsedBook.metadata.title}
          </ThemedText>
          <ThemedText style={[styles.author, { color: theme.secondaryText }]}>
            {parsedBook.metadata.author}
          </ThemedText>
        </View>
      )}

      {settings.bionicReading ? (
        <BionicText style={textStyle} enabled={true}>
          {pageContent}
        </BionicText>
      ) : (
        <Text style={[styles.content, textStyle]}>
          {pageContent}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    paddingVertical: 20,
    flexGrow: 1,
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  author: {
    fontSize: 16,
    textAlign: "center",
  },
  content: {
    textAlign: "left",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorText: {
    padding: 20,
    textAlign: "center",
  },
});
