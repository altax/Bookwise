import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { ThemedText } from "@/components/ThemedText";
import { BionicText } from "@/components/BionicText";

interface TxtReaderProps {
  fileUri: string;
  currentPage: number;
  onContentLoaded?: (content: string, totalPages: number) => void;
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

export function TxtReader({
  fileUri,
  currentPage,
  onContentLoaded,
  onError,
  theme,
  settings,
}: TxtReaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullContent, setFullContent] = useState<string>("");
  const [pageContent, setPageContent] = useState<string>("");

  useEffect(() => {
    loadContent();
  }, [fileUri]);

  useEffect(() => {
    if (fullContent) {
      const charsPerPage = 2000;
      const startIndex = currentPage * charsPerPage;
      const endIndex = Math.min(startIndex + charsPerPage, fullContent.length);
      setPageContent(fullContent.substring(startIndex, endIndex));
    }
  }, [currentPage, fullContent]);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const content = await FileSystem.readAsStringAsync(fileUri);
      setFullContent(content);

      const totalPages = Math.ceil(content.length / 2000);
      onContentLoaded?.(content, Math.max(totalPages, 1));

      const charsPerPage = 2000;
      const endIndex = Math.min(charsPerPage, content.length);
      setPageContent(content.substring(0, endIndex));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load text file";
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
          Loading text...
        </ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText style={styles.errorText}>
          Error loading file: {error}
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
