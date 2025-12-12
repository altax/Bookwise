import type { ScrollMode } from "@/constants/theme";

export interface ReaderTheme {
  text: string;
  backgroundRoot: string;
  secondaryText: string;
  highlightColor?: string;
  accent?: string;
}

export interface ReaderSettings {
  fontSize: number;
  lineSpacing: number;
  fontFamily: string;
  marginHorizontal: number;
  letterSpacing: number;
  textAlignment: "left" | "justify";
  bionicReading: boolean;
  autoScrollSpeed?: number;
  karaokeAutoAdvance?: boolean;
  karaokeAutoAdvanceSpeed?: number;
  karaokeUpcomingOpacity?: number;
}

export interface BaseReaderProps {
  content: string;
  onScrollProgress?: (progress: number, currentPosition: number, totalHeight: number) => void;
  onError?: (error: string) => void;
  onTap?: () => void;
  onReady?: () => void;
  theme: ReaderTheme;
  settings: ReaderSettings;
  initialPosition?: number;
  progressBarHeight?: number;
}

export interface AutoScrollReaderProps extends BaseReaderProps {
  onAutoScrollStateChange?: (isPlaying: boolean) => void;
}

export interface KaraokeReaderProps extends BaseReaderProps {
  onAutoScrollStateChange?: (isPlaying: boolean) => void;
}

export interface UnifiedScrollReaderProps extends BaseReaderProps {
  scrollMode: ScrollMode;
  onAutoScrollStateChange?: (isPlaying: boolean) => void;
  pauseAutoScroll?: () => void;
  onReady?: () => void;
}

export interface UnifiedScrollReaderRef {
  scrollToPosition: (position: number) => void;
  getCurrentPosition: () => number;
  toggleAutoScroll: () => void;
  isAutoScrolling: () => boolean;
  pauseAutoScroll: () => void;
}

export interface MeasuredLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  ascender: number;
  descender: number;
  capHeight: number;
  xHeight: number;
}
