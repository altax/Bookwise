import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useDictionary } from "@/contexts/DictionaryContext";

interface WordModalProps {
  visible: boolean;
  onClose: () => void;
  word: string;
  bookId?: string;
  bookTitle?: string;
  theme: {
    backgroundDefault: string;
    backgroundRoot: string;
    text: string;
    secondaryText: string;
    accent: string;
    border: string;
  };
}

export function WordModal({
  visible,
  onClose,
  word,
  bookId,
  bookTitle,
  theme,
}: WordModalProps) {
  const insets = useSafeAreaInsets();
  const { addWord, hasWord, removeWord, getWord } = useDictionary();
  const [translation, setTranslation] = useState("");
  const [note, setNote] = useState("");
  
  const isInDictionary = hasWord(word);
  const existingWord = getWord(word);

  useEffect(() => {
    if (existingWord) {
      setTranslation(existingWord.translation || "");
      setNote(existingWord.note || "");
    } else {
      setTranslation("");
      setNote("");
    }
  }, [word, existingWord]);

  const handleSave = async () => {
    if (isInDictionary && existingWord) {
      await removeWord(existingWord.id);
    }
    
    await addWord({
      word: word.toLowerCase().trim(),
      translation,
      note,
      bookId,
      bookTitle,
    });
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleRemove = async () => {
    if (existingWord) {
      await removeWord(existingWord.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={styles.header}>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {isInDictionary ? "Edit Word" : "Add to Dictionary"}
            </ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View
            style={[
              styles.wordContainer,
              { backgroundColor: theme.backgroundRoot, borderColor: theme.border },
            ]}
          >
            <ThemedText style={[styles.wordText, { color: theme.accent }]}>
              {word}
            </ThemedText>
            {isInDictionary && (
              <View style={[styles.inDictionaryBadge, { backgroundColor: theme.accent + "20" }]}>
                <Feather name="check" size={12} color={theme.accent} />
                <ThemedText style={[styles.badgeText, { color: theme.accent }]}>
                  In dictionary
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.secondaryText }]}>
              Translation (optional)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundRoot,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Enter translation..."
              placeholderTextColor={theme.secondaryText}
              value={translation}
              onChangeText={setTranslation}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.secondaryText }]}>
              Note (optional)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.noteInput,
                {
                  backgroundColor: theme.backgroundRoot,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Add a note about this word..."
              placeholderTextColor={theme.secondaryText}
              multiline
              value={note}
              onChangeText={setNote}
            />
          </View>

          <View style={styles.actions}>
            {isInDictionary && (
              <Pressable
                style={[styles.removeButton, { borderColor: "#E53935" }]}
                onPress={handleRemove}
              >
                <Feather name="trash-2" size={18} color="#E53935" />
                <ThemedText style={[styles.removeButtonText, { color: "#E53935" }]}>
                  Remove
                </ThemedText>
              </Pressable>
            )}
            <Pressable
              style={[styles.saveButton, { backgroundColor: theme.accent }]}
              onPress={handleSave}
            >
              <Feather name="book" size={18} color="#FFFFFF" />
              <ThemedText style={styles.saveButtonText}>
                {isInDictionary ? "Update" : "Add to Dictionary"}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  wordContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wordText: {
    fontSize: 22,
    fontWeight: "600",
  },
  inDictionaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  removeButtonText: {
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
