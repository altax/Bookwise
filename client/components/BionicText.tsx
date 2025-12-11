import React, { useMemo } from "react";
import { Text, StyleSheet, TextStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface BionicTextProps {
  children: string;
  style?: TextStyle;
  enabled?: boolean;
  boldRatio?: number;
}

export function BionicText({
  children,
  style,
  enabled = true,
  boldRatio = 0.5,
}: BionicTextProps) {
  const { theme } = useTheme();

  const processedContent = useMemo(() => {
    if (!enabled) {
      return <Text style={[{ color: theme.text }, style]}>{children}</Text>;
    }

    const words = children.split(/(\s+)/);
    
    return words.map((word, index) => {
      if (/^\s+$/.test(word)) {
        return <Text key={index} style={[{ color: theme.text }, style]}>{word}</Text>;
      }

      const cleanWord = word.replace(/[^\p{L}\p{N}]/gu, "");
      
      if (cleanWord.length === 0) {
        return <Text key={index} style={[{ color: theme.text }, style]}>{word}</Text>;
      }

      const boldLength = Math.max(1, Math.ceil(cleanWord.length * boldRatio));
      
      let charIndex = 0;
      let boldCharsAdded = 0;
      const parts: { text: string; bold: boolean }[] = [];
      let currentPart = { text: "", bold: true };

      for (const char of word) {
        const isAlphanumeric = /[\p{L}\p{N}]/u.test(char);
        
        if (isAlphanumeric) {
          const shouldBeBold = boldCharsAdded < boldLength;
          
          if (currentPart.bold !== shouldBeBold && currentPart.text) {
            parts.push({ ...currentPart });
            currentPart = { text: char, bold: shouldBeBold };
          } else {
            currentPart.text += char;
            currentPart.bold = shouldBeBold;
          }
          
          if (shouldBeBold) boldCharsAdded++;
          charIndex++;
        } else {
          currentPart.text += char;
        }
      }

      if (currentPart.text) {
        parts.push(currentPart);
      }

      return (
        <Text key={index} style={[{ color: theme.text }, style]}>
          {parts.map((part, partIndex) => (
            <Text
              key={partIndex}
              style={part.bold ? styles.bold : undefined}
            >
              {part.text}
            </Text>
          ))}
        </Text>
      );
    });
  }, [children, enabled, boldRatio, theme.text, style]);

  return <Text style={[{ color: theme.text }, style]}>{processedContent}</Text>;
}

const styles = StyleSheet.create({
  bold: {
    fontWeight: "700",
  },
});
