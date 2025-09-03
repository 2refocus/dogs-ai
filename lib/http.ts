export async function safeJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try { return await res.json(); } catch { return null; }
  }
  // Fallback to text to surface server errors
  try { const txt = await res.text(); return { _text: txt }; } catch { return null; }
}
