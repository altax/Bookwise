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
- December 2024: **TAP-SCROLL MODE COMPLETE REWRITE**:
  - Right tap zone now exactly 1/3 (33%) of screen width for universal device support
  - New 2-phase scroll logic: 1) auto-scroll partial line into full view, 2) smooth scroll to top
  - Yellow highlight with 0.5s fade-out animation (using Easing.out curve)
  - Dynamic screen dimension handling for landscape/portrait orientation changes
  - Manual scroll completely disabled in tap-scroll mode (scrollEnabled: false)
  - Edge case handling: last page detection, single line on screen, variable font sizes
  - 60fps performance maintained with Reanimated withTiming animations
- December 2024: **Tap Zone & Settings Redesign**:
  - 3-zone tap system: left (15%) = menu, center (52%) = nothing, right (33%) = tap scroll only in tap mode
  - Removed unused top/bottom padding settings from ReadingContext and UI
  - Compact settings panel with live text preview showing real-time font size and line spacing changes
  - Tap scroll now supports both "Top" and "Center" target positions via settings
  - Reading timer properly respects Android safe area insets (no more overlap with status bar)
  - Tap scroll completely reworked using measured line layout data for accurate scrolling
- December 2024: **UX Improvements**:
  - Auto-scroll automatically pauses when opening the general menu
  - Progress bar has dedicated space at bottom, no text overlap
  - Settings changes apply instantly with debounced persistence (300ms)
- December 2024: **Tap Scroll Improvements**:
  - Manual scrolling disabled in tap scroll mode for distraction-free reading
  - Visual hint overlay appears when entering tap scroll mode
  - Configurable animation speed (100-1000ms)
- December 2024: **Reading Timer Visibility**:
  - Shows reading time when enabled outside focus mode
  - Hidden in focus mode for minimal UI
- December 2024: v2.0 Premium redesign
- December 2024: Added 6 premium themes with glassmorphism
- December 2024: Implemented Bionic Reading mode
- December 2024: Created Focus Mode with reading timer
- December 2024: Added reading statistics and streaks
- December 2024: **Advanced Scroll Modes**:
  - **Auto-Scroll**: Automatic scrolling with adjustable speed (5-200 px/s), tap to play/pause
  - **Tap-Scroll**: Improved line detection (50%+ visibility), configurable animation speed (50-1000ms)
  - **Last Line Position**: Choose whether tapped line appears at top or center of screen
  - **Safe Area Fix**: Text no longer overlaps system UI (status bar, navigation buttons)
- December 2024: New award-level components (GlassCard, ProgressRing, etc.)
- December 2024: Enhanced typography with letter spacing
- December 2024: Reading mode presets
- December 2024: Fixed EPUB loading bugs - added 30-second timeout, file existence checks, retry mechanism with re-armed timeout protection
- December 2024: **NEW Scroll Modes** - Implemented two scroll modes:
  - **Seamless Scroll**: Continuous smooth scrolling for immersive reading
  - **Tap-Scroll**: Tap anywhere to scroll the last visible line to the top with brief highlighting to prevent losing your reading position
- December 2024: Created UnifiedScrollReader component with accurate line detection using React Native's onTextLayout callback
- December 2024: Simplified EPUB loading flow (load -> open -> read)
- December 2024: **Tap-Scroll Improvements**:
  - Fixed last visible line detection using screen coordinates for accurate visibility check
  - Added slow manual scrolling with line-snapping (scrolls snap to nearest line after drag)
  - Added vertical padding (40px) so text doesn't touch screen edges (top and bottom)
  - Auto-adjusts scroll to ensure last line is fully visible after tap
  - Very slow deceleration rate for controlled one-line-at-a-time scrolling
- December 2024: Fixed bionic mode infinite loading by separating layout measurement from styled text rendering
- December 2024: Removed "Animations/Smooth page transitions" setting from settings screen
- December 2024: **App Theme Toggle**: Separate light/dark mode for app interface, independent from reading themes
  - Auto-follow system theme option
  - Manual light/dark selection
- December 2024: **Auto-Scroll Start Button**: Glassmorphism overlay on book load
  - "Готово к чтению" (Ready to read) message with speed indicator
  - "Начать чтение" (Start Reading) button initiates scrolling
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
