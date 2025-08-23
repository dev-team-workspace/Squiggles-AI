
"use client";

import Link from 'next/link';
import { Paintbrush, GalleryHorizontal, LogIn, LogOut, UserCircle, Coins, Compass, AlertTriangle, User as UserIcon, Sun, Moon, Bell, Newspaper, CheckCheck, Info, XCircle, Sparkles, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoIcon } from '@/components/icons/logo-icon';
import { useAuthContext } from '@/providers/firebase-provider';
import { auth } from '@/lib/firebase-client';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from '@/providers/theme-provider';
import React, { useEffect, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { NotificationItem, NotificationType } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import BuyCreditsDialog from '../credits/buy-credits-dialog';

function getNotificationIcon(type: NotificationItem['type']): React.ReactNode {
  switch (type) {
    case 'success':
      return <CheckCheck className="h-5 w-5 text-green-500" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'info':
      return <Info className="h-5 w-5 text-blue-500" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'daily-style':
      return <Sparkles className="h-5 w-5 text-yellow-500" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
}

export default function AppNavbar() {

  const {
    user,
    profile,
    loadingProfile,
    deactivateMockSession,
    isDevModeActive,
    simulatedSessionCost,
    notifications,
    hasUnreadNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead
  } = useAuthContext();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSignOut() {
    deactivateMockSession();
    try {
      await firebaseSignOut(auth);
      router.push('/auth/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  useEffect(() => {
    if (!user?.uid) {
      setIsAdmin(false);
      return;
    }

    const verifyAdmin = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/admin/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) throw new Error("Admin check failed");
        const { isAdmin } = await res.json();
        setIsAdmin(isAdmin === true);
      } catch (err) {
        console.error("Admin verification failed:", err);
        setIsAdmin(false);
      }
    };

    verifyAdmin();
  }, [user?.uid]);
  // useEffect(() => {
  //   const verifyAdmin = async () => {
  //     if (!user?.uid) return;

  //     try {
  //       const token = await user.getIdToken();
  //       const res = await fetch("/api/admin/check", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ token }),
  //       });

  //       if (!res.ok) throw new Error("Admin check failed");

  //       const { isAdmin } = await res.json();
  //       setIsAdmin(isAdmin === true);
  //     } catch (err) {
  //       console.error("Admin verification failed:", err);
  //       setIsAdmin(false);
  //     }
  //   };

  //   verifyAdmin();
  // }, [user]);
  function handleBellClick() {
    if (hasUnreadNotifications) {
      markAllNotificationsAsRead();
    }
  }
  const w = 4;


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-2 sm:px-4">
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2" prefetch={false}>
          <LogoIcon className="h-7 w-7 sm:h-8 sm:w-8" />
          <span className="text-lg sm:text-xl font-bold text-primary">Squiggles</span>
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1 md:gap-2">
          {isDevModeActive && (
            <div className="mr-1 md:mr-2 flex items-center gap-1 px-1 py-0.5 sm:px-1.5 sm:py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-600 rounded-md">
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-700 dark:text-yellow-500" />
              <span className="hidden xs:inline">Dev Mode</span>
              {simulatedSessionCost > 0 && (
                <span className="font-semibold ml-1 hidden sm:inline">Cost: ${simulatedSessionCost.toFixed(4)}</span>
              )}
            </div>
          )}
          <div className="hidden md:flex">
            {/* <Button variant="ghost" asChild size="sm" className="px-1.5 sm:px-2 md:px-3 h-8 sm:h-9">
            <Link href="/draw" className="flex items-center gap-1 text-sm">
              <Paintbrush className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Draw Squiggles</span>
            </Link>
            </Button> */}
            <Button variant="ghost" asChild size="sm" className="px-1.5 sm:px-2 md:px-3 h-8 sm:h-9">
              <Link href="/draw" className="flex items-center gap-1 text-sm md:text-base">
                <Paintbrush className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Draw Squiggles</span>
              </Link>
            </Button>
            <Button variant="ghost" asChild size="sm" className="px-2 md:px-3 h-8 sm:h-9">
              <Link href="/public-gallery" className="flex items-center gap-1 text-sm md:text-base">
                <Compass className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Public Gallery</span>
              </Link>
            </Button>
            

            <Button variant="ghost" asChild size="sm" className="px-2 md:px-3 h-8 sm:h-9">
              <Link href="/news" className="flex items-center gap-1 text-sm md:text-base">
                <Newspaper className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">News</span>
              </Link>
            </Button>
            {user && (
              <Button variant="ghost" asChild size="sm" className="px-2 md:px-3 h-8 sm:h-9">
                <Link href="/gallery" className="flex items-center gap-1 text-sm md:text-base">
                  <GalleryHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">My Gallery</span>
                </Link>
              </Button>
            )}
            {isAdmin && (
              <Button variant="ghost" asChild size="sm" className="px-2 md:px-3 h-8 sm:h-9 text-base bg-accent hover:bg-accent/90 text-accent-foreground ml-2">
                <Link href="/admin/dashboard" className="flex items-center gap-1 text-sm md:text-base">
                  <Compass className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Admin Dashboard</span>
                </Link>
              </Button>
            )}
          </div>
          {user && !isDevModeActive && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  className="flex items-center gap-1 text-xs text-foreground px-1 py-0.5 sm:px-1.5 sm:py-1 bg-accent/10 border border-accent/30 rounded-md hover:bg-accent/20 cursor-pointer"
                  title="Your Credits"
                >
                  <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                  {loadingProfile ? (
                    <Skeleton className="h-3 w-6" />
                  ) : (
                    <span className="font-semibold text-primary text-xs sm:text-sm">
                      {Number(profile?.credits ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: w })}

                    </span>
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Credits: {profile?.credits ?? 0}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <BuyCreditsDialog>
                    <button className="flex items-center w-full">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Buy More Credits
                    </button>
                  </BuyCreditsDialog>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user && isDevModeActive && (
            <div className="flex items-center gap-1 text-xs text-foreground px-1 py-0.5 sm:px-1.5 sm:py-1 bg-green-500/10 border border-green-500/30 rounded-md" title="Dev Mode Credits">
              <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span className="font-semibold text-green-700 text-xs sm:text-sm">999+</span>
            </div>
          )}


          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              className="ml-0.5 sm:ml-1 h-7 w-7 sm:h-8 sm:w-9"
            >
              {theme === 'light' ? <Moon className="h-4 w-4 sm:h-5 sm:w-5" /> : <Sun className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
          )}

          <DropdownMenu onOpenChange={(open) => { if (open && hasUnreadNotifications) markAllNotificationsAsRead(); }}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="ml-0.5 sm:ml-1 relative h-7 w-7 sm:h-8 sm:w-9"
              // onClick={handleBellClick} // onClick logic moved to onOpenChange
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {mounted && hasUnreadNotifications && (
                  <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 block h-2 w-2 rounded-full bg-red-500 ring-1 sm:ring-2 ring-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 md:w-96 p-0">
              <DropdownMenuLabel className="flex justify-between items-center px-3 py-2 border-b">
                <span className="font-semibold text-base">Notifications</span>
                {notifications.length > 0 && hasUnreadNotifications && (
                  <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={(e) => { e.stopPropagation(); markAllNotificationsAsRead(); }}>
                    Mark all as read
                  </Button>
                )}
              </DropdownMenuLabel>
              <ScrollArea className="max-h-[400px]">
                {notifications.length === 0 ? (
                  <DropdownMenuItem disabled className="text-muted-foreground text-center py-8 px-3 text-sm">
                    No new notifications right now.
                  </DropdownMenuItem>
                ) : (
                  notifications.map(notif => (
                    <React.Fragment key={notif.id}>
                      <DropdownMenuItem
                        className={cn(
                          "flex items-start gap-3 p-3 hover:bg-accent/10 data-[highlighted]:bg-accent/10", // Removed cursor-default
                          !notif.read && "bg-primary/5 hover:bg-primary/10"
                        )}
                        onSelect={(e) => {
                          e.preventDefault(); // Prevent closing dropdown on item click
                          markNotificationAsRead(notif.id);
                          // Optionally navigate if notification has a link
                        }}
                      >
                        <div className="mt-0.5 shrink-0 relative">
                          {getNotificationIcon(notif.type)}
                          {!notif.read && (
                            <span className="absolute -left-1 -top-1 block h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-grow">
                          <div className={cn("font-semibold text-sm", !notif.read ? "text-foreground" : "text-muted-foreground")}>{notif.title}</div>
                          {notif.description && <div className={cn("text-xs prose prose-sm dark:prose-invert", !notif.read ? "text-muted-foreground" : "text-muted-foreground/70")}>{notif.description}</div>}
                          <p className={cn("text-xs mt-1", !notif.read ? "text-muted-foreground/80" : "text-muted-foreground/60")}>
                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-0 last:hidden" />
                    </React.Fragment>
                  ))
                )}
              </ScrollArea>
              {notifications.length > 0 && (
                <DropdownMenuItem
                  className="justify-center text-xs text-muted-foreground hover:bg-accent/10 py-2 border-t"
                  onSelect={(e) => {
                    e.preventDefault();
                    markAllNotificationsAsRead();
                  }}
                  disabled={!hasUnreadNotifications}
                >
                  Mark all as read
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative w-14 h-10 sm:w-14 sm:h-10 rounded-full ml-1">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={profile?.avatarUrl || profile?.photoURL || user.photoURL || undefined} alt={profile?.displayName || user.displayName || user.email || 'User'} />
                    <AvatarFallback>
                      {user.email ? user.email.charAt(0).toUpperCase() : <UserCircle className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.displayName || user.displayName || 'Squiggle Artist'}
                    </p>
                    {user.email && <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>}
                    {profile?.funnyUsername && <p className="text-xs leading-none text-primary mt-1">AKA: {profile.funnyUsername}</p>}
                    {isDevModeActive && simulatedSessionCost > 0 && (
                      <p className="text-xs leading-none text-yellow-800 dark:text-yellow-400 mt-1">Simulated Cost: ${simulatedSessionCost.toFixed(4)}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                      <Coins className="h-4 w-4 text-primary" />
                      <span>Credits : {profile?.credits ?? 0}</span>
                      {loadingProfile && !isDevModeActive ? (
                        <Skeleton className="h-3 w-6" />
                      ) : (
                        <span className="font-semibold text-primary">{isDevModeActive ? "999+" :""}</span>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile" className="flex items-center w-full">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <div className="md:hidden"> {/* Links shown only on mobile dropdown */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/public-gallery" className="flex items-center w-full">
                      <Compass className="mr-2 h-4 w-4" /> Public Gallery
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/news" className="flex items-center w-full">
                      <Newspaper className="mr-2 h-4 w-4" /> News
                    </Link>
                  </DropdownMenuItem>
                  {user && (
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/gallery" className="flex items-center w-full">
                        <GalleryHorizontal className="mr-2 h-4 w-4" /> My Gallery
                      </Link>
                    </DropdownMenuItem>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="default" asChild size="sm" className="ml-1 sm:ml-2 h-8 sm:h-9">
              <Link href="/auth/signin" className="flex items-center gap-1 text-sm">
                <LogIn className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden xs:inline">Sign In</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
