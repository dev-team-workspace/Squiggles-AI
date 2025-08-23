
// src/app/creations/[creationId]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';
import { getCreationById } from '@/lib/actions';
import Image from 'next/image';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageIcon, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Props = {
  params: { creationId: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const creationId = params.creationId;
  const creation = await getCreationById(creationId);

  if (!creation || !creation.transformedImageUrl) {
    return {
      title: 'Creation Not Found | Squiggles',
      description: 'The Squiggle creation you are looking for could not be found.',
    };
  }

  const siteName = 'Squiggles';
  const title = creation.title ? `${creation.title} - by Squiggles` : `A Squiggle Creation - ${siteName}`;
  const description = `Check out this awesome AI-transformed Squiggle: ${creation.title || 'A magical artwork'}! Created with Squiggles.`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  const pageUrl = `${appUrl}/creations/${creationId}`;

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: pageUrl,
      siteName: siteName,
      images: [
        {
          url: creation.transformedImageUrl, // Must be an absolute URL
          // width: 800, // Optional, provide if known
          // height: 600, // Optional, provide if known
        },
      ],
      type: 'article', // or 'website' or 'profile' depending on content
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [creation.transformedImageUrl], // Must be an absolute URL
    },
  };
}

export default async function CreationPage({ params }: Props) {
  const creation = await getCreationById(params.creationId);

  if (!creation) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold text-destructive mb-2">Creation Not Found</h1>
        <p className="text-muted-foreground mb-6">
          Oops! We couldn't find the Squiggle creation you were looking for.
          It might have been moved, deleted, or the link might be incorrect.
        </p>
        <Button asChild>
          <Link href="/">Go to Homepage</Link>
        </Button>
         <Button asChild variant="outline" className="ml-2">
          <Link href="/public-gallery">Explore Public Gallery</Link>
        </Button>
      </div>
    );
  }
  
  const creationDate = new Date(creation.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl md:text-4xl font-bold text-primary">
            {creation.title || "My Squiggle Masterpiece"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Style: {creation.style.charAt(0).toUpperCase() + creation.style.slice(1)} | Created on: {creationDate}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {creation.transformedImageUrl ? (
            <div className="w-full max-w-xl aspect-[16/9] bg-muted rounded-lg overflow-hidden shadow-inner border">
                <Image
                    src={creation.transformedImageUrl}
                    alt={creation.title || "Transformed Squiggle"}
                    fill
                    className="object-contain"
                    data-ai-hint={creation.style || "ai generated art"}
                    unoptimized // If image URLs are external and not handled by Next.js image optimization
                />
            </div>
          ) : (
            <div className="w-full max-w-xl aspect-[16/9] bg-muted rounded-lg flex items-center justify-center border text-muted-foreground">
              <ImageIcon className="h-24 w-24 opacity-50" />
              <p className="ml-2">Image not available</p>
            </div>
          )}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg">
              <Link href="/draw">Create Your Own Squiggle!</Link>
            </Button>
             <Button asChild variant="outline" size="lg">
                <Link href="/public-gallery">Explore More Squiggles</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
