"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { getAuth, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase-client"; // Make sure this is properly initialized

export function DeleteButton({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleDelete() {
  setLoading(true);
  
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Authentication required. Please sign in.");
    }

    // Force refresh the token and get a fresh one
    const freshToken = await user.getIdToken(true);
    console.log("Using fresh token:", freshToken.slice(0, 10) + "...");

    const response = await fetch("/api/admin/blog/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${freshToken}`
      },
      body: JSON.stringify({ postId }),
    });

    // if (!response.ok) {
    //   const errorData = await response.json();
    //   if (errorData.code === "TOKEN_EXPIRED" || response.status === 401) {
    //     // Force logout and redirect
    //     await auth.signOut();
    //     router.push("/auth/signin");
    //     toast({
    //       title: "Session expired",
    //       description: "Please sign in again",
    //       variant: "destructive",
    //     });
    //     return;
    //   }
    //   throw new Error(errorData.error || "Delete failed");
    // }

    // Success case
    toast({ title: "Success", description: "Post deleted" });
    router.refresh();
    router.push("/admin/news/list");

  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive"
    });
  } finally {
    setLoading(false);
    setOpen(false);
  }
}

  return (
    <>
      <Button
        variant="destructive"
        size="icon"
        onClick={() => setOpen(true)}
        disabled={loading}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the blog post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}