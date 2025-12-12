# Bookwise - Premium Book Reader

## Overview
Bookwise is a premium mobile book reader app built with Expo and React Native. The app provides an award-winning reading experience with cognitive science-based optimizations, modern glassmorphism design, and unique features like Bionic Reading mode.

## Current State
Full MVP with premium v2.0 features:
- Library screen for managing book collection (grid/list view toggle, swipe-to-delete)
- Book import via document picker (EPUB, PDF, TXT)
- Full-screen reading interface with gesture controls
- **6 Premium Themes**: Day, Night, Paper (Sepia), Dusk, AMOLED, Forest
- **Bionic Reading Mode**: Bold first half of words for faster comprehension
- **Focus Mode**: Zen UI with reading timer and break reminders
- **Reading Intelligence**: Progress tracking, daily streaks, session analytics
- **Glassmorphism Design**: Award-level UI with glass cards and animations
- Cognitive science typography defaults (66 chars, 1.6 line spacing)
- Font size, line spacing, letter spacing, font family, and margin adjustments
- Reading modes presets (Standard, Comfortable, Compact, Focus)
- Bookmarks and notes/annotations system
- In-text search with highlighting
- Onboarding screen for first-time users
- Export functionality (JSON/CSV via Share API)
- Local data persistence via AsyncStorage

## Project Architecture

### Structure
```
client/
  components/       # Reusable UI components
    - GlassCard.tsx        # Glassmorphism container
    - BionicText.tsx       # Speed reading text
    - BookmarkRibbon.tsx   # Animated bookmark
    - ProgressRing.tsx     # Circular progress
    - Skeleton.tsx         # Loading placeholders
    - ReadingTimer.tsx     # Focus mode timer
    - NoteModal.tsx        # Note annotation modal
    - SearchModal.tsx      # In-text search
    readers/               # Book reader components
      - EpubReader.tsx     # EPUB display (uses epubjs)
      - PdfReader.tsx      # PDF display
      - UnifiedScrollReader.tsx  # Wrapper for scroll modes
      scroll/              # Scroll mode implementations
        - types.ts         # Shared types
        - utils.ts         # Shared utilities
        - SeamlessScrollReader.tsx  # Manual scrolling
        - AutoScrollReader.tsx      # Auto-scroll mode
        - KaraokeReader.tsx         # Karaoke mode
  constants/
    - theme.ts             # Design tokens, colors, typography
  contexts/
    - ReadingContext.tsx   # Global state, reading stats
  hooks/
    - useTheme.ts          # Theme hook with dark mode detection
  navigation/
    - RootStackNavigator.tsx
    - MainTabNavigator.tsx
  screens/
    - LibraryScreen.tsx    # Book collection
    - ReadingScreen.tsx    # Main reader
    - SettingsScreen.tsx   # Premium settings UI
    - OnboardingScreen.tsx
server/
  - index.ts              # Express backend
```

### Navigation
- Tab Navigation: Library, Settings
- Stack Navigation: Reading screen (modal presentation), TableOfContents
- Onboarding: Shows once on first app launch

### Key Technologies
- Expo SDK 54
- React Navigation 7
- React Native Reanimated (animations)
- React Native Gesture Handler
- expo-haptics for tactile feedback
- AsyncStorage for persistence

## Design System

### Premium Themes
1. **Day** - Clean white (#FAFAFA), purple accent (#6366F1)
2. **Night** - Deep dark (#0A0A0F), indigo accent (#818CF8)
3. **Paper** - Warm sepia (#F8F4EC), tan accent (#A0785C)
4. **Dusk** - Purple night (#1A1625), violet accent (#B794F6)
5. **AMOLED** - Pure black (#000000), blue accent (#3B82F6)
6. **Forest** - Green dark (#0F1A14), green accent (#4ADE80)

### Typography
- Reading defaults: 18pt, 1.6 line height, 0.2px letter spacing
- Optimal line length: 66 characters
- Font families: System, Georgia, Times, Palatino

### Motion Design
- Spring animations with configurable damping
- Page transitions under 300ms
- Subtle micro-interactions

### Glassmorphism
- Glass cards with blur effects
- Animated borders and shadows
- Depth through transparency

## Premium Features

### Bionic Reading Mode
- Bolds first half of each word
- Improves reading speed by creating fixation points
- Based on cognitive science research

### Focus Studio
- Minimal zen UI during reading
- Built-in reading timer
- Break reminders (Pomodoro-style)
- Haptic feedback notifications

### Reading Intelligence
- Progress ring visualization
- Daily reading time tracking
- Streak system for motivation
- Session-based analytics

### Reading Modes (Presets)
1. **Standard** - Default balanced settings
2. **Comfortable** - Larger text, more spacing
3. **Compact** - Dense layout for more content
4. **Focus** - Minimal distractions, timer enabled

## Recent Changes
- December 2024: **READER UI REDESIGN v1**:
  - Redesigned reading screen layout with dedicated zones: header, content, footer
  - Timer now has its own dedicated space in header - text cannot overlap into timer area
  - All control buttons moved to footer zone outside the text area
  - Text content has its own dedicated space with no UI overlapping
  - Back button and settings button in header, action buttons (bookmark, notes, search, TOC) in footer
  - Page info and remaining time shown in footer left side
  - Progress bar integrated into footer
  - Focus mode simplified with clean header/footer zones
  - Scroll readers updated with reduced padding since layout managed by parent
- December 2024: **KARAOKE MODE IMPROVEMENTS v3**:
  - Fixed long line rendering - increased line spacing to prevent overlapping when text wraps
  - Added rewind slider at bottom for quick navigation to any line
  - Added visibility control for upcoming lines (adjustable brightness/opacity in settings)
  - Added manual/auto advance toggle with configurable speed (0.5-5 lines/sec)
  - Added playback controls (pause/resume) for auto-advance mode
- December 2024: **AUTO SCROLL FIX**: Fixed auto scroll resuming after closing settings panel
- December 2024: **LAZY LOADING**: Implemented progressive content loading for seamless and auto scroll modes (like karaoke), reducing initial load time for large books
- December 2024: **KARAOKE MODE FIX v2**: Fixed text truncation, tap handling, and performance:
  - Dynamic line width calculation based on screen width, font size, and letter spacing (no more fixed 45-char limit)
  - Lines now properly fit the screen without being cut off
  - Removed `numberOfLines={1}` that was causing text truncation
  - Added ref-based state synchronization for reliable tap gesture handling during async content loading
  - Tap gestures now work reliably even during book loading
  - **Virtualization**: Only renders ±15 lines around current line (max 31 components instead of all lines), dramatically improving performance for large books
- December 2024: **KARAOKE MODE FIX**: Fixed critical bug where karaoke mode showed eternal loading. The issue was a race condition where handlers checked `nonEmptyLines.length` but state wasn't populated in time. Fixed by using memoized `karaokeLines` directly. Also added fallback for content without newlines (splits by words).
- December 2024: **Code Cleanup**: Removed unused imports and console.log statements from EpubReader.
- December 2024: **TAP-SCROLL MODE REMOVED**: Completely removed tap-scroll mode from the app per user request. App now supports only two scroll modes: Seamless (manual finger scrolling) and Auto-Scroll (automatic scrolling at configurable speed).
- December 2024: **UX Improvements**:
  - Auto-scroll automatically pauses when opening the general menu
  - Progress bar has dedicated space at bottom, no text overlap
  - Settings changes apply instantly with debounced persistence (300ms)
- December 2024: **Reading Timer Visibility**:
  - Shows reading time when enabled outside focus mode
  - Hidden in focus mode for minimal UI
- December 2024: v2.0 Premium redesign
- December 2024: Added 6 premium themes with glassmorphism
- December 2024: Implemented Bionic Reading mode
- December 2024: Created Focus Mode with reading timer
- December 2024: Added reading statistics and streaks
- December 2024: **Scroll Modes**:
  - **Seamless Scroll**: Continuous smooth scrolling for immersive reading
  - **Auto-Scroll**: Automatic scrolling with adjustable speed (5-200 px/s), tap to play/pause
- December 2024: New award-level components (GlassCard, ProgressRing, etc.)
- December 2024: Enhanced typography with letter spacing
- December 2024: Reading mode presets
- December 2024: Fixed EPUB loading bugs - added 30-second timeout, file existence checks, retry mechanism with re-armed timeout protection
- December 2024: Created UnifiedScrollReader component with accurate line detection using React Native's onTextLayout callback
- December 2024: Simplified EPUB loading flow (load -> open -> read)
- December 2024: Fixed bionic mode infinite loading by separating layout measurement from styled text rendering
- December 2024: Removed "Animations/Smooth page transitions" setting from settings screen
- December 2024: **App Theme Toggle**: Separate light/dark mode for app interface, independent from reading themes
  - Auto-follow system theme option
  - Manual light/dark selection
- December 2024: **Auto-Scroll Start Button**: Glassmorphism overlay on book load
  - "Ready to read" message with speed indicator
  - "Start Reading" button initiates scrolling
  - Uses hasUserStartedReadingRef guard to prevent overlay reappearing after dismissal

## User Preferences
- No authentication required (local-first app)
- Premium, gesture-based interface
- Focus on reading experience and delight
- Haptic feedback for interactions
- Bionic reading toggle
- Customizable daily reading goals

## Running the App
- Scan the QR code with Expo Go (Android) or Camera app (iOS)
- Or use the web preview at localhost:8081

## Architecture Decisions
- Cognitive science research for typography defaults
- Glassmorphism for modern premium feel
- Spring animations for natural motion
- Reading modes for quick personalization
- Component-based design system
