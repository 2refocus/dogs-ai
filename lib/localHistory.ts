export type LocalRow = {
  output_url: string;
  input_url?: string | null;
  created_at?: string;
  preset_label?: string | null;
};

const KEY = "local_generations_v1";

export function readLocal(): LocalRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr.filter((x) => x && typeof x.output_url === "string");
    }
    return [];
  } catch {
    return [];
  }
}

export function pushLocal(item: LocalRow) {
  if (typeof window === "undefined") return;
  try {
    const row: LocalRow = {
      output_url: item.output_url,
      input_url: item.input_url ?? null,
      created_at: item.created_at ?? new Date().toISOString(),
      preset_label: item.preset_label ?? null,
    };
    const prev = readLocal();
    const next = [row, ...prev].slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}
