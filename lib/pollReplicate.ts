// lib/pollReplicate.ts
export async function pollReplicate(predictionId: string, intervalMs = 1200, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`/api/predictions/${predictionId}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Poll failed (${res.status})`);
    }
    if (data.status === "succeeded") {
      if (data.url) return data.url;
      console.warn("Succeeded but no URL; raw payload:", data.raw);
      throw new Error("No output URL returned (inspect raw payload in console).");
    }
    if (data.status === "failed" || data.status === "canceled") {
      const msg = typeof data.raw?.error === "string" ? data.raw.error : "Generation failed";
      throw new Error(msg);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for Replicate result");
}
