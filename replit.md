# Bookwise - Minimalist Book Reader

## Overview
Bookwise is a minimalist mobile book reader app built with Expo and React Native. The app focuses on providing an immersive, distraction-free reading experience with customizable settings.

## Current State
MVP implemented with:
- Library screen for managing book collection
- Book import via document picker (EPUB, PDF, TXT)
- Full-screen reading interface with gesture controls
- Theme customization (Day, Night, Sepia)
- Font size, line spacing, and margin adjustments
- Reading progress tracking
- Bookmarks functionality
- Local data persistence via AsyncStorage

## Project Architecture

### Structure
```
client/
  components/       # Reusable UI components
  constants/        # Theme and design tokens
  contexts/         # React Context providers (ReadingContext)
  hooks/            # Custom hooks
  navigation/       # React Navigation setup
  screens/          # Screen components
server/             # Express backend
```

### Navigation
- Tab Navigation: Library, Settings
- Stack Navigation: Reading screen (modal presentation)

### Key Technologies
- Expo SDK 54
- React Navigation 7
- React Native Reanimated
- AsyncStorage for persistence
- expo-document-picker for file imports

## Design System
- Colors: Day (#FFFFFF), Night (#1A1A1A), Sepia (#F4ECD8)
- Accent: #4A90E2 (light) / #5DADE2 (dark)
- Icons: Feather icons from @expo/vector-icons
- Typography: System fonts with adjustable sizes (12-32pt)

## Recent Changes
- Initial MVP implementation (December 2024)
- Created Library, Reading, and Settings screens
- Implemented ReadingContext for state management
- Added book import, progress tracking, and bookmarks

## User Preferences
- No authentication required (local-first app)
- Minimalist, gesture-based interface
- Focus on reading experience over features

## Future Enhancements
- Note-taking functionality
- In-text search with highlighting
- Cloud synchronization with Supabase
- Export bookmarks/notes (JSON/CSV)
- EPUB/PDF full rendering support
