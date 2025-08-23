
// src/app/payment-success/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserProfile } from "@/hooks/useUserProfile";
import { CheckCircle, Coins } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { profile, loadingProfile } = useUserProfile();
  const { toast } = useToast();

  useEffect(() => {
    if (sessionId) {
      // You might want to verify the session on the server-side here for extra security
      // or ensure the webhook has processed before confirming to the user.
      // For now, we assume the webhook will handle credit update.
      toast({
        title: "Payment Successful!",
        description: "Your credits should be updated shortly. Thanks for your purchase!",
        variant: "default",
        duration: 5000,
      });
    }
  }, [sessionId, toast]);
  if (!sessionId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">No payment session found</h2>
        <p>Please return to the homepage or try purchasing again.</p>
        <Button asChild className="mt-4">
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-12">
      <Card className="w-full max-w-md shadow-xl text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-800 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Payment Successful!</CardTitle>
          <CardDescription className="text-muted-foreground">
            Thank you for your purchase. Your credits should be updated in your account soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            If you don't see your credits updated within a few minutes, please refresh the page or contact support.
          </p>
          {loadingProfile && <p>Checking your new credit balance...</p>}
          {!loadingProfile && profile && (
            <div className="text-lg font-semibold flex items-center justify-center gap-2">
              <Coins className="h-6 w-6 text-accent" /> Current Credits: {profile.credits || 0}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild size="lg">
            <Link href="/">Back to Drawing</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/gallery">View Gallery</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
