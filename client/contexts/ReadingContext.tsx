import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ReadingDefaults, ThemeMode, AvailableFonts } from "@/constants/theme";

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUri?: string;
  fileUri: string;
  fileType: "epub" | "pdf" | "txt";
  progress: number;
  totalPages: number;
  currentPage: number;
  lastRead: number;
  addedAt: number;
  bookmarks: Bookmark[];
  notes: Note[];
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

interface ReadingSettings {
  fontSize: number;
  lineSpacing: number;
  marginHorizontal: number;
  fontFamily: string;
  themeMode: ThemeMode;
  autoTheme: boolean;
  hasSeenOnboarding: boolean;
}

interface ReadingContextType {
  books: Book[];
  currentBook: Book | null;
  settings: ReadingSettings;
  isLoading: boolean;
  addBook: (book: Omit<Book, "id" | "progress" | "currentPage" | "lastRead" | "addedAt" | "bookmarks" | "notes">) => Promise<void>;
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
}

const defaultSettings: ReadingSettings = {
  fontSize: ReadingDefaults.fontSize,
  lineSpacing: ReadingDefaults.lineSpacing,
  marginHorizontal: ReadingDefaults.marginHorizontal,
  fontFamily: AvailableFonts[0].value,
  themeMode: "light",
  autoTheme: true,
  hasSeenOnboarding: false,
};

const ReadingContext = createContext<ReadingContextType | undefined>(undefined);

const BOOKS_STORAGE_KEY = "@bookwise_books";
const SETTINGS_STORAGE_KEY = "@bookwise_settings";

export function ReadingProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [settings, setSettings] = useState<ReadingSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [booksData, settingsData] = await Promise.all([
        AsyncStorage.getItem(BOOKS_STORAGE_KEY),
        AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
      ]);

      if (booksData) {
        const parsedBooks = JSON.parse(booksData);
        const migratedBooks = parsedBooks.map((book: Book) => ({
          ...book,
          notes: book.notes || [],
        }));
        setBooks(migratedBooks);
      }
      if (settingsData) {
        setSettings({ ...defaultSettings, ...JSON.parse(settingsData) });
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

  const addBook = async (bookData: Omit<Book, "id" | "progress" | "currentPage" | "lastRead" | "addedAt" | "bookmarks" | "notes">) => {
    const newBook: Book = {
      ...bookData,
      id: Date.now().toString(),
      progress: 0,
      currentPage: 0,
      lastRead: Date.now(),
      addedAt: Date.now(),
      bookmarks: [],
      notes: [],
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

  return (
    <ReadingContext.Provider
      value={{
        books,
        currentBook,
        settings,
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
