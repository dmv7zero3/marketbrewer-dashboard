import { useEffect } from "react";

type KeyCombo = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

/**
 * Hook for keyboard shortcuts.
 *
 * Usage:
 * useKeyboardShortcut({ key: "s", ctrl: true }, handleSave);
 * useKeyboardShortcut({ key: "Escape" }, handleCancel);
 */
export function useKeyboardShortcut(
  combo: KeyCombo,
  callback: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const matchesKey = event.key.toLowerCase() === combo.key.toLowerCase();
      const matchesCtrl =
        combo.ctrl === undefined || event.ctrlKey === combo.ctrl;
      const matchesShift =
        combo.shift === undefined || event.shiftKey === combo.shift;
      const matchesAlt = combo.alt === undefined || event.altKey === combo.alt;
      const matchesMeta =
        combo.meta === undefined || event.metaKey === combo.meta;

      if (
        matchesKey &&
        matchesCtrl &&
        matchesShift &&
        matchesAlt &&
        matchesMeta
      ) {
        event.preventDefault();
        callback();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [combo, callback, enabled]);
}
