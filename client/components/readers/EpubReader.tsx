import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Platform, Pressable } from "react-native";
import { Reader, ReaderProvider, useReader } from "@epubjs-react-native/core";
import { useFileSystem } from "@epubjs-react-native/expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@expo/vector-icons";

const LOADING_TIMEOUT_MS = 30000;

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
  const [fileExists, setFileExists] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const checkFileExists = async () => {
      try {
        const info = await FileSystem.getInfoAsync(fileUri);
        if (!info.exists) {
          setFileExists(false);
          setError("Book file not found. It may have been moved or deleted.");
          setIsLoading(false);
          onError?.(new Error("File not found"));
        } else {
          setFileExists(true);
        }
      } catch (err) {
        console.error("Error checking file:", err);
      }
    };
    
    checkFileExists();
  }, [fileUri, retryCount]);

  useEffect(() => {
    if (!fileExists || !isLoading) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (!hasLoadedRef.current && isLoading) {
        setError("Book is taking too long to load. The file may be corrupted or in an unsupported format.");
        setIsLoading(false);
        onError?.(new Error("Loading timeout"));
      }
    }, LOADING_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fileUri, fileExists, isLoading, retryCount]);

  useEffect(() => {
    if (currentLocation && onLocationChange) {
      onLocationChange(currentLocation);
    }
  }, [currentLocation]);

  const handleReady = () => {
    hasLoadedRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLoading(false);
    onReady?.();
  };

  const handleError = (err: string | Error) => {
    hasLoadedRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    const errorMessage = typeof err === "string" ? err : err.message;
    setError(errorMessage);
    setIsLoading(false);
    onError?.(typeof err === "string" ? new Error(err) : err);
  };

  const handleRetry = () => {
    hasLoadedRef.current = false;
    setError(null);
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
  };

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, { backgroundColor: theme.backgroundRoot }]}>
        <Feather name="alert-circle" size={48} color={theme.text} style={{ opacity: 0.5, marginBottom: 16 }} />
        <ThemedText style={[styles.errorText, { color: theme.text }]}>
          {error}
        </ThemedText>
        <Pressable 
          onPress={handleRetry} 
          style={[styles.retryButton, { borderColor: theme.text }]}
        >
          <Feather name="refresh-cw" size={16} color={theme.text} />
          <ThemedText style={[styles.retryText, { color: theme.text }]}>
            Try Again
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!fileExists) {
    return (
      <View style={[styles.container, styles.errorContainer, { backgroundColor: theme.backgroundRoot }]}>
        <Feather name="file-minus" size={48} color={theme.text} style={{ opacity: 0.5, marginBottom: 16 }} />
        <ThemedText style={[styles.errorText, { color: theme.text }]}>
          Book file not found
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.text} />
          <ThemedText style={[styles.loadingText, { color: theme.text }]}>
            Loading book...
          </ThemedText>
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
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    opacity: 0.7,
  },
  errorText: {
    padding: 20,
    textAlign: "center",
    fontSize: 16,
    opacity: 0.8,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  webMessage: {
    padding: 20,
    textAlign: "center",
    opacity: 0.7,
  },
});
