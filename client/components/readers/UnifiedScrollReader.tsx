import React, { forwardRef } from "react";
import type { ScrollMode } from "@/constants/theme";
import { SeamlessScrollReader } from "./scroll/SeamlessScrollReader";
import { AutoScrollReader } from "./scroll/AutoScrollReader";
import { KaraokeReader } from "./scroll/KaraokeReader";
import type { UnifiedScrollReaderRef, UnifiedScrollReaderProps } from "./scroll/types";

export type { UnifiedScrollReaderRef } from "./scroll/types";

export const UnifiedScrollReader = forwardRef<UnifiedScrollReaderRef, UnifiedScrollReaderProps>(
  (
    {
      content,
      scrollMode,
      onScrollProgress,
      onError,
      onTap,
      theme,
      settings,
      initialPosition = 0,
      onAutoScrollStateChange,
      progressBarHeight = 0,
    },
    ref
  ) => {
    const commonProps = {
      content,
      onScrollProgress,
      onError,
      onTap,
      theme,
      settings,
      initialPosition,
      progressBarHeight,
    };

    switch (scrollMode) {
      case "autoScroll":
        return (
          <AutoScrollReader
            ref={ref}
            {...commonProps}
            onAutoScrollStateChange={onAutoScrollStateChange}
          />
        );

      case "karaoke":
        return (
          <KaraokeReader
            ref={ref}
            {...commonProps}
            onAutoScrollStateChange={onAutoScrollStateChange}
          />
        );

      case "seamless":
      default:
        return <SeamlessScrollReader ref={ref} {...commonProps} />;
    }
  }
);
