import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { Reader, ReaderProvider, useReader } from "@epubjs-react-native/core";
import { useFileSystem } from "@epubjs-react-native/expo-file-system";
import { ThemedText } from "@/components/ThemedText";

interface EpubReaderProps {
  fileUri: string;
  onLocationChange?: (location: { start: { percentage: number }; end: { percentage: number } }) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
  theme: {
    text: string;
    backgroundRoot: string;
  };
  settings: {
    fontSize: number;
    lineSpacing: number;
    fontFamily: string;
  };
}

function EpubReaderContent({
  fileUri,
  onLocationChange,
  onReady,
  onError,
  theme,
  settings,
}: EpubReaderProps) {
  const { goToLocation, currentLocation } = useReader();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentLocation && onLocationChange) {
      onLocationChange(currentLocation);
    }
  }, [currentLocation, onLocationChange]);

  const handleReady = () => {
    setIsLoading(false);
    onReady?.();
  };

  const handleError = (err: string | Error) => {
    const errorMessage = typeof err === "string" ? err : err.message;
    setError(errorMessage);
    setIsLoading(false);
    onError?.(typeof err === "string" ? new Error(err) : err);
  };

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText style={styles.errorText}>
          Error loading EPUB: {error}
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
      <Reader
        src={fileUri}
        fileSystem={useFileSystem}
        enableSwipe={true}
        onReady={handleReady}
        onDisplayError={handleError}
        onLocationChange={(_, current) => {
          if (current && onLocationChange) {
            onLocationChange(current);
          }
        }}
        defaultTheme={{
          body: {
            background: theme.backgroundRoot,
            color: theme.text,
            "font-size": `${settings.fontSize}px`,
            "line-height": `${settings.lineSpacing}`,
            "font-family": settings.fontFamily,
          },
          "*": {
            color: theme.text,
          },
          a: {
            color: theme.text,
          },
          "::selection": {
            background: "rgba(100, 100, 255, 0.3)",
          },
        }}
      />
    </View>
  );
}

export function EpubReader(props: EpubReaderProps) {
  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: props.theme.backgroundRoot }]}>
        <ThemedText style={styles.webMessage}>
          EPUB reader is not fully supported on web.
          Please use the mobile app for the best experience.
        </ThemedText>
      </View>
    );
  }

  return (
    <ReaderProvider>
      <EpubReaderContent {...props} />
    </ReaderProvider>
  );
}

const styles = StyleSheet.create({
  container: {
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
  webMessage: {
    padding: 20,
    textAlign: "center",
    opacity: 0.7,
  },
});
