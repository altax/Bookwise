import React from "react";
import { Platform, Text } from "react-native";
import type { MeasuredLine, ReaderSettings } from "./types";

export const getFontFamily = (fontFamily: string): string => {
  switch (fontFamily) {
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

export const renderBionicWord = (word: string, key: string | number): React.ReactNode => {
  if (/^\s+$/.test(word)) {
    return React.createElement(Text, { key }, word);
  }
  const midpoint = Math.ceil(word.length / 2);
  const boldPart = word.substring(0, midpoint);
  const normalPart = word.substring(midpoint);
  return React.createElement(
    Text,
    { key },
    React.createElement(Text, { style: { fontWeight: "bold" } }, boldPart),
    normalPart
  );
};

export const generateLinesFromContent = (
  content: string,
  lineHeight: number,
  avgCharsPerLine: number = 50
): MeasuredLine[] => {
  if (!content || content.trim().length === 0) return [];

  const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const paragraphs = normalizedContent.split(/\n+/).filter((p) => p.trim().length > 0);
  const lines: MeasuredLine[] = [];

  const processWords = (words: string[]) => {
    let currentLine = "";
    words.forEach((word) => {
      if ((currentLine + " " + word).length > avgCharsPerLine && currentLine.length > 0) {
        lines.push({
          text: currentLine.trim(),
          x: 0,
          y: lines.length * lineHeight,
          width: 300,
          height: lineHeight,
          ascender: 0,
          descender: 0,
          capHeight: 0,
          xHeight: 0,
        });
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + " " + word : word;
      }
    });
    if (currentLine.trim().length > 0) {
      lines.push({
        text: currentLine.trim(),
        x: 0,
        y: lines.length * lineHeight,
        width: 300,
        height: lineHeight,
        ascender: 0,
        descender: 0,
        capHeight: 0,
        xHeight: 0,
      });
    }
  };

  if (paragraphs.length === 0) {
    const words = content
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    if (words.length === 0) return [];
    processWords(words);
  } else {
    paragraphs.forEach((paragraph) => {
      const words = paragraph
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      processWords(words);
    });
  }

  return lines;
};

export const createTextStyle = (settings: ReaderSettings, lineHeight: number, textColor: string) => ({
  fontSize: settings.fontSize,
  lineHeight: lineHeight,
  fontFamily: getFontFamily(settings.fontFamily),
  color: textColor,
  letterSpacing: settings.letterSpacing,
  textAlign: settings.textAlignment as "left" | "justify",
});
