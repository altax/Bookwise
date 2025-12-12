import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DictionaryWord {
  id: string;
  word: string;
  translation?: string;
  note?: string;
  bookId?: string;
  bookTitle?: string;
  createdAt: number;
}

interface DictionaryContextType {
  words: DictionaryWord[];
  isLoading: boolean;
  addWord: (word: Omit<DictionaryWord, "id" | "createdAt">) => Promise<void>;
  removeWord: (id: string) => Promise<void>;
  updateWord: (id: string, updates: Partial<DictionaryWord>) => Promise<void>;
  hasWord: (word: string) => boolean;
  getWord: (word: string) => DictionaryWord | undefined;
}

const DictionaryContext = createContext<DictionaryContextType | undefined>(undefined);

const DICTIONARY_STORAGE_KEY = "@bookwise_dictionary";

export function DictionaryProvider({ children }: { children: ReactNode }) {
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDictionary();
  }, []);

  const loadDictionary = async () => {
    try {
      const stored = await AsyncStorage.getItem(DICTIONARY_STORAGE_KEY);
      if (stored) {
        setWords(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading dictionary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDictionary = async (newWords: DictionaryWord[]) => {
    try {
      await AsyncStorage.setItem(DICTIONARY_STORAGE_KEY, JSON.stringify(newWords));
    } catch (error) {
      console.error("Error saving dictionary:", error);
    }
  };

  const addWord = useCallback(async (wordData: Omit<DictionaryWord, "id" | "createdAt">) => {
    const cleanWord = wordData.word.toLowerCase().trim();
    
    const existingIndex = words.findIndex(w => w.word.toLowerCase() === cleanWord);
    if (existingIndex !== -1) {
      return;
    }

    const newWord: DictionaryWord = {
      ...wordData,
      word: cleanWord,
      id: `word-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };

    const newWords = [newWord, ...words];
    setWords(newWords);
    await saveDictionary(newWords);
  }, [words]);

  const removeWord = useCallback(async (id: string) => {
    const newWords = words.filter(w => w.id !== id);
    setWords(newWords);
    await saveDictionary(newWords);
  }, [words]);

  const updateWord = useCallback(async (id: string, updates: Partial<DictionaryWord>) => {
    const newWords = words.map(w => 
      w.id === id ? { ...w, ...updates } : w
    );
    setWords(newWords);
    await saveDictionary(newWords);
  }, [words]);

  const hasWord = useCallback((word: string) => {
    const cleanWord = word.toLowerCase().trim();
    return words.some(w => w.word.toLowerCase() === cleanWord);
  }, [words]);

  const getWord = useCallback((word: string) => {
    const cleanWord = word.toLowerCase().trim();
    return words.find(w => w.word.toLowerCase() === cleanWord);
  }, [words]);

  return (
    <DictionaryContext.Provider
      value={{
        words,
        isLoading,
        addWord,
        removeWord,
        updateWord,
        hasWord,
        getWord,
      }}
    >
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary() {
  const context = useContext(DictionaryContext);
  if (context === undefined) {
    throw new Error("useDictionary must be used within a DictionaryProvider");
  }
  return context;
}
