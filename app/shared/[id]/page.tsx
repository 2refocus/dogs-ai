import { Metadata } from 'next';
import SharedImagePage from './SharedImagePage';

interface PageProps {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// This function runs at build time and request time
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const imageId = params.id;
  
  try {
    // Try to fetch the image data
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mypetportrait.app';
    const response = await fetch(`${baseUrl}/api/community/${imageId}`, {
      cache: 'no-store' // Always fetch fresh data
    });

    if (response.ok) {
      const imageData = await response.json();
      const imageUrl = imageData.high_res_url || imageData.output_url;
      const title = `${imageData.preset_label || 'Pet Portrait'} - Pet Portrait Studio`;
      const description = `Check out this amazing pet portrait${imageData.display_name ? ` by ${imageData.display_name}` : ''}! ✨🐾`;

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          images: [
            {
              url: imageUrl,
              width: 1024,
              height: 1024,
              alt: 'Pet Portrait',
            },
          ],
          url: `${baseUrl}/shared/${imageId}`,
          type: 'website',
          siteName: 'Pet Portrait Studio',
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: [imageUrl],
        },
      };
    }
  } catch (error) {
    console.error('Error generating metadata for shared image:', error);
  }

  // Fallback metadata
  return {
    title: 'Pet Portrait - Pet Portrait Studio',
    description: 'Check out this amazing pet portrait! ✨🐾',
    openGraph: {
      title: 'Pet Portrait - Pet Portrait Studio',
      description: 'Check out this amazing pet portrait! ✨🐾',
      images: [
        {
          url: '/icon.png',
          width: 512,
          height: 512,
          alt: 'Pet Portrait Studio',
        },
      ],
    },
  };
}

export default function SharedPage({ params }: PageProps) {
  return <SharedImagePage imageId={params.id} />;
}
