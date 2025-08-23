"use client";

import { useAuthRedirect } from "@/hooks/use-auth-redirect"; 
import { Loader2 } from 'lucide-react';
import dynamic from "next/dynamic";

// Dynamically import the drawing canvas with SSR disabled
const DrawingCanvas = dynamic(
  () => import('@/components/drawing/drawing-canvas'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    )
  }
);

export default function DrawPage() {
  const { user, loading: authLoading } = useAuthRedirect({ 
    requireAuth: true, 
    redirectTo: '/auth/signin' 
  });

  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Getting your art tools ready...🎨</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <DrawingCanvas />
    </div>
  );
}