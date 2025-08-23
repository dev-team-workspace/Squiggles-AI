"use client"

import { useEffect, useState } from "react";
import { getBlogPosts } from "@/lib/actions";
import type { NewsItem } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Newspaper, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import Image from "next/image";
import { format } from "date-fns";
import Link from "next/link";

// Types
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  createdAt: string;
  featuredImage?: string;
  published: boolean;
}

export default function NewsPage() {
  const [posts, setPosts] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getBlogPosts();

        const convertedToNewsItems: NewsItem[] = data
          .filter(post => post.published)
          .map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
            excerpt: post.excerpt ?? post.content.slice(0, 150),
            slug: post.slug,
            type: post.featuredImage ? "image" : "text",
            imageUrl: post.featuredImage,
            featuredImage: post.featuredImage,
            youtubeVideoId: undefined,
            isPublished: true,
            createdAt: post.createdAt,
            authorId: "blog-author",
          }));

        setPosts(convertedToNewsItems);
      } catch (err) {
        setError("Failed to load posts");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);


  if (loading) {
    return (
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="shadow-lg">
            <AspectRatio ratio={16 / 9} className="bg-muted rounded-t-lg overflow-hidden">
              <div className="w-full h-full bg-muted animate-pulse"></div>
            </AspectRatio>
            <CardHeader>
              <div className="h-8 w-3/4 bg-muted animate-pulse rounded-md mb-2"></div>
              <div className="h-4 w-1/2 bg-muted animate-pulse rounded-md"></div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-4 w-full bg-muted animate-pulse rounded-md"></div>
              <div className="h-4 w-full bg-muted animate-pulse rounded-md"></div>
              <div className="h-4 w-5/6 bg-muted animate-pulse rounded-md"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error Loading Content</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-primary flex items-center gap-3 justify-center sm:justify-start">
            <Newspaper className="h-10 w-10 text-accent" />
            Doodlemagic Blog
          </h1>
          <p className="text-muted-foreground mt-1">
            Latest news, tips, and creative inspiration
          </p>
        </div>
      </div>

      {posts.length === 0 ? (
        <><div className="flex flex-col items-center justify-center text-center py-12 min-h-[400px] bg-card rounded-xl shadow-sm">
          <Newspaper className="h-24 w-24 text-muted-foreground mb-6 opacity-70" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            No Posts Yet!
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Check back soon for exciting updates and creative inspiration!
          </p>
        </div>
        </>

      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
              {post.imageUrl && (
                <AspectRatio ratio={16 / 9} className="bg-muted rounded-t-lg overflow-hidden">
                  <Image
                    src={post.imageUrl}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </AspectRatio>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{post.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(post.createdAt), "MMMM d, yyyy")}
                </p>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="line-clamp-3 mb-4">{post.content.slice(0, 120)}...</p>
              </CardContent>
              <CardContent>
                <Button asChild variant="link" className="px-0">
                  <Link href={`/news/${post.slug}`}>
                    Read more <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>

                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
