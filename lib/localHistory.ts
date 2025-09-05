
// lib/localHistory.ts
// Tiny helper to persist last N generated images for guests
export type LocalItem = {
  output_url: string;
  input_url?: string | null;
  created_at: string;
  prompt?: string | null;
  preset_label?: string | null;
};

const KEY = "local_generations_v1";

export function readLocal(): LocalItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
    return [];
  } catch {
    return [];
  }
}

export function pushLocal(item: LocalItem) {
  try {
    const prev = readLocal();
    const next = [item, ...prev].slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}
