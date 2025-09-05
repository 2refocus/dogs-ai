// lib/localHistory.ts
export type LocalGen = {
  id: string;
  output_url: string;
  input_url?: string | null;
  prompt?: string | null;
  preset_label?: string | null;
  created_at: string;
};

const KEY = "local_generations_v1";

export function readLocal(): LocalGen[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

export function pushLocal(item: Omit<LocalGen, "id" | "created_at">) {
  if (typeof window === "undefined") return;
  try {
    const now = new Date().toISOString();
    const row: LocalGen = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      created_at: now,
      output_url: item.output_url,
      input_url: item.input_url ?? null,
      prompt: item.prompt ?? null,
      preset_label: item.preset_label ?? null,
    };
    const prev = readLocal();
    const next = [row, *prev].slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function clearLocal() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch {}
}