"use client";

import GalleryGrid from "@/components/gallery/gallery-grid";
import { getGalleryItems } from "@/lib/actions";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { useEffect, useState, useCallback } from "react";
import type { Creation } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";


const mockMyCreations: Creation[] = [
  {
    id: 'mock-my-creation-1',
    userId: 'current-user-mock-id',
    originalDrawingUrl: 'https://placehold.co/300x200.png',
    transformedImageUrl: 'https://placehold.co/600x400.png',
    createdAt: new Date('2024-05-20T10:00:00.000Z').toISOString(),
    style: 'cartoon',
    isPublic: false,
  },
  {
    id: 'mock-my-creation-2',
    userId: 'current-user-mock-id',
    originalDrawingUrl: 'https://placehold.co/300x200.png',
    transformedImageUrl: 'https://placehold.co/600x400.png',
    createdAt: new Date('2024-05-21T12:30:00.000Z').toISOString(),
    style: 'storybook',
    isPublic: true,
  },
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
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-3 w-1/2 rounded" />
      <Skeleton className="aspect-[16/9] w-full rounded-xl" />
      <Skeleton className="h-8 w-full rounded-md mt-2" />
    </div>
  );
}

export default function GalleryPage() {
  const { user, loading: authLoading } = useAuthRedirect();
  const [creations, setCreations] = useState<Creation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCreations = useCallback(async () => {
    console.log("🔄 fetchCreations called");
    if (user) {
      console.log("✅ User found:", user.uid);
      setIsLoading(true);
      setError(null);

      try {
        const items = await getGalleryItems(user.uid);
        console.log("📸 Gallery items fetched:", items);
        setCreations(items);
      } catch (err: any) {
        console.error("❌ Gallery fetch error:", err);
        setError(err.message || "Failed to load gallery items.");
      } finally {
        setIsLoading(false);
      }
    } else if (!authLoading) {
      console.warn("⚠️ No user found, and auth is not loading");
      setCreations([]);
      setIsLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    console.log("🧩 useEffect triggered. authLoading:", authLoading);
    if (!authLoading) {
      fetchCreations();
    }
  }, [authLoading, fetchCreations]);

  if (authLoading || (isLoading && !user && !error)) {
    console.log("⏳ Showing spinner because auth is loading or data is still loading");
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-var(--navbar-height,4rem)-var(--page-padding,4rem))]">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  if (!user && !authLoading) {
    console.log("🚫 No user and not loading, returning null");
    return null;
  }

  const displayCreations = creations.length > 0
    ? creations
    : (isLoading || error
      ? []
      : mockMyCreations.map((mc) => ({
          ...mc,
          userId: user?.uid || 'mock-user-id',
        }))
    );

  console.log("🎨 Final display creations:", displayCreations);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-primary text-center sm:text-left">My Squiggle Creations</h1>
        <Button variant="outline" onClick={fetchCreations} disabled={isLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Gallery
        </Button>
      </div>

      {isLoading && <GallerySkeleton />}

      {!isLoading && error && (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error Loading Gallery</AlertTitle>
          <AlertDescription>
            {error} Please try refreshing the page or try again later.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <GalleryGrid creations={displayCreations} onPublishToggle={fetchCreations} />
      )}
    </div>
  );
}
