"use client";

import { useEffect, useCallback } from "react";

type KeyboardHandler = (e: KeyboardEvent) => void;

interface UseKeyboardOptions {
  enabled?: boolean;
}

export function useKeyboard(
  handlers: Record<string, KeyboardHandler>,
  options: UseKeyboardOptions = {},
) {
  const { enabled = true } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      const handler = handlers[e.key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    },
    [handlers, enabled],
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}