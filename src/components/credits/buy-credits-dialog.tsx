
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Coins, Zap, Rocket, Loader2 } from "lucide-react";
import { useState } from "react";
import { createStripeCheckoutSession } from "@/lib/actions";
import { useAuthContext } from "@/providers/firebase-provider";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_PRICE_IDS, CreditPackID } from "@/lib/stripe-config";

interface CreditPack {
  id: CreditPackID;
  name: string;
  price: number;
  credits: number;
  description: string;
  bonusInfo?: string;
  icon: React.ElementType;
  // envVarName: string; // To fetch price ID from env
}

// Updated credit pack values for better sustainability
const creditPacks: CreditPack[] = [
  {
    id: "basic",
    name: "Spark Pack",
    price: 5,
    credits: 60,
    description: "Get started with a boost of credits.",
    icon: Zap,
  },
  {
    id: "plus",
    name: "Creator Pack",
    price: 10,
    credits: 130,
    description: "More credits, more creations!",
    bonusInfo: "Good Value!",
    icon: Coins,
  },
  {
    id: "pro",
    name: "Imagination Pack",
    price: 25,
    credits: 350,
    description: "Unleash your full creative potential.",
    bonusInfo: "Best Value!",
    icon: Rocket,
  },
];


interface BuyCreditsDialogProps {
  children: React.ReactNode;
  onPurchaseSuccess?: () => void;
}

export default function BuyCreditsDialog({ children, onPurchaseSuccess }: BuyCreditsDialogProps) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleBuyCredits = async (pack: CreditPack) => {
    console.log("[BuyCredits] Button clicked for:", pack);

    if (!user) {
      console.warn("[BuyCredits] No user found.");
      toast({ title: "Authentication Required", description: "Please sign in to buy credits.", variant: "destructive" });
      return;
    }

    if (!user.email) {
      console.warn("[BuyCredits] No user email.");
      toast({ title: "Email Required", description: "Your account needs an email address to proceed with payments.", variant: "destructive" });
      return;
    }

    const priceId = STRIPE_PRICE_IDS[pack.id];
    console.log(`[BuyCredits] Using priceId for '${pack.id}':`, priceId);

    if (!priceId || priceId.startsWith("YOUR_") || priceId.includes("_PLACEHOLDER") || priceId.includes("_HERE")) {
      console.error(`[BuyCredits] Invalid Stripe Price ID for '${pack.name}' (env key: ${pack.id}) →`, priceId);
      toast({ title: "Configuration Error", description: `Pricing for '${pack.name}' is not available. Please check app configuration.`, variant: "destructive" });
      return;
    }

    setIsLoading(pack.id);
    console.log("[BuyCredits] Set loading to:", pack.id);

    try {
      console.log("[BuyCredits] Calling createStripeCheckoutSession...");
      const result = await createStripeCheckoutSession(user.uid, user.email, pack.credits);

      console.log("[BuyCredits] createStripeCheckoutSession result:", result);

      if (result.error || !result.sessionId || !result.publishableKey) {
        console.error("[BuyCredits] Invalid result from Stripe session:", result);
        toast({ title: "Payment Error", description: result.error || "Could not initiate payment.", variant: "destructive" });
        setIsLoading(null);
        return;
      }

      console.log("[BuyCredits] Loading Stripe with publishableKey...");
      const stripe = await loadStripe(result.publishableKey);
      if (!stripe) {
        console.error("[BuyCredits] Stripe failed to load.");
        toast({ title: "Payment Error", description: "Could not load Stripe.", variant: "destructive" });
        setIsLoading(null);
        return;
      }

      console.log("[BuyCredits] Redirecting to Stripe checkout...");
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId: result.sessionId });

      if (stripeError) {
        console.error("[BuyCredits] redirectToCheckout error:", stripeError);
        toast({ title: "Payment Error", description: stripeError.message || "Failed to redirect to Stripe.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("[BuyCredits] Unexpected error:", error);
      toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      console.log("[BuyCredits] Resetting loading.");
      setIsLoading(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[750px] bg-background p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl md:text-3xl font-bold text-primary text-center">
            Boost Your Squiggle Power!
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Choose a credit pack that suits your creative journey. More credits, more magic!
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-stretch pb-8">
          {creditPacks.map((pack) => (
            <Card key={pack.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="items-center text-center pb-3">
                <pack.icon className="h-10 w-10 text-accent mb-2" />
                <CardTitle className="text-xl font-semibold text-primary">{pack.name}</CardTitle>
                <CardDescription className="text-sm h-10">{pack.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow text-center space-y-1">
                <p className="text-3xl font-bold text-foreground">${pack.price}</p>
                <p className="text-lg font-medium text-primary">{pack.credits.toLocaleString()} Credits</p>
                {pack.bonusInfo && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold bg-green-100 dark:bg-green-800/30 px-2 py-0.5 rounded-full inline-block">
                    {pack.bonusInfo}
                  </p>
                )}
              </CardContent>
              <CardFooter className="p-4 mt-2">
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => handleBuyCredits(pack)}
                  disabled={isLoading === pack.id}
                >
                  {isLoading === pack.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <CheckCircle />
                  )}
                  Get {pack.credits.toLocaleString()} Credits
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        <DialogFooter className="p-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center w-full">
            Payments are securely processed by Stripe. You can use credit/debit cards and other methods like PayPal if enabled by Stripe.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
