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

interface NoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  onDelete?: () => void;
  selectedText: string;
  initialContent?: string;
  theme: {
    backgroundDefault: string;
    backgroundRoot: string;
    text: string;
    secondaryText: string;
    accent: string;
    border: string;
  };
}

const highlightColors = ["#FFEB3B", "#4CAF50", "#2196F3", "#E91E63", "#FF9800"];

export function NoteModal({
  visible,
  onClose,
  onSave,
  onDelete,
  selectedText,
  initialContent = "",
  theme,
}: NoteModalProps) {
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState(initialContent);
  const [selectedColor, setSelectedColor] = useState(highlightColors[0]);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = () => {
    onSave(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setContent("");
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setContent("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
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
              {initialContent ? "Edit Note" : "Add Note"}
            </ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          {selectedText ? (
            <View
              style={[
                styles.selectedTextContainer,
                { backgroundColor: theme.backgroundRoot, borderColor: theme.border },
              ]}
            >
              <ThemedText
                style={[styles.selectedText, { color: theme.secondaryText }]}
                numberOfLines={3}
              >
                "{selectedText}"
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.colorPicker}>
            {highlightColors.map((color) => (
              <Pressable
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundRoot,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Write your note..."
            placeholderTextColor={theme.secondaryText}
            multiline
            value={content}
            onChangeText={setContent}
            autoFocus
          />

          <View style={styles.actions}>
            {onDelete ? (
              <Pressable
                style={[styles.deleteButton, { borderColor: "#E53935" }]}
                onPress={handleDelete}
              >
                <Feather name="trash-2" size={18} color="#E53935" />
                <ThemedText style={[styles.deleteButtonText, { color: "#E53935" }]}>
                  Delete
                </ThemedText>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.saveButton, { backgroundColor: theme.accent }]}
              onPress={handleSave}
            >
              <ThemedText style={styles.saveButtonText}>Save Note</ThemedText>
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
  selectedTextContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  selectedText: {
    fontStyle: "italic",
    fontSize: 14,
  },
  colorPicker: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: Spacing.lg,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  deleteButtonText: {
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
