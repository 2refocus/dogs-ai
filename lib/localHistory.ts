// lib/localHistory.ts
export type LocalItem = {
  id: string;
  output_url: string;
  created_at: string;
  prompt?: string | null;
  preset_label?: string | null;
};

const KEY = "local_generations_v1";

export function pushLocal(item: Omit<LocalItem, "id" | "created_at">) {
  try {
    const now = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const row: LocalItem = { id, created_at: now, ...item };
    const arr = getLocal();
    arr.unshift(row);
    localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 50)));
  } catch {}
}

export function getLocal(): LocalItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(x => x && typeof x.output_url === "string");
  } catch {
    return [];
  }
}