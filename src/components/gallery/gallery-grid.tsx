"use client";

import type { Creation } from "@/types";
import GalleryItemCard from "./gallery-item-card";
import { GalleryThumbnails } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { memo } from "react";

interface GalleryGridProps {
  creations: Creation[];
  onPublishToggle?: () => void;
  emptyState?: {
    title?: string;
    description?: string;
    ctaText?: string;
    ctaHref?: string;
  };
  isLoading?: boolean;
}

const DEFAULT_EMPTY_STATE = {
  title: "Your Gallery is Magically Empty!",
  description: "It looks like you haven't transformed any drawings yet. Head over to the drawing canvas and let your imagination run wild!",
  ctaText: "Start Drawing Now",
  ctaHref: "/"
};

function GalleryGrid({ 
  creations, 
  onPublishToggle, 
  emptyState = DEFAULT_EMPTY_STATE,
  isLoading = false
}: GalleryGridProps) {
  if (isLoading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
      ))}
    </div>;
  }

  if (creations.length === 0) {
    return (
      <div 
        role="alert"
        aria-live="polite"
        className="flex flex-col items-center justify-center text-center py-12 min-h-[400px] bg-card rounded-xl shadow-sm"
      >
        <GalleryThumbnails className="h-24 w-24 text-muted-foreground mb-6 opacity-70" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          {emptyState.title || DEFAULT_EMPTY_STATE.title}
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {emptyState.description || DEFAULT_EMPTY_STATE.description}
        </p>
        <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href={emptyState.ctaHref || DEFAULT_EMPTY_STATE.ctaHref}>
            {emptyState.ctaText || DEFAULT_EMPTY_STATE.ctaText}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {creations.map((creation) => (
        <GalleryItemCard 
          key={creation.id} 
          creation={creation} 
          onPublishToggle={onPublishToggle} 
        />
      ))}
    </div>
  );
}

GalleryGrid.displayName = "GalleryGrid";

export default memo(GalleryGrid);