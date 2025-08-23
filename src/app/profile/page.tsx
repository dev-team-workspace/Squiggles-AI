
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/providers/firebase-provider';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuthRedirect } from '@/hooks/use-auth-redirect';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateAndSaveFunnyName, generateAndSaveAvatar, updateUserCredits } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Coins, Edit3, Loader2, Mail, User, Wand2, RefreshCw, Image as ImageIcon, Camera } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import BuyCreditsDialog from '@/components/credits/buy-credits-dialog';
import NextImage from 'next/image'; // Renamed to avoid conflict with Lucide's Image icon
import type { GenerateAvatarResult } from "@/types";


const MAX_AVATAR_REGENS_PER_DAY = 3; // Ensure this matches actions.ts

function DoodledAvatarPlaceholder() {
  return (
    <div
      className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-primary/10 border-4 border-primary/30 flex items-center justify-center shadow-lg overflow-hidden"
      data-ai-hint="doodle portrait sketch"
    >
      {/* Simple SVG doodle face */}
      <svg viewBox="0 0 100 100" className="w-20 h-20 md:w-24 md:h-24 text-primary opacity-70">
        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="3" fill="none" />
        <circle cx="35" cy="40" r="5" fill="currentColor" />
        <circle cx="65" cy="40" r="5" fill="currentColor" />
        <path d="M30 65 Q50 75 70 65" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M45 25 Q50 15 55 25" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M55 25 Q60 15 65 25" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      <Wand2 className="absolute w-8 h-8 text-accent opacity-90 transform translate-x-10 -translate-y-10 animate-pulse" />
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading, addSimulatedCost, isDevModeActive, refreshProfile } = useAuthRedirect({ requireAuth: true, redirectTo: '/auth/signin' });
  const { profile, loadingProfile, profileError } = useUserProfile();
  const { toast } = useToast();

  const [currentFunnyName, setCurrentFunnyName] = useState<string | null | undefined>(null);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null | undefined>(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [remainingAvatarRegens, setRemainingAvatarRegens] = useState<number>(MAX_AVATAR_REGENS_PER_DAY);

  useEffect(() => {
    if (profile) {
      setCurrentFunnyName(profile.funnyUsername);
      setCurrentAvatarUrl(profile.avatarUrl);
      const todayISO = new Date().toISOString().split('T')[0];
      if (profile.avatarLastRegenAt && profile.avatarLastRegenAt.split('T')[0] === todayISO) {
        setRemainingAvatarRegens(MAX_AVATAR_REGENS_PER_DAY - (profile.avatarRegenCountToday || 0));
      } else {
        setRemainingAvatarRegens(MAX_AVATAR_REGENS_PER_DAY); // Reset if last regen was not today
      }
    }
  }, [profile]);

  const handleGenerateName = useCallback(async (isInitial = false) => {
  if (!user || !profile) {
    if (!isInitial) {
      toast({ title: "Error", description: "User or profile not available.", variant: "destructive" });
    }
    return;
  }

  // Check credits in production mode
  if (!isDevModeActive && (profile.credits || 0) < 1) {
    toast({ 
      title: "Insufficient Credits", 
      description: "You need at least 1 credit to generate a new name.", 
      variant: "destructive" 
    });
    return;
  }

  setIsGeneratingName(true);
  try {
    const result = await generateAndSaveFunnyName(user.uid);
    if (result.funnyName) {
      // Deduct credit in production mode
      if (!isDevModeActive) {
        await updateUserCredits(user.uid, (profile.credits || 0) - 0.0005);
      }
      
      setCurrentFunnyName(result.funnyName);
      toast({ title: "New Name Generated!", description: `You are now known as ${result.funnyName}!` });
      if (isDevModeActive && result.simulatedCost) {
        addSimulatedCost(result.simulatedCost);
      }
      await refreshProfile(); // Refresh profile context
    } else {
      toast({ title: "Name Generation Failed", description: result.error || "Could not generate a new name.", variant: "destructive" });
    }
  } catch (error: any) {
    toast({ title: "Error", description: error.message || "Failed to generate name.", variant: "destructive" });
  } finally {
    setIsGeneratingName(false);
  }
}, [user, profile, toast, addSimulatedCost, isDevModeActive, refreshProfile]);
  useEffect(() => {
    if (user && profile && !profile.funnyUsername && !authLoading && !loadingProfile && !currentFunnyName && !isGeneratingName) {
      console.log("[ProfilePage] Profile loaded, no funny username found. Generating initial name.");
      handleGenerateName(true);
    }
  }, [user, profile, authLoading, loadingProfile, currentFunnyName, isGeneratingName, handleGenerateName]);

  const handleGenerateAvatar = useCallback(async () => {
  if (!user || !profile) {
    toast({ title: "Error", description: "User not available.", variant: "destructive" });
    return;
  }

  // Check credits in production mode
  if (!isDevModeActive && (profile.credits || 0) < 1) {
    toast({ 
      title: "Insufficient Credits", 
      description: "You need at least 1 credit to generate a new avatar.", 
      variant: "destructive" 
    });
    return;
  }

  // Check daily regeneration limit
  if (remainingAvatarRegens <= 0) {
    toast({ 
      title: "Daily Limit Reached", 
      description: "You've reached your daily avatar regeneration limit.", 
      variant: "destructive" 
    });
    return;
  }

  setIsGeneratingAvatar(true);
  try {
    const result: GenerateAvatarResult = await generateAndSaveAvatar(user.uid);
    if (result.avatarUrl) {
      // Deduct credit in production mode
      if (!isDevModeActive) {
        await updateUserCredits(user.uid, (profile.credits || 0) - 0.0020);
      }
      
      setCurrentAvatarUrl(result.avatarUrl);
      setRemainingAvatarRegens(result.remainingRegens !== undefined ? result.remainingRegens : 0);
      toast({ title: "New Avatar Generated!", description: `Your new avatar is ready!` });
      if (isDevModeActive && result.simulatedCost) {
        addSimulatedCost(result.simulatedCost);
      }
      await refreshProfile();
    } else {
      toast({ title: "Avatar Generation Failed", description: result.error || "Could not generate a new avatar.", variant: "destructive" });
      if (result.remainingRegens !== undefined) {
        setRemainingAvatarRegens(result.remainingRegens);
      }
    }
  } catch (error: any) {
    toast({ title: "Error", description: error.message || "Failed to generate avatar.", variant: "destructive" });
  } finally {
    setIsGeneratingAvatar(false);
  }
}, [user, profile, toast, addSimulatedCost, isDevModeActive, refreshProfile, remainingAvatarRegens]);

  if (authLoading || (!user && !profileError)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-var(--navbar-height,4rem)-var(--page-padding,4rem))]">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  if (!user) {
    return null;
  }
  const credits = Number(profile?.credits ?? 0);

  const displayedName = currentFunnyName || profile?.funnyUsername || 'Mysterious Squiggler';
  const avatarToDisplay = currentAvatarUrl || profile?.avatarUrl;
  const canRegenAvatar = remainingAvatarRegens > 0;

  return (
    <div className="container mx-auto py-8 px-4 flex justify-center">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center items-center pb-4">
          {loadingProfile && !avatarToDisplay ? (
            <Skeleton className="w-32 h-32 md:w-40 md:h-40 rounded-full" />
          ) : avatarToDisplay ? (
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-primary/30 shadow-lg overflow-hidden">
              <NextImage src={avatarToDisplay} alt="User Avatar" layout="fill" objectFit="cover" data-ai-hint="profile avatar doodle art" />
            </div>
          ) : (
            <DoodledAvatarPlaceholder />
          )}
          <CardTitle className="text-2xl md:text-3xl font-bold text-primary mt-4 flex items-center gap-2">
            {loadingProfile && !currentFunnyName ? <Skeleton className="h-8 w-48" /> : displayedName}
          </CardTitle>
          {profile?.email && (
            <CardDescription className="text-sm text-muted-foreground flex items-center gap-1">
              <Mail className="h-4 w-4" /> {profile.email}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center text-center p-4 border rounded-lg bg-card-foreground/5">
            <h3 className="text-lg font-semibold text-foreground mb-2">Your Doodle Avatar:</h3>
            <Button
              onClick={handleGenerateAvatar}
              disabled={isGeneratingAvatar || loadingProfile || !canRegenAvatar}
              variant="default"
              size="sm"
              className="mt-1 mb-2 gap-2 w-full sm:w-auto"
            >
              {isGeneratingAvatar ? <Loader2 className="animate-spin" /> : <Camera />}
              {isGeneratingAvatar ? "Creating..." : "Generate New Avatar"}
            </Button>
            {/* <p className="text-xs text-muted-foreground">
              {loadingProfile ? <Skeleton className="h-4 w-24" /> : `Regenerations left today: ${remainingAvatarRegens} / ${MAX_AVATAR_REGENS_PER_DAY}`}
            </p> */}
            {loadingProfile ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <p className="text-xs text-muted-foreground">
                Regenerations left today: {remainingAvatarRegens} / {MAX_AVATAR_REGENS_PER_DAY}
              </p>
            )}
            {!canRegenAvatar && !loadingProfile && (
              <p className="text-xs text-destructive mt-1">Daily limit reached. Try again tomorrow!</p>
            )}
          </div>


          <div className="flex flex-col items-center text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Your Unique Squiggle Name:</h3>
            {loadingProfile && !currentFunnyName ? (
              <Skeleton className="h-10 w-64 mb-2" />
            ) : (
              <p className="text-2xl font-bold text-accent bg-accent/10 px-4 py-2 rounded-md">
                {displayedName}
              </p>
            )}
            <Button
              onClick={() => handleGenerateName(false)}
              disabled={isGeneratingName || loadingProfile}
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
            >
              {isGeneratingName ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Regenerate Funny Name
            </Button>
          </div>

         <div className="text-center p-4 border rounded-lg bg-card-foreground/5">
  <h3 className="text-lg font-semibold text-foreground mb-1">Squiggle Credits:</h3>
  <div className="flex items-center justify-center gap-2 text-3xl font-bold text-primary my-2">
    
    <Coins className="h-8 w-8 text-primary" />
   <span>
  {loadingProfile && !isDevModeActive ? (
    <Skeleton className="h-8 w-16 inline-block" />
  ) : (
    `${credits.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} Credits`
  )}
</span>
  </div>
  <p className="text-xs text-muted-foreground mb-3">
    {isDevModeActive && "Each AI transformation costs 1 credit."}
  </p>
  {!isDevModeActive ? (
    <BuyCreditsDialog>
      <Button variant="secondary" size="lg" className="w-full sm:w-auto">
        <Coins className="mr-2 h-5 w-5" /> Buy More Credits
      </Button>
    </BuyCreditsDialog>
  ) : (
    <div className="flex gap-2 justify-center">
      <Button 
        variant="secondary" 
        size="sm"
        onClick={async () => {
          if (user?.uid) {
            const currentCredits = profile?.credits || 0;
            const result = await updateUserCredits(user.uid, currentCredits + 10);
            console.log(result)
            if (result.success) {
              toast({ title: "Credits Added", description: "Added 10 credits (dev mode)" });
              await refreshProfile();
            }
          }
        }}
      >
        <Coins className="mr-2 h-4 w-4" /> Add 10 Credits (Dev)
      </Button>
      <Button 
        variant="secondary" 
        size="sm"
        onClick={async () => {
          if (user?.uid) {
            const result = await updateUserCredits(user.uid, 0);
            if (result.success) {
              toast({ title: "Credits Reset", description: "Reset credits to 0 (dev mode)" });
              await refreshProfile();
            }
          }
        }}
      >
        <Coins className="mr-2 h-4 w-4" /> Reset Credits (Dev)
      </Button>
    </div>
  )}
  {isDevModeActive && (
    <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-2">
      (Dev Mode: Credits can be manually adjusted)
    </p>
  )}
</div>

          {profileError && (
            <p className="text-sm text-destructive text-center">{profileError}</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center pt-4">
          <p className="text-xs text-muted-foreground text-center">
            Have fun squiggling and bringing your art to life!
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
