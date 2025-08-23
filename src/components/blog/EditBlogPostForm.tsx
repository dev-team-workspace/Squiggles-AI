'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EditorWrapper from './EditorWrapper';
import { auth, db } from '@/lib/firebase-client';
import { doc, getDoc } from 'firebase/firestore';

export default function EditBlogPostForm({ post }: { post: any }) {
  const [content, setContent] = useState(post.content);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setIsAdmin(userDoc.data()?.isAdmin || false);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const user = auth.currentUser;
    
    if (!user) {
      alert("You must be logged in to edit posts");
      return;
    }

    try {
      const formData = new FormData(e.currentTarget);
      const payload = {
        title: formData.get("title"),
        slug: formData.get("slug"),
        excerpt: formData.get("excerpt"),
        featuredImage: formData.get("featuredImage"),
        content,
        metaTitle: formData.get("metaTitle"),
        metaDescription: formData.get("metaDescription"),
        published: formData.get("published") === "on",
      };

      const res = await fetch(`/api/edit-post/${post.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        window.location.href = "/admin/news/list";
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to update post");
      }
    } catch (error) {
      console.error("Error updating post:", error);
      alert("An error occurred while updating the post");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">
          Unauthorized Access
        </h1>
        <p className="mt-2">
          You don't have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Edit Blog Post</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="title">Title*</Label>
                <Input id="title" name="title" defaultValue={post.title} required />
              </div>
              <div>
                <Label htmlFor="slug">URL Slug*</Label>
                <Input id="slug" name="slug" defaultValue={post.slug} required />
              </div>
            </div>

            <div>
              <Label htmlFor="excerpt">Excerpt*</Label>
              <Input id="excerpt" name="excerpt" defaultValue={post.excerpt || ''} required />
            </div>

            <div>
              <Label htmlFor="featuredImage">Featured Image URL</Label>
              <Input id="featuredImage" name="featuredImage" defaultValue={post.featuredImage || ''} />
            </div>

            <div>
              <Label>Content*</Label>
              <EditorWrapper
                initialContent={post.content}
                onChange={(val: string) => setContent(val)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="metaTitle">Meta Title (SEO)</Label>
                <Input id="metaTitle" name="metaTitle" defaultValue={post.metaTitle || ''} />
              </div>
              <div>
                <Label htmlFor="metaDescription">Meta Description (SEO)</Label>
                <Input id="metaDescription" name="metaDescription" defaultValue={post.metaDescription || ''} />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="published" name="published" defaultChecked={post.published} />
              <Label htmlFor="published">Publish this post</Label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit">Update Post</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}