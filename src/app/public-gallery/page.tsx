
"use client";

import GalleryGrid from "@/components/gallery/gallery-grid";
import { getPublicCreations } from "@/lib/actions";
import { useEffect, useState, useCallback } from "react";
import type { Creation } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Compass, RefreshCw, GalleryThumbnails as GalleryIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

// Mock data for "Public Gallery" - will be shown if no real data is fetched
const mockPublicCreations: Creation[] = [
  {
    id: 'mock-public-creation-1',
    userId: 'mock-user-1',
    title: "Cosmic Explorer Bot (Sample)",
    originalDrawingUrl: 'https://placehold.co/320x220.png',
    transformedImageUrl: 'https://placehold.co/640x440.png',
    createdAt: new Date('2024-05-22T14:00:00.000Z').toISOString(),
    style: 'photorealistic',
    isPublic: true,
  },
  {
    id: 'mock-public-creation-2',
    userId: 'mock-user-2',
    title: "Vintage Rocket Ride (Sample)",
    originalDrawingUrl: 'https://placehold.co/300x200.png',
    transformedImageUrl: 'https://placehold.co/600x400.png',
    createdAt: new Date('2024-05-23T16:45:00.000Z').toISOString(),
    style: 'vintageToy',
    isPublic: true,
  },
  {
    id: 'mock-public-creation-3',
    userId: 'mock-user-3',
    title: "Watercolor Meadow (Sample)",
    originalDrawingUrl: 'https://placehold.co/280x180.png',
    transformedImageUrl: 'https://placehold.co/560x360.png',
    createdAt: new Date('2024-05-19T09:15:00.000Z').toISOString(),
    style: 'watercolor',
    isPublic: true,
  },
  {
    id: 'mock-public-creation-4',
    userId: 'mock-user-4',
    title: "Claymation Critter (Sample)",
    originalDrawingUrl: 'https://placehold.co/310x210.png',
    transformedImageUrl: 'https://placehold.co/620x420.png',
    createdAt: new Date('2024-05-24T11:00:00.000Z').toISOString(),
    style: 'claymation',
    isPublic: true,
  }
];


function GallerySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

function CardSkeleton() {
    return (
        <div className="flex flex-col space-y-3 p-4 border rounded-lg shadow-sm bg-card">
            <Skeleton className="h-4 w-3/4 rounded" /> {/* Title Placeholder */}
            <Skeleton className="h-3 w-1/2 rounded" /> {/* Date Placeholder */}
            <Skeleton className="aspect-[16/9] w-full rounded-xl" /> {/* Image Placeholder */}
            <Skeleton className="h-8 w-full rounded-md mt-2" /> {/* Button Placeholder */}
        </div>
    );
}


export default function PublicGalleryPage() {
  const [creations, setCreations] = useState<Creation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPublicCreations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await getPublicCreations();
      setCreations(items);
    } catch (err: any) {
      setError(err.message || "Failed to load public gallery items.");
      console.error("Public Gallery fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicCreations();
  }, [fetchPublicCreations]);

  if (isLoading && creations.length === 0) { 
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-var(--navbar-height,4rem)-var(--page-padding,4rem))]">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  const displayCreations = creations.length > 0 ? creations : (isLoading || error ? [] : mockPublicCreations);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div className="text-center sm:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-primary flex items-center gap-3 justify-center sm:justify-start">
                <Compass className="h-10 w-10 text-accent" />
                Public Squiggle Showcase
            </h1>
            <p className="text-muted-foreground mt-1">Explore amazing creations from the community!</p>
        </div>
        <Button variant="outline" onClick={fetchPublicCreations} disabled={isLoading && creations.length > 0} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading && creations.length > 0 ? 'animate-spin' : ''}`} />
          Refresh Gallery
        </Button>
      </div>

      {isLoading && creations.length === 0 && <GallerySkeleton />} 
      
      {!isLoading && error && (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Error Loading Public Gallery</AlertTitle>
            <AlertDescription>
              {error} Please try refreshing the page or try again later.
            </AlertDescription>
          </Alert>
      )}

      {!isLoading && !error && displayCreations.length === 0 && (
         <div className="flex flex-col items-center justify-center text-center py-12 min-h-[400px] bg-card rounded-xl shadow-sm">
            <GalleryIcon className="h-24 w-24 text-muted-foreground mb-6 opacity-70" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">The Public Gallery is a Blank Canvas!</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
            No squiggles have been published by the community yet. Be the first to share your masterpiece!
            </p>
        </div>
      )}
      
      {!isLoading && !error && displayCreations.length > 0 && (
        <GalleryGrid creations={displayCreations} />
      )}
    </div>
  );
}

