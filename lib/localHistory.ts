/* lib/localHistory.ts
 * Lightweight guest history stored in localStorage.
 * Types are flexible so app/page.tsx can include optional fields like input_url.
 */

export type LocalGen = {
  output_url: string;
  input_url?: string | null;
  preset_label?: string | null;
  prompt?: string | null;
  created_at: string;
};

const KEY = "guest_history_v1";

export function readLocal(): LocalGen[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    // basic shape guard
    return arr.filter((x: any) => x && typeof x.output_url === "string");
  } catch {
    return [];
  }
}

export function pushLocal(item: Partial<LocalGen> & { output_url: string }) {
  if (typeof window === "undefined") return;
  try {
    const row: LocalGen = {
      output_url: item.output_url,
      input_url: item.input_url ?? null,
      preset_label: item.preset_label ?? null,
      prompt: item.prompt ?? null,
      created_at: item.created_at ?? new Date().toISOString(),
    };
    console.log(`[pushLocal] Creating row:`, row);
    const prev = readLocal();
    console.log(`[pushLocal] Previous items count:`, prev.length);
    const next = [row, ...prev].slice(0, 50);
    console.log(`[pushLocal] New items count:`, next.length);
    localStorage.setItem(KEY, JSON.stringify(next));
    console.log(`[pushLocal] Successfully saved to localStorage`);
  } catch (e) {
    console.error(`[pushLocal] Error saving to localStorage:`, e);
  }
}
