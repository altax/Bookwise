# Design Guidelines: Minimalist Book Reader App

## Architecture Decisions

### Authentication
**No Authentication Required** - This is a local-first, single-user reading app with data stored locally via AsyncStorage and expo-sqlite. However, the app is **prepared for future cloud sync** via Supabase hooks.

**Profile/Settings Implementation:**
- User customizable reading preferences (theme, font, spacing)
- App settings accessible via dedicated Settings tab
- No login/signup required for MVP
- Future: Optional email/magic link auth for cloud sync with last-write-wins conflict resolution

### Navigation
**Tab Navigation (3 Tabs):**
1. **Library** - Browse and manage book collection
2. **Reading** (active book context-aware) - Full-screen immersive reading
3. **Settings** - Customize reading experience and app preferences

**Core Action:** Import book via FAB+ on Library screen

### Screen Specifications

#### 1. Library Screen
**Purpose:** Browse, search, and manage book collection

**Layout:**
- Header: Default navigation header with search bar (right button: grid/list toggle)
- Main content: Scrollable masonry grid of book covers
- Floating: FAB+ button (bottom-right) for import
- Safe area insets: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl

**Components:**
- Masonry grid using expo-image with blurhash placeholders
- Book cards with cover, title, author, progress indicator
- Swipe-to-delete gesture on book items
- Empty state with "Import your first book" CTA
- Sort dropdown (date/alphabetical/recent)

**Floating FAB Shadow:**
- shadowOffset: {width: 0, height: 2}
- shadowOpacity: 0.10
- shadowRadius: 2

#### 2. Reading Screen
**Purpose:** Immersive full-screen reading experience

**Layout:**
- Header: Transparent, auto-hides on scroll, shows book title when visible
- Main content: Full-screen text container (scrollable/paginated)
- Floating: Bottom sheet menu (slides up), progress bar (bottom, always visible)
- Safe area insets: Dynamic based on UI visibility state

**Components:**
- Gesture handlers: swipe (page turn), double-tap (zoom), edge-swipe (menu)
- Progress bar: Shows percentage + estimated time (based on reading speed)
- Bottom sheet: Settings, bookmarks, table of contents
- Text selection menu: Bookmark (heart icon), Note, Share
- Haptic feedback on page turns and bookmarks

**UI Toggle Behavior:**
- Tap center screen: Toggle header/bottom sheet visibility
- Fade-in/out animations (300ms duration)

#### 3. Settings Screen
**Purpose:** Customize reading experience and app preferences

**Layout:**
- Header: Default navigation header with "Settings" title
- Main content: Scrollable form with sections
- Safe area insets: top = Spacing.xl, bottom = tabBarHeight + Spacing.xl

**Components:**
- **Reading Section:**
  - Font size slider (12-32pt) with live preview
  - Line spacing slider (1.0-2.0)
  - Margin adjustment
  - Font picker (5-8 fonts: Inter, SF Pro, Merriweather, Georgia, Lora)
- **Theme Section:**
  - Theme cards: Day (#FFFFFF), Night (#1A1A1A), Sepia (#F4ECD8)
  - Auto-switch toggle (follow system appearance)
- **Accessibility Section:**
  - High contrast toggle
  - Reduce motion option
  - Dynamic Type support
- **Data Section:**
  - Export bookmarks/notes (JSON/CSV)
  - Clear cache button

#### 4. Table of Contents (Modal)
**Purpose:** Quick chapter navigation

**Layout:**
- Native modal presentation
- Header: "Table of Contents" with close button (left)
- Main content: Scrollable list of chapters
- Safe area insets: top = insets.top + Spacing.xl, bottom = insets.bottom + Spacing.xl

**Components:**
- Chapter list items with chapter number, title, page number
- Current chapter highlighted with accent color
- Tap to jump to chapter (dismisses modal)

## Design System

### Color Palette
```
Light Theme (Day):
- Background: #FFFFFF
- Text: #333333
- Secondary Text: #666666
- Accent/Progress: #4A90E2
- Highlight: #4A90E2 at 20% opacity

Dark Theme (Night):
- Background: #1A1A1A
- Text: #E0E0E0
- Secondary Text: #B0B0B0
- Accent/Progress: #5DADE2
- Highlight: #5DADE2 at 20% opacity

Sepia Theme:
- Background: #F4ECD8
- Text: #5B4636
- Secondary Text: #8B7355
- Accent/Progress: #8B6F47
```

### Typography
- **Body Text:** Inter Regular (16-24pt adjustable)
- **Headings:** Inter Medium (18-28pt)
- **UI Labels:** SF Pro (14pt)
- **Bold Accents:** SF Pro Bold (14pt)

### Icon System
- Use Feather icons from @expo/vector-icons (24px standard size)
- No emojis in the application
- Common icons: book, bookmark (heart), settings (sliders), search, plus, x, menu, chevrons

### Visual Design Principles
1. **Minimalism:** Remove all non-essential UI during reading
2. **Airy Spacing:** Generous padding (16-24px) around content
3. **Smooth Animations:** 
   - Page transitions: Fade-in (200ms)
   - Menu slides: Spring animation (Reanimated)
   - Progress arc: Fill animation
4. **Gesture-First:** Prioritize swipes over buttons
5. **Immersive Reading:** Edge-to-edge text, no distractions

### Interaction Design
- **Touchable Feedback:** Subtle scale (0.95) on press for all buttons
- **Haptic Patterns:**
  - Light impact: Page turn, bookmark toggle
  - Medium impact: Book deletion, import success
  - Selection: Text highlight start
- **Long Press:** 500ms threshold for text selection menu
- **Swipe Thresholds:** 50px minimum for page turn, 150px for menu reveal

### Accessibility
- VoiceOver labels on all interactive elements
- Minimum touch target: 44x44pt
- Color contrast ratio: 4.5:1 minimum (WCAG AA)
- Support Dynamic Type (scale fonts with system settings)
- Reduce motion: Disable spring animations, use fade only
- High contrast mode: Increase accent color saturation by 20%

### Critical Assets
**DO NOT generate decorative assets.** Only essential content:
1. **Book Covers:** User-imported from EPUB/PDF metadata
2. **Placeholder Cover:** Minimal gradient (2 colors from theme) with book icon
3. **Empty States:** Simple Feather icon + text only
4. **Onboarding:** 3 simple illustration screens (book import → customize → read) - optional, can use text only

### Component Specifications
- **Book Card:** 120x180pt cover + title (1 line) + author (1 line) + progress indicator
- **Progress Bar:** 4pt height, rounded ends, accent color fill
- **FAB:** 56x56pt circle, accent background, plus icon, floating shadow
- **Bottom Sheet:** 60% screen height, rounded top corners (16pt radius), drag handle
- **Slider:** 8pt track height, 24pt thumb, accent color active state
- **Theme Card:** 80x80pt preview square with theme colors, checkmark when selected