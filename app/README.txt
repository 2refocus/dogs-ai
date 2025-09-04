Wire the aspect ratio in your create/submit handler (app/page.tsx):

  const ar = (typeof window !== 'undefined' && localStorage.getItem('aspectRatio')) || '1:1';
  fd.append('aspectRatio', ar);

Optional: set env NEXT_PUBLIC_DEFAULT_ASPECT_RATIO=1:1 to enforce the same default at boot.
