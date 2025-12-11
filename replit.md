# Bookwise - Minimalist Book Reader

## Overview
Bookwise is a minimalist mobile book reader app built with Expo and React Native. The app focuses on providing an immersive, distraction-free reading experience with customizable settings.

## Current State
Full MVP implemented with:
- Library screen for managing book collection (grid/list view toggle, swipe-to-delete)
- Book import via document picker (EPUB, PDF, TXT)
- Full-screen reading interface with gesture controls
- Theme customization (Day, Night, Sepia) with auto-theme option
- Font size, line spacing, font family, and margin adjustments
- Reading progress tracking with resume functionality
- Bookmarks and notes/annotations system
- In-text search with highlighting (SearchModal)
- Onboarding screen for first-time users
- Export functionality (JSON/CSV via Share API)
- Local data persistence via AsyncStorage

## Project Architecture

### Structure
```
client/
  components/       # Reusable UI components (NoteModal, SearchModal, etc.)
  constants/        # Theme and design tokens
  contexts/         # React Context providers (ReadingContext)
  hooks/            # Custom hooks (useTheme)
  navigation/       # React Navigation setup (RootStackNavigator, MainTabNavigator)
  screens/          # Screen components (Library, Reading, Settings, Onboarding)
server/             # Express backend
```

### Navigation
- Tab Navigation: Library, Settings
- Stack Navigation: Reading screen (modal presentation), TableOfContents
- Onboarding: Shows once on first app launch

### Key Technologies
- Expo SDK 54
- React Navigation 7
- React Native Reanimated
- React Native Gesture Handler
- AsyncStorage for persistence
- expo-document-picker for file imports
- expo-haptics for tactile feedback

## Design System
- Colors: Day (#FFFFFF), Night (#1A1A1A), Sepia (#F4ECD8)
- Accent: #4A90E2 (light) / #5DADE2 (dark)
- Icons: Feather icons from @expo/vector-icons
- Typography: System fonts with adjustable sizes (12-32pt)
- Font families: System, Serif (Georgia), Mono (Courier)

## Features

### Library Management
- Grid and list view toggle
- Swipe-to-delete functionality
- Book cover display with metadata
- Reading progress indicators

### Reading Experience
- Tap gestures for page navigation
- Long-press for note annotations
- Bookmarks with quick access
- Search with text highlighting
- Table of contents navigation

### Notes & Annotations
- Add notes to selected text
- View and manage notes per book
- Edit and delete notes

### Data Export
- Export bookmarks and notes to JSON
- Export bookmarks and notes to CSV
- Uses native Share API for compatibility

### Settings
- Theme selection (Day/Night/Sepia)
- Auto-theme based on system preference
- Font size adjustment (12-32pt)
- Line height adjustment (1.0-2.5x)
- Font family selection
- Margin customization

## Recent Changes
- December 2024: Initial MVP implementation
- December 2024: Added notes/annotations system with NoteModal
- December 2024: Implemented search functionality with SearchModal
- December 2024: Added export feature (JSON/CSV) in Settings
- December 2024: Created onboarding screen for first-time users
- December 2024: Enhanced LibraryScreen with grid/list toggle and swipe-to-delete
- December 2024: Fixed export implementation using Share API instead of FileSystem

## User Preferences
- No authentication required (local-first app)
- Minimalist, gesture-based interface
- Focus on reading experience over features
- Haptic feedback for interactions

## Running the App
- Scan the QR code with Expo Go (Android) or Camera app (iOS)
- Or use the web preview at localhost:8081

## Future Enhancements
- Cloud synchronization (optional)
- EPUB/PDF full rendering support
- Reading statistics and goals
- Book organization with tags/collections
