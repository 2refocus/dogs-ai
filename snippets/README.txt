Ensure aspect ratio gets applied end-to-end

1) FRONTEND: append aspectRatio when submitting
------------------------------------------------
In app/page.tsx (or wherever you build FormData):

  const fd = new FormData();
  // ...
  const ar = (typeof window !== 'undefined' && localStorage.getItem('aspectRatio')) || '1:1';
  fd.append('aspectRatio', ar);

2) BACKEND: forward to Replicate
--------------------------------
In app/api/stylize/route.ts (already in your repo, but double-check):

  const aspectFromForm = String(form.get('aspectRatio') || '').trim();
  const ALLOWED_AR = new Set(['1:1','4:5','3:4','16:9']);
  const aspect_ratio = ALLOWED_AR.has(aspectFromForm as any) ? aspectFromForm : '1:1';

  const input = { prompt, image_input: [b64], output_format: 'jpg', aspect_ratio };

3) UI: enforce AR visually for previews/results
-----------------------------------------------
Wrap your preview/result images with ARFrame (new component):

  import ARFrame from '@/components/ARFrame';

  const currentAR =
    (typeof window !== 'undefined' && (localStorage.getItem('aspectRatio') as any)) || '1:1';

  <ARFrame ar={currentAR}>
    {resultUrl
      ? <img src={resultUrl} alt="result" />
      : <div className="skeleton-pattern" />}
  </ARFrame>

This guarantees the display is square when AR=1:1, regardless of the image’s intrinsic dimensions.

4) Debug quickly
----------------
Open DevTools → Network → /api/stylize → Response.
You should see: { ok: true, meta: { aspect_ratio: "1:1", ... } }
If it's not 1:1 there, the backend didn't receive the field. Re-check step 1.
