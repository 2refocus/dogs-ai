// lib/localHistory.ts
// Small localStorage helper used for guest history on the History page.
// Safe to import in client components only.

export type LocalGen = {
  id: string;
  output_url: string;
  created_at: string;
  prompt?: string | null;
  preset_label?: string | null;
};

const KEY = "local_history_v1";

export function readLocal(): LocalGen[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(Boolean);
  } catch {
    return [];
  }
}

export function pushLocal(item: Partial<LocalGen>) {
  try {
    const row: LocalGen = {
      id: item.id || crypto.randomUUID(),
      output_url: String(item.output_url || ""),
      created_at: item.created_at || new Date().toISOString(),
      prompt: item.prompt ?? null,
      preset_label: item.preset_label ?? null,
    };
    const prev = readLocal();
    const next = [row, ...prev].slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function clearLocal() {
  try { localStorage.removeItem(KEY); } catch {}
}
