"use client";

import { useCallback } from "react";

type SoundType = "success" | "error";

export function useAudio() {
  const playSound = useCallback((type: SoundType) => {
    try {
      const audio = new Audio();
      if (type === "success") {
        audio.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACAgICAgICAgICAgICAgICAgICAgICAgICAgIC";
      } else {
        audio.src = "data:audio/wav;base64,UklGRl9GAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA";
      }
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {
    }
  }, []);

  return { playSound };
}