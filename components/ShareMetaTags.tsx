"use client";
import Head from "next/head";

interface ShareMetaTagsProps {
  imageUrl?: string;
  title?: string;
  description?: string;
  url?: string;
}

export default function ShareMetaTags({ 
  imageUrl, 
  title = "Pet Portrait Studio", 
  description = "Check out this amazing pet portrait! ✨🐾",
  url 
}: ShareMetaTagsProps) {
  if (!imageUrl) return null;

  const fullUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <Head>
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1024" />
      <meta property="og:image:height" content="1024" />
      <meta property="og:image:alt" content="Pet Portrait" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Pet Portrait Studio" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content="Pet Portrait" />

      {/* Additional Meta Tags */}
      <meta name="description" content={description} />
    </Head>
  );
}
