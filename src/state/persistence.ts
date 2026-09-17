import type { SavedState } from "./patternStore";

const STORAGE_KEY = "bodice-pattern-state/v1";

export function saveToLocalStorage(state: SavedState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadFromLocalStorage(): SavedState | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedState;
  } catch {
    return null;
  }
}

export function hasLocalStorageState(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) !== null;
}

export function downloadJson(state: SavedState, filename = "bodice-pattern.json"): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function readJsonFile(file: File): Promise<SavedState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string) as SavedState);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
