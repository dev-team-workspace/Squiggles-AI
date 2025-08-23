import { getBlogPostBySlug, getAllBlogPostSlugs } from "@/lib/actions";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export async function generateStaticParams() {
  const posts = await getAllBlogPostSlugs();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getBlogPostBySlug(params.slug);

  return {
    title: post?.title || 'Post not found',
    description: post?.excerpt || 'Blog post',
    openGraph: {
      title: post?.title || 'Post not found',
      description: post?.excerpt || 'Blog post',
      images: post?.featuredImage ? [{ url: post.featuredImage }] : [],
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getBlogPostBySlug(params.slug);

  if (!post) return notFound();

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = post.videoUrl ? getYouTubeId(post.videoUrl) : null;

  const markdownComponents = {
    img: ({ src = "", alt = "" }: any) => (
      <div className="my-6">
        <Image
          src={src}
          alt={alt}
          width={800}
          height={450}
          className="rounded-lg w-full h-auto object-cover"
        />
      </div>
    ),
    a: ({ href = "", children }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
      >
        {children}
      </a>
    ),
    h2: ({ children }: any) => <h2 className="text-2xl font-bold mt-8 mb-4">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-xl font-bold mt-6 mb-3">{children}</h3>,
    p: ({ children }: any) => <p className="mb-4 leading-relaxed">{children}</p>,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button asChild variant="ghost" className="mb-8">
        <Link href="/news" className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to all posts
        </Link>
      </Button>

      <article className="space-y-8">
        <Card className="overflow-hidden">
          {post.featuredImage && (
            <div className="w-full aspect-[16/9] relative">
              <Image
                src={post.featuredImage}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="p-6 md:p-8">
            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900 dark:text-white">
                {post.title}
              </h1>
              <p className="text-muted-foreground">
                Published on {format(new Date(post.createdAt), "MMMM d, yyyy")}
              </p>
            </header>

            <div className="prose prose-lg dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {post.content}
              </ReactMarkdown>
            </div>

            {/* Video section after content */}
            {(youtubeId || post.videoUrl) && (
              <div className="mt-10">
                <h2 className="text-2xl font-bold mb-4">Featured Video</h2>
                {youtubeId ? (
                  <div className="aspect-video rounded-xl overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      className="w-full h-full"
                      frameBorder="0"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-black rounded-xl overflow-hidden">
                    <video
                      src={post.videoUrl}
                      controls
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>
            )}

            {post.media && post.media.length > 0 && (
              <div className="mt-10">
                <h2 className="text-2xl font-bold mb-4">Media Gallery</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {post.media.map((item, index) => (
                    <div key={index} className="rounded-lg overflow-hidden border dark:border-gray-700">
                      {item.type === "image" ? (
                        <Image
                          src={item.url}
                          alt={item.altText || `Media ${index + 1}`}
                          width={600}
                          height={400}
                          className="w-full h-auto object-cover"
                        />
                      ) : (
                        <video
                          src={item.url}
                          controls
                          className="w-full"
                        />
                      )}
                      {item.altText && (
                        <p className="p-3 text-sm text-muted-foreground">
                          {item.altText}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </article>
    </div>
  );
}