
// src/app/payment-cancelled/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import Link from "next/link";

export default function PaymentCancelledPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-12">
      <Card className="w-full max-w-md shadow-xl text-center">
        <CardHeader>
           <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-800 mb-4">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-destructive">Payment Cancelled</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your payment was cancelled or something went wrong. Your credits have not been updated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            If you encountered an issue, please try again or contact support if the problem persists.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild size="lg">
            <Link href="/">Back to Drawing</Link>
          </Button>
         
        </CardFooter>
      </Card>
    </div>
  );
}
