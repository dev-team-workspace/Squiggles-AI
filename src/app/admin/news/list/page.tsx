"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
import { getBlogPosts } from "@/lib/actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { DeleteButton } from "@/components/blog/deletebutton";
import { BlogPost } from "@/types";

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      console.log("[DEBUG] auth.currentUser at page load:", auth.currentUser);

      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        console.log("[DEBUG] onAuthStateChanged fired. User:", user);

        if (!user) {
          setError("You must be signed in to view this page.");
          setLoading(false);
          return;
        }

        try {
          const userDocRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userDocRef);
          console.log("[DEBUG] Fetched Firestore user document:", userSnap.data());

          if (userSnap.exists() && userSnap.data()?.isAdmin === true) {
            setIsAdmin(true);
            const blogPosts = await getBlogPosts();
            console.log("[DEBUG] Blog posts fetched:", blogPosts);
            setPosts(blogPosts);
          } else {
            setError("You are not an admin.");
          }
        } catch (err: any) {
          console.error("[ERROR] Failed to fetch admin blog data:", err);
          setError("Something went wrong.");
        } finally {
          setLoading(false);
        }
      });

      return () => unsubscribe(); 
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p>Loading blog posts...</p>
      </div>
    );
  }

  if (error || !isAdmin) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Unauthorized Access</h1>
        <p className="mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Blog Posts</h1>
        <Link href="/admin/news/create">
          <Button>Create New Post</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Blog Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {posts.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No blog posts found. Create your first post!
              </p>
            ) : (
              <div className="divide-y">
                {posts.map((post: any) => (
                  <div key={post.id} className="py-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{post.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {post.published ? "Published" : "Draft"} •{" "}
                        {format(new Date(post.createdAt || new Date()), "MMMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/admin/news/edit/${post.id}`}>
                        <Button variant="outline" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <DeleteButton postId={post.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
