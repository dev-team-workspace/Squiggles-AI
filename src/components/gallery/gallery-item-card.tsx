
"use client";

import Image from "next/image";
import type { Creation, TogglePublishResult, UpscaleImageResult } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, Image as ImageIcon, Sparkles, Copy as CopyIcon, Globe, ShieldOff, Loader2, FileText, Film, ZoomIn, Share2, Twitter } from "lucide-react"; // Added Film, ZoomIn
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDesc,
  DialogHeader,
  DialogTitle as DialogModalTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogTitle
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { togglePublishStatus, upscaleCreationImage } from "@/lib/actions"; // Added upscaleCreationImage
import { useAuthContext } from "@/providers/firebase-provider";
import { useState, useEffect, useMemo } from "react";
import { Trash } from "lucide-react";
import { deleteCreation } from "@/lib/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,

} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { getStorage, ref, getDownloadURL } from "firebase/storage";

// Add state for deletion


interface GalleryItemCardProps {
  creation: Creation;
  onPublishToggle?: () => void;
}

export default function GalleryItemCard({ creation: initialCreation, onPublishToggle }: GalleryItemCardProps) {
  const { toast } = useToast();
  const { user, isDevModeActive, addSimulatedCost } = useAuthContext();
  const [creation, setCreation] = useState(initialCreation); // Local state for dynamic updates
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  // Sync with prop changes if the parent list re-fetches
  useEffect(() => {
  const handleTouchMove = (e: TouchEvent) => {
    // Prevent scrolling when modal is open
    const dialogs = document.querySelectorAll('[data-radix-dialog-content]');
    if (dialogs.length > 0) {
      e.preventDefault();
    }
  };

  document.addEventListener('touchmove', handleTouchMove, { passive: false });

  return () => {
    document.removeEventListener('touchmove', handleTouchMove);
  };
}, []);
  useEffect(() => {
    setCreation(initialCreation);
  }, [initialCreation]);
  const handleDelete = async () => {
    if (!user || creation.id.startsWith('mock-')) {
      toast({ title: "Action Not Allowed", description: "Cannot delete sample items.", variant: "destructive" });
      return;
    }

    setIsDeleting(true);
    const result = await deleteCreation(creation.id, user.uid);
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);

    if (result.success) {
      toast({ title: "Deleted!", description: "Your creation has been removed." });
      // You might want to add a callback prop to refresh the parent list
      // onDelete?.(); 
    } else {
      toast({
        title: "Deletion Error",
        description: result.error || "Failed to delete creation",
        variant: "destructive",
      });
    }
  };

 const handleDownload = async (url: string | null, filename: string) => {
  if (!url) {
    toast({
      title: "Download Error",
      description: "No image available to download",
      variant: "destructive"
    });
    return;
  }

  try {
    let downloadUrl = url;
    const isFirebaseUrl = url.includes('firebasestorage.googleapis.com');

    // Handle Firebase Storage URLs
    if (isFirebaseUrl) {
      try {
        const storage = getStorage();
        // Extract the path from the URL
        const path = decodeURIComponent(url.split('/o/')[1].split('?')[0]);
        const fileRef = ref(storage, path);
        downloadUrl = await getDownloadURL(fileRef);
      } catch (firebaseError) {
        console.error('Failed to refresh Firebase URL:', firebaseError);
        // Fall back to original URL if refresh fails
      }
    }

    // Create a temporary anchor element
    const link = document.createElement('a');
    
    // Handle data URLs (for original drawings)
    if (downloadUrl.startsWith('data:')) {
      link.href = downloadUrl;
    } else {
      // For regular URLs, we need to fetch them first
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      link.href = URL.createObjectURL(blob);
    }

    // Set download attributes
    link.download = filename
      .replace(/[^a-zA-Z0-9-_.]/g, '') // Remove invalid characters
      .replace(/\s+/g, '_'); // Replace spaces with underscores
    
    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      if (!downloadUrl.startsWith('data:')) {
        URL.revokeObjectURL(link.href);
      }
    }, 100);

  } catch (error) {
    console.error('Download failed:', error);
    toast({
      title: "Download Failed",
      description: "Could not download the image. Please try again.",
      variant: "destructive"
    });
  }
};
  const shareUrl = useMemo(() => {
    return `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/creations/${creation.id}`;
  }, [creation.id]);
  const [isCopying, setIsCopying] = useState(false);
  const handleNativeShare = async () => {
    if (creation.id.startsWith('mock-')) return;

    setIsSharing(true);
    try {
      await navigator.share?.({
        title: displayTitle,
        text: `Check out my creation: ${displayTitle}`,
        url: shareUrl
      });
    } catch (err) {
      // Fallback to copy if share fails
      if (err instanceof Error && err.name !== 'AbortError') {
        handleCopyShareLink();
      }
    } finally {
      setIsSharing(false);
    }
  };
  const handleCopyShareLink = async () => {
    if (creation.id.startsWith('mock-')) {
      toast({ title: "Action Not Allowed", description: "Cannot copy share link for sample items.", variant: "destructive" });
      return;
    }

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied!",
        description: "A shareable link to this creation has been copied.",
      });
    } catch (err) {
      console.error("Failed to copy share link: ", err);
      toast({
        title: "Copy Failed",
        description: "Could not copy the shareable link.",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!user || creation.id.startsWith('mock-')) {
      toast({ title: "Action Not Allowed", description: "This action cannot be performed on placeholder items.", variant: "destructive" });
      return;
    }
    setIsTogglingPublish(true);
    const result: TogglePublishResult = await togglePublishStatus(creation.id, user.uid);
    setIsTogglingPublish(false);

    if (result.success) {
      if (result.newState !== undefined) setCreation(prev => ({ ...prev, isPublic: result.newState }));
      toast({
        title: result.newState ? "Published!" : "Unpublished!",
        description: `Your creation is now ${result.newState ? 'public' : 'private'}.`,
      });
      if (onPublishToggle) {
        onPublishToggle(); // Refresh parent list if needed
      }
      if (isDevModeActive && result.simulatedCost) {
        addSimulatedCost(result.simulatedCost);
      }
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update publish status.",
        variant: "destructive",
      });
    }
  };

  const handleUpscaleImage = async () => {
    if (!user || creation.id.startsWith('mock-')) {
      toast({ title: "Action Not Allowed", description: "This action cannot be performed on placeholder items or if not logged in.", variant: "destructive" });
      return;
    }
    if (creation.upscaledImageUrl) {
      toast({ title: "Already Upscaled", description: "This image has already been upscaled.", variant: "default" });
      return;
    }
    setIsUpscaling(true);
    const result: UpscaleImageResult = await upscaleCreationImage(creation.id, user.uid);
    setIsUpscaling(false);

    if (result.upscaledImageUrl) {
      setCreation(prev => ({ ...prev, upscaledImageUrl: result.upscaledImageUrl }));
      toast({
        title: "Image Upscaled!",
        description: "Your creation has been enhanced.",
      });
      if (isDevModeActive && result.simulatedCost) {
        addSimulatedCost(result.simulatedCost);
      }
    } else {
      toast({
        title: "Upscale Error",
        description: result.error || "Failed to upscale the image.",
        variant: "destructive",
      });
    }
  };


  const creationDate = new Date(creation.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  const isMockItem = creation.id.startsWith('mock-');
  const displayTitle = creation.title || (isMockItem ? "Sample Creation" : "My Squiggle Creation");
  const filenameSafeTitle = (creation.title || 'creation').replace(/\s+/g, '_').toLowerCase().substring(0, 30);


  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full bg-card">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-base md:text-lg truncate text-primary flex justify-between items-center gap-1">
          <span className="truncate" title={displayTitle}>{displayTitle}</span>
          {creation.isPublic && <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"><Globe className="h-3 w-3" />Public</span>}
        </CardTitle>
        <CardDescription className="text-xs md:text-sm text-muted-foreground">
          {creation.style ? `Style: ${creation.style.charAt(0).toUpperCase() + creation.style.slice(1)}` : ''} - {creationDate}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <Dialog>
          <DialogTrigger asChild>
            <div className="cursor-pointer relative group w-full">
              <AspectRatio ratio={16 / 9} className="bg-muted">
                {creation.transformedImageUrl ? (
                  <Image
                    src={creation.transformedImageUrl}
                    alt={displayTitle}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint={creation.style || "ai generated art"}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-secondary/30">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </AspectRatio>
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Eye className="h-10 w-10 md:h-12 md:w-12 text-white" />
              </div>
            </div>
          </DialogTrigger>
       <DialogContent className="sm:max-w-2xl md:max-w-4xl bg-background p-0 overflow-hidden max-h-[90vh]">
  <div className="flex flex-col h-full">
    {/* Header */}
    <DialogHeader className="p-6 pb-2 border-b top-0 bg-background z-10">
      <DialogModalTitle className="text-xl md:text-2xl text-primary flex items-center gap-2">
        <FileText className="h-6 w-6" /> {displayTitle}
      </DialogModalTitle>
      <DialogDesc className="text-muted-foreground">
        {creation.style ? `Style: ${creation.style.charAt(0).toUpperCase() + creation.style.slice(1)}` : ''} - Created on {creationDate}
      </DialogDesc>
    </DialogHeader>
     <div className="overflow-y-auto flex-1 px-4 md:px-6 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 p-4 md:p-6">
              <div className="flex flex-col gap-2 p-3 border rounded-lg shadow-sm">
                <h3 className="font-semibold text-center text-foreground">Original Squiggle</h3>
                <AspectRatio ratio={4 / 3} className="bg-muted rounded overflow-hidden">
                  {creation.originalDrawingUrl ? (
                    <Image src={creation.originalDrawingUrl} alt="Original Squiggle" fill className="object-contain" data-ai-hint="child drawing" />
                  ) : (
                    <div className="flex items-center justify-center h-full"><ImageIcon className="w-10 h-10 text-muted-foreground" /></div>
                  )}
                </AspectRatio>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleDownload(
                    creation.transformedImageUrl,
                    `transformed_squiggle_${filenameSafeTitle}_${creation.style}.png`
                  )}
                  className="flex-1 gap-1"
                  disabled={!creation.transformedImageUrl}
                >
                  <Download className="h-4 w-4" /> Download
                </Button>

              </div>

              <div className="flex flex-col gap-2 p-3 border-2 border-primary rounded-lg shadow-md">
                <h3 className="font-semibold text-center text-primary flex items-center justify-center gap-1">
                  <Sparkles className="h-5 w-5" /> Transformed Version <Sparkles className="h-5 w-5" />
                </h3>
                <AspectRatio ratio={4 / 3} className="bg-muted rounded overflow-hidden">
                  {creation.transformedImageUrl ? (
                    <Image src={creation.transformedImageUrl} alt={displayTitle} fill className="object-contain" data-ai-hint={creation.style || "ai generated art"} />
                  ) : (
                    <div className="flex items-center justify-center h-full"><ImageIcon className="w-10 h-10 text-muted-foreground" /></div>
                  )}
                </AspectRatio>
                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleDownload(creation.transformedImageUrl, `transformed_squiggle_${filenameSafeTitle}_${creation.style}.png`)}
                    className="flex-1 gap-1"
                    disabled={!creation.transformedImageUrl}
                  >
                    <Download className="h-4 w-4" /> Download
                  </Button>
                  {!creation.upscaledImageUrl && user && user.uid === creation.userId && !isMockItem && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleUpscaleImage}
                      disabled={isUpscaling || !creation.transformedImageUrl}
                      className="flex-1 gap-1"
                      title="Enhance and enlarge the image"
                    >
                      {isUpscaling ? <Loader2 className="animate-spin" /> : <ZoomIn className="h-4 w-4" />}
                      Upscale
                    </Button>
                  )}
                </div>
              </div>

              {creation.upscaledImageUrl && (
                <div className="lg:col-span-2 flex flex-col gap-2 p-3 border-2 border-accent rounded-lg shadow-md mt-2">
                  <h3 className="font-semibold text-center text-accent flex items-center justify-center gap-1">
                    <ZoomIn className="h-5 w-5" /> Upscaled & Enhanced Version
                  </h3>
                  <AspectRatio ratio={16 / 9} className="bg-muted rounded overflow-hidden"> {/* Or keep 4/3 if preferred for upscaled */}
                    <Image src={creation.upscaledImageUrl} alt={`Upscaled ${displayTitle}`} fill className="object-contain" data-ai-hint={`${creation.style} upscaled art`} />
                  </AspectRatio>
                  <Button
                    variant="outline"
                    className="border-accent text-accent hover:bg-accent/10 gap-1 mt-1 w-full"
                    size="sm"
                    onClick={() => handleDownload(creation.upscaledImageUrl ?? null, `upscaled_squiggle_${filenameSafeTitle}_${creation.style}.png`)}
                  >
                    <Download className="h-4 w-4" /> Download Upscaled
                  </Button>
                </div>
              )}
            </div>
            </div>

            <DialogFooter className="p-4 md:p-6 border-t flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                {user && user.uid === creation.userId && !isMockItem && (
                  <>
                    <Button
                      onClick={handleTogglePublish}
                      variant={creation.isPublic ? "destructive" : "default"}
                      disabled={isTogglingPublish || isMockItem}
                      className="w-full sm:w-auto gap-2"
                      title={isMockItem ? "Cannot publish sample item" : (creation.isPublic ? "Unpublish from Public Gallery" : "Publish to Public Gallery")}
                    >
                      {isTogglingPublish ? <Loader2 className="animate-spin h-4 w-4" /> : (creation.isPublic ? <ShieldOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />)}
                      {creation.isPublic ? "Unpublish" : "Publish"}
                    </Button>
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => setIsShareOpen(true)}
                        disabled={creation.id.startsWith('mock-')}
                        title="Share this creation"
                      >
                        <Share2 className="h-4 w-4" /> Share
                      </Button>

                      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Share Creation</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <Button
                              variant="outline"
                              onClick={handleCopyShareLink}
                              disabled={isCopying}
                              className="justify-start gap-2"
                            >
                              {isCopying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CopyIcon className="h-4 w-4" />
                              )}
                              {isCopying ? "Copying..." : "Copy Link"}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={handleNativeShare}
                              disabled={isSharing || !navigator.share}
                              className="justify-start gap-2"
                            >
                              {isSharing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Share2 className="h-4 w-4" />
                              )}
                              {isSharing ? "Sharing..." : "Share Via..."}
                            </Button>

                            {creation.isPublic && (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  const tweetText = `Check out my creation! ${shareUrl}`;
                                  window.open(
                                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`,
                                    '_blank',
                                    'noopener,noreferrer'
                                  );
                                  setIsShareOpen(false);
                                }}
                                className="justify-start gap-2"
                              >
                                <Twitter className="h-4 w-4" />
                                Share on Twitter
                              </Button>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="text-muted-foreground">
                            <Film className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Video Generation - Coming Soon!</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
                {!isMockItem && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyShareLink}
                    className="gap-1"
                    title="Copy shareable link to this creation"
                  >
                    <CopyIcon className="mr-2 h-4 w-4" />
                    {isCopying ? "Copying..." : "Copy Link"}
                  </Button>
                )
                }

              </div>
              <DialogClose asChild>
                <Button type="button" variant="secondary" className="w-full sm:w-auto">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
      <CardFooter className="p-3 md:p-4 bg-muted/30 border-t flex items-center gap-2">

        <Button
          variant="secondary"
          className="w-full gap-1 text-sm"
          onClick={() => handleDownload(creation.transformedImageUrl, `transformed_squiggle_${filenameSafeTitle}_${creation.style}.png`)}
          disabled={!creation.transformedImageUrl}
          size="sm"
        >
          <Download className="h-4 w-4" /> Download
        </Button>
        <>
          <Button
            onClick={() => setIsDeleteDialogOpen(true)}
            variant="destructive"
            size="sm"
            className="gap-1"
            title="Delete this creation"
          >
            <Trash className="h-4 w-4" /> Delete
          </Button>

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your creation

                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90 text-white"
                >
                  {isDeleting ? <Loader2 className="animate-spin h-4 w-4" /> : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>

        {/* { <Button
                onClick={handleTogglePublish}
                variant={creation.isPublic ? "outline" : "default"}
                className="flex-1 gap-1 text-sm"
                disabled={isTogglingPublish || isMockItem}
                size="sm"
                title={isMockItem ? "Cannot publish sample item" : (creation.isPublic ? "Make Private" : "Publish")}
            >
            {isTogglingPublish ? <Loader2 className="animate-spin h-4 w-4" /> : (creation.isPublic ? <ShieldOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />)}
            {creation.isPublic ? "Make Private" : "Publish"}
            </Button>} */}




      </CardFooter>
    </Card>
  );
}
