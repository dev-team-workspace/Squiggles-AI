// src/components/layout/footer.tsx
"use client";

import Link from 'next/link';
import { Instagram, Youtube, Twitter as XIcon } from 'lucide-react'; // Removed Facebook
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type React from 'react';

// TikTokIcon component removed as it's no longer used

const socialLinks = [
  // Facebook entry removed
  { name: 'X', href: 'https://x.com/SquigglesAi', icon: XIcon, ariaLabel: 'Follow Squiggles on X' },
  { name: 'Instagram', href: 'https://www.instagram.com/squigglesai/', icon: Instagram, ariaLabel: 'Follow Squiggles on Instagram' },
  { name: 'YouTube', href: 'https://www.youtube.com/@SquigglesAi', icon: Youtube, ariaLabel: 'Subscribe to Squiggles on YouTube' },
  // TikTok entry removed
];

export default function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t border-border/40 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground">
              &copy; {currentYear} Squiggles. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Turn your imagination into magic!
            </p>
          </div>
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <Button
                key={social.name}
                variant="ghost"
                size="icon"
                asChild
                aria-label={social.ariaLabel}
                title={social.ariaLabel}
              >
                <Link href={social.href} target="_blank" rel="noopener noreferrer">
                  <social.icon className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <Separator className="my-6" />
        <div className="text-center text-xs text-muted-foreground/70 space-x-3">
          <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <span>&bull;</span>
          <Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
