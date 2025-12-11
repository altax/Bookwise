import React, { useState } from "react";
import { View, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { ThemedText } from "@/components/ThemedText";

interface PdfReaderProps {
  fileUri: string;
  onPageChange?: (page: number, total: number) => void;
  onReady?: () => void;
  onError?: (error: string) => void;
  theme: {
    text: string;
    backgroundRoot: string;
  };
}

export function PdfReader({
  fileUri,
  onPageChange,
  onReady,
  onError,
  theme,
}: PdfReaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = () => {
    setIsLoading(false);
    onReady?.();
  };

  const handleError = (syntheticEvent: { nativeEvent: { description?: string } }) => {
    const { nativeEvent } = syntheticEvent;
    const errorMessage = nativeEvent.description || "Failed to load PDF";
    setError(errorMessage);
    setIsLoading(false);
    onError?.(errorMessage);
  };

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <iframe
          src={fileUri}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          title="PDF Viewer"
        />
      </View>
    );
  }

  const googleDocsUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUri)}`;
  const pdfJsUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(fileUri)}`;

  const viewerUrl = fileUri.startsWith("http") ? googleDocsUrl : fileUri;

  if (error) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText style={styles.errorText}>
          Error loading PDF: {error}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      )}
      <WebView
        source={{ uri: viewerUrl }}
        style={styles.webview}
        onLoad={handleLoad}
        onError={handleError}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "pageChange" && onPageChange) {
              onPageChange(data.page, data.total);
            }
          } catch {
          }
        }}
      />
    </View>
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
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  errorText: {
    padding: 20,
    textAlign: "center",
  },
});
