import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ReadingDefaults, ThemeMode, AvailableFonts, ReadingMode, ReadingModes, ScrollMode, TapScrollLinePositionType, AutoScrollDefaults, TapScrollDefaults } from "@/constants/theme";

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUri?: string;
  fileUri: string;
  fileType: "epub" | "pdf" | "txt" | "fb2";
  progress: number;
  totalPages: number;
  currentPage: number;
  lastRead: number;
  addedAt: number;
  bookmarks: Bookmark[];
  notes: Note[];
  totalReadingTime: number;
  sessions: ReadingSession[];
}

export interface Bookmark {
  id: string;
  page: number;
  position: number;
  createdAt: number;
}

export interface Note {
  id: string;
  page: number;
  position: number;
  selectedText: string;
  content: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface ReadingSession {
  id: string;
  startTime: number;
  endTime: number;
  pagesRead: number;
  wordsRead: number;
}

export interface ReadingStats {
  totalBooksRead: number;
  totalPagesRead: number;
  totalReadingTime: number;
  averageReadingSpeed: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null;
  dailyGoal: number;
  todayReadingTime: number;
  weeklyReadingTime: number[];
}

export type AppTheme = "light" | "dark";

interface ReadingSettings {
  fontSize: number;
  lineSpacing: number;
  marginHorizontal: number;
  letterSpacing: number;
  paragraphSpacing: number;
  fontFamily: string;
  themeMode: ThemeMode;
  autoTheme: boolean;
  hasSeenOnboarding: boolean;
  bionicReading: boolean;
  focusMode: boolean;
  readingMode: ReadingMode;
  scrollMode: ScrollMode;
  showReadingProgress: boolean;
  showTimeEstimate: boolean;
  hapticFeedback: boolean;
  animationsEnabled: boolean;
  dailyGoal: number;
  textAlignment: "left" | "justify";
  autoScrollSpeed: number;
  tapScrollAnimationSpeed: number;
  tapScrollLinePosition: TapScrollLinePositionType;
  appTheme: AppTheme;
  autoAppTheme: boolean;
}

interface ReadingContextType {
  books: Book[];
  currentBook: Book | null;
  settings: ReadingSettings;
  stats: ReadingStats;
  isLoading: boolean;
  addBook: (book: Omit<Book, "id" | "progress" | "currentPage" | "lastRead" | "addedAt" | "bookmarks" | "notes" | "totalReadingTime" | "sessions">) => Promise<void>;
  removeBook: (id: string) => Promise<void>;
  setCurrentBook: (book: Book | null) => void;
  updateBookProgress: (id: string, currentPage: number, totalPages: number) => Promise<void>;
  addBookmark: (bookId: string, page: number, position: number) => Promise<void>;
  removeBookmark: (bookId: string, bookmarkId: string) => Promise<void>;
  addNote: (bookId: string, note: Omit<Note, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateNote: (bookId: string, noteId: string, content: string) => Promise<void>;
  removeNote: (bookId: string, noteId: string) => Promise<void>;
  updateSettings: (newSettings: Partial<ReadingSettings>) => Promise<void>;
  exportData: (bookId?: string) => Promise<string>;
  startReadingSession: (bookId: string) => void;
  endReadingSession: (bookId: string, pagesRead: number, wordsRead: number) => Promise<void>;
  updateStats: (updates: Partial<ReadingStats>) => Promise<void>;
  applyReadingMode: (mode: ReadingMode) => Promise<void>;
}

const defaultSettings: ReadingSettings = {
  fontSize: ReadingDefaults.fontSize,
  lineSpacing: ReadingDefaults.lineSpacing,
  marginHorizontal: ReadingDefaults.marginHorizontal,
  letterSpacing: ReadingDefaults.letterSpacing,
  paragraphSpacing: ReadingDefaults.paragraphSpacing,
  fontFamily: AvailableFonts[0].value,
  themeMode: "light",
  autoTheme: true,
  hasSeenOnboarding: false,
  bionicReading: false,
  focusMode: false,
  readingMode: "standard",
  scrollMode: "seamless",
  showReadingProgress: true,
  showTimeEstimate: true,
  hapticFeedback: true,
  animationsEnabled: true,
  dailyGoal: 30,
  textAlignment: "left",
  autoScrollSpeed: AutoScrollDefaults.defaultSpeed,
  tapScrollAnimationSpeed: TapScrollDefaults.defaultAnimationSpeed,
  tapScrollLinePosition: "top",
  appTheme: "light",
  autoAppTheme: true,
};

const defaultStats: ReadingStats = {
  totalBooksRead: 0,
  totalPagesRead: 0,
  totalReadingTime: 0,
  averageReadingSpeed: 250,
  currentStreak: 0,
  longestStreak: 0,
  lastReadDate: null,
  dailyGoal: 30,
  todayReadingTime: 0,
  weeklyReadingTime: [0, 0, 0, 0, 0, 0, 0],
};

const ReadingContext = createContext<ReadingContextType | undefined>(undefined);

const BOOKS_STORAGE_KEY = "@bookwise_books";
const SETTINGS_STORAGE_KEY = "@bookwise_settings";
const STATS_STORAGE_KEY = "@bookwise_stats";

export function ReadingProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [settings, setSettings] = useState<ReadingSettings>(defaultSettings);
  const [stats, setStats] = useState<ReadingStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<{ bookId: string; startTime: number } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      updateDailyStats();
    }
  }, [isLoading]);

  const updateDailyStats = useCallback(() => {
    const today = new Date().toDateString();
    
    setStats(prevStats => {
      if (prevStats.lastReadDate === today) {
        return prevStats;
      }
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      let newStreak = prevStats.currentStreak;
      if (prevStats.lastReadDate !== yesterday.toDateString() && prevStats.lastReadDate) {
        newStreak = 0;
      }
      
      const newStats = {
        ...prevStats,
        currentStreak: newStreak,
        todayReadingTime: 0,
        weeklyReadingTime: [...prevStats.weeklyReadingTime.slice(1), 0],
      };
      
      AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(newStats)).catch(console.error);
      
      return newStats;
    });
  }, []);

  const loadData = async () => {
    try {
      const [booksData, settingsData, statsData] = await Promise.all([
        AsyncStorage.getItem(BOOKS_STORAGE_KEY),
        AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
        AsyncStorage.getItem(STATS_STORAGE_KEY),
      ]);

      if (booksData) {
        const parsedBooks = JSON.parse(booksData);
        const migratedBooks = parsedBooks.map((book: Book) => ({
          ...book,
          notes: book.notes || [],
          totalReadingTime: book.totalReadingTime || 0,
          sessions: book.sessions || [],
        }));
        setBooks(migratedBooks);
      }
      if (settingsData) {
        setSettings({ ...defaultSettings, ...JSON.parse(settingsData) });
      }
      if (statsData) {
        setStats({ ...defaultStats, ...JSON.parse(statsData) });
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBooks = async (newBooks: Book[]) => {
    try {
      await AsyncStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(newBooks));
    } catch (error) {
      console.error("Failed to save books:", error);
    }
  };

  const saveSettings = async (newSettings: ReadingSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const saveStats = async (newStats: ReadingStats) => {
    try {
      await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(newStats));
    } catch (error) {
      console.error("Failed to save stats:", error);
    }
  };

  const addBook = async (bookData: Omit<Book, "id" | "progress" | "currentPage" | "lastRead" | "addedAt" | "bookmarks" | "notes" | "totalReadingTime" | "sessions">) => {
    const newBook: Book = {
      ...bookData,
      id: Date.now().toString(),
      progress: 0,
      currentPage: 0,
      lastRead: Date.now(),
      addedAt: Date.now(),
      bookmarks: [],
      notes: [],
      totalReadingTime: 0,
      sessions: [],
    };
    const newBooks = [newBook, ...books];
    setBooks(newBooks);
    await saveBooks(newBooks);
  };

  const removeBook = async (id: string) => {
    const newBooks = books.filter((book) => book.id !== id);
    setBooks(newBooks);
    if (currentBook?.id === id) {
      setCurrentBook(null);
    }
    await saveBooks(newBooks);
  };

  const updateBookProgress = async (id: string, currentPage: number, totalPages: number) => {
    const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
    const newBooks = books.map((book) =>
      book.id === id
        ? { ...book, currentPage, totalPages, progress, lastRead: Date.now() }
        : book
    );
    setBooks(newBooks);
    if (currentBook?.id === id) {
      setCurrentBook({ ...currentBook, currentPage, totalPages, progress, lastRead: Date.now() });
    }
    await saveBooks(newBooks);
  };

  const addBookmark = async (bookId: string, page: number, position: number) => {
    const bookmark: Bookmark = {
      id: Date.now().toString(),
      page,
      position,
      createdAt: Date.now(),
    };
    const newBooks = books.map((book) =>
      book.id === bookId
        ? { ...book, bookmarks: [...book.bookmarks, bookmark] }
        : book
    );
    setBooks(newBooks);
    if (currentBook?.id === bookId) {
      setCurrentBook({ ...currentBook, bookmarks: [...currentBook.bookmarks, bookmark] });
    }
    await saveBooks(newBooks);
  };

  const removeBookmark = async (bookId: string, bookmarkId: string) => {
    const newBooks = books.map((book) =>
      book.id === bookId
        ? { ...book, bookmarks: book.bookmarks.filter((b) => b.id !== bookmarkId) }
        : book
    );
    setBooks(newBooks);
    if (currentBook?.id === bookId) {
      setCurrentBook({
        ...currentBook,
        bookmarks: currentBook.bookmarks.filter((b) => b.id !== bookmarkId),
      });
    }
    await saveBooks(newBooks);
  };

  const addNote = async (bookId: string, noteData: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    const note: Note = {
      ...noteData,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const newBooks = books.map((book) =>
      book.id === bookId
        ? { ...book, notes: [...book.notes, note] }
        : book
    );
    setBooks(newBooks);
    if (currentBook?.id === bookId) {
      setCurrentBook({ ...currentBook, notes: [...currentBook.notes, note] });
    }
    await saveBooks(newBooks);
  };

  const updateNote = async (bookId: string, noteId: string, content: string) => {
    const newBooks = books.map((book) =>
      book.id === bookId
        ? {
            ...book,
            notes: book.notes.map((n) =>
              n.id === noteId ? { ...n, content, updatedAt: Date.now() } : n
            ),
          }
        : book
    );
    setBooks(newBooks);
    if (currentBook?.id === bookId) {
      setCurrentBook({
        ...currentBook,
        notes: currentBook.notes.map((n) =>
          n.id === noteId ? { ...n, content, updatedAt: Date.now() } : n
        ),
      });
    }
    await saveBooks(newBooks);
  };

  const removeNote = async (bookId: string, noteId: string) => {
    const newBooks = books.map((book) =>
      book.id === bookId
        ? { ...book, notes: book.notes.filter((n) => n.id !== noteId) }
        : book
    );
    setBooks(newBooks);
    if (currentBook?.id === bookId) {
      setCurrentBook({
        ...currentBook,
        notes: currentBook.notes.filter((n) => n.id !== noteId),
      });
    }
    await saveBooks(newBooks);
  };

  const exportData = async (bookId?: string) => {
    const booksToExport = bookId ? books.filter((b) => b.id === bookId) : books;
    
    const exportedData = booksToExport.map((book) => ({
      title: book.title,
      author: book.author,
      progress: `${Math.round(book.progress)}%`,
      totalReadingTime: `${Math.round(book.totalReadingTime / 60)} minutes`,
      bookmarks: book.bookmarks.map((b) => ({
        page: b.page,
        createdAt: new Date(b.createdAt).toISOString(),
      })),
      notes: book.notes.map((n) => ({
        page: n.page,
        selectedText: n.selectedText,
        content: n.content,
        createdAt: new Date(n.createdAt).toISOString(),
      })),
    }));

    return JSON.stringify(exportedData, null, 2);
  };

  const updateSettings = async (newSettings: Partial<ReadingSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await saveSettings(updated);
  };

  const startReadingSession = (bookId: string) => {
    setActiveSession({ bookId, startTime: Date.now() });
  };

  const endReadingSession = async (bookId: string, pagesRead: number, wordsRead: number) => {
    if (!activeSession || activeSession.bookId !== bookId) return;

    const endTime = Date.now();
    const duration = (endTime - activeSession.startTime) / 1000;

    const session: ReadingSession = {
      id: Date.now().toString(),
      startTime: activeSession.startTime,
      endTime,
      pagesRead,
      wordsRead,
    };

    const newBooks = books.map((book) =>
      book.id === bookId
        ? {
            ...book,
            totalReadingTime: book.totalReadingTime + duration,
            sessions: [...book.sessions, session],
          }
        : book
    );
    setBooks(newBooks);
    await saveBooks(newBooks);

    const today = new Date().toDateString();
    const newTodayTime = stats.todayReadingTime + duration;
    const newWeeklyTime = [...stats.weeklyReadingTime];
    newWeeklyTime[6] = (newWeeklyTime[6] || 0) + duration;

    let newStreak = stats.currentStreak;
    if (stats.lastReadDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (stats.lastReadDate === yesterday.toDateString() || !stats.lastReadDate) {
        newStreak = stats.currentStreak + 1;
      } else {
        newStreak = 1;
      }
    }

    const newStats: ReadingStats = {
      ...stats,
      totalPagesRead: stats.totalPagesRead + pagesRead,
      totalReadingTime: stats.totalReadingTime + duration,
      todayReadingTime: newTodayTime,
      weeklyReadingTime: newWeeklyTime,
      lastReadDate: today,
      currentStreak: newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak),
      averageReadingSpeed: wordsRead > 0 && duration > 0 
        ? Math.round(wordsRead / (duration / 60))
        : stats.averageReadingSpeed,
    };
    setStats(newStats);
    await saveStats(newStats);

    setActiveSession(null);
  };

  const updateStats = async (updates: Partial<ReadingStats>) => {
    const newStats = { ...stats, ...updates };
    setStats(newStats);
    await saveStats(newStats);
  };

  const applyReadingMode = async (mode: ReadingMode) => {
    const modeSettings = ReadingModes[mode];
    await updateSettings({
      readingMode: mode,
      fontSize: modeSettings.fontSize,
      lineSpacing: modeSettings.lineSpacing,
      letterSpacing: modeSettings.letterSpacing,
    });
  };

  return (
    <ReadingContext.Provider
      value={{
        books,
        currentBook,
        settings,
        stats,
        isLoading,
        addBook,
        removeBook,
        setCurrentBook,
        updateBookProgress,
        addBookmark,
        removeBookmark,
        addNote,
        updateNote,
        removeNote,
        updateSettings,
        exportData,
        startReadingSession,
        endReadingSession,
        updateStats,
        applyReadingMode,
      }}
    >
      {children}
    </ReadingContext.Provider>
  );
}

export function useReading() {
  const context = useContext(ReadingContext);
  if (context === undefined) {
    throw new Error("useReading must be used within a ReadingProvider");
  }
  return context;
}
