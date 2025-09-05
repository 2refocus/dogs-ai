/* lib/localHistory.ts
   - Tiny localStorage helper for guest history
*/

export type LocalRow = {
  id: string;
  output_url: string;
  input_url: string | null;
  prompt: string | null;
  preset_label: string | null;
  created_at: string;
};

const KEY = "guest_history_v1";

export function readLocal(): LocalRow[] {
  try {
    const s = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (!s) return [];
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? (arr as LocalRow[]) : [];
  } catch {
    return [];
  }
}

export function pushLocal(item: {
  output_url: string;
  input_url?: string | null;
  prompt?: string | null;
  preset_label?: string | null;
}) {
  try {
    const row: LocalRow = {
      id: (typeof crypto !== "undefined" && (crypto as any).randomUUID)
        ? (crypto as any).randomUUID()
        : String(Date.now()),
      output_url: item.output_url,
      input_url: item.input_url ?? null,
      prompt: item.prompt ?? null,
      preset_label: item.preset_label ?? null,
      created_at: new Date().toISOString(),
    };
    const prev = readLocal();
    const next = [row, ...prev].slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function clearLocal() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}