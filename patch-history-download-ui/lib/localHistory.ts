export type LocalItem = {
  id: string;
  created_at: string;
  prompt: string | null;
  species: string | null;
  preset_label: string | null;
  output_url: string;
};

const KEY = "localGenerations";

export function pushLocal(item: Omit<LocalItem, "id" | "created_at">) {
  try {
    const now = new Date().toISOString();
    const withId: LocalItem = { id: crypto.randomUUID?.() || String(Math.random()), created_at: now, ...item };
    const raw = localStorage.getItem(KEY);
    const arr: LocalItem[] = raw ? JSON.parse(raw) : [];
    arr.unshift(withId);
    const trimmed = arr.slice(0, 100);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {}
}

export function readLocal(): LocalItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearLocal() {
  try { localStorage.removeItem(KEY); } catch {}
}
