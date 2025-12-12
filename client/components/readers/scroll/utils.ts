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

const createLine = (text: string, index: number, lineHeight: number): MeasuredLine => ({
  text,
  x: 0,
  y: index * lineHeight,
  width: 300,
  height: lineHeight,
  ascender: 0,
  descender: 0,
  capHeight: 0,
  xHeight: 0,
});

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
    const lineWords: string[] = [];
    let lineLength = 0;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const newLength = lineLength + (lineWords.length > 0 ? 1 : 0) + word.length;
      
      if (newLength > avgCharsPerLine && lineWords.length > 0) {
        lines.push(createLine(lineWords.join(" "), lines.length, lineHeight));
        lineWords.length = 0;
        lineLength = 0;
      }
      
      lineWords.push(word);
      lineLength += (lineWords.length > 1 ? 1 : 0) + word.length;
    }
    
    if (lineWords.length > 0) {
      lines.push(createLine(lineWords.join(" "), lines.length, lineHeight));
    }
  };

  if (paragraphs.length === 0) {
    const words = content.trim().split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) return [];
    processWords(words);
  } else {
    for (let i = 0; i < paragraphs.length; i++) {
      const words = paragraphs[i].trim().split(/\s+/).filter((w) => w.length > 0);
      processWords(words);
    }
  }

  return lines;
};

export const generateLinesFromContentAsync = async (
  content: string,
  lineHeight: number,
  avgCharsPerLine: number = 50,
  onFirstChunkReady?: (lines: MeasuredLine[]) => void,
  chunkSize: number = 30
): Promise<MeasuredLine[]> => {
  if (!content || content.trim().length === 0) return [];

  const yieldToMain = (): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, 0));
  };

  const words = content
    .replace(/\r\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) return [];

  const allLines: MeasuredLine[] = [];
  const lineWords: string[] = [];
  let lineLength = 0;
  let firstChunkSent = false;
  let wordsSinceYield = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const newLength = lineLength + (lineWords.length > 0 ? 1 : 0) + word.length;

    if (newLength > avgCharsPerLine && lineWords.length > 0) {
      allLines.push(createLine(lineWords.join(" "), allLines.length, lineHeight));
      lineWords.length = 0;
      lineLength = 0;

      if (!firstChunkSent && allLines.length >= chunkSize) {
        firstChunkSent = true;
        onFirstChunkReady?.(allLines.slice());
        await yieldToMain();
      }
    }

    lineWords.push(word);
    lineLength += (lineWords.length > 1 ? 1 : 0) + word.length;
    wordsSinceYield++;

    if (wordsSinceYield >= 500) {
      wordsSinceYield = 0;
      await yieldToMain();
    }
  }

  if (lineWords.length > 0) {
    allLines.push(createLine(lineWords.join(" "), allLines.length, lineHeight));
  }

  if (!firstChunkSent && allLines.length > 0) {
    onFirstChunkReady?.(allLines);
  }

  return allLines;
};

export const createTextStyle = (settings: ReaderSettings, lineHeight: number, textColor: string) => ({
  fontSize: settings.fontSize,
  lineHeight: lineHeight,
  fontFamily: getFontFamily(settings.fontFamily),
  color: textColor,
  letterSpacing: settings.letterSpacing,
  textAlign: settings.textAlignment as "left" | "justify",
});
