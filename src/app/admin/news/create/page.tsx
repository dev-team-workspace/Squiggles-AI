"use client";
import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from "@/providers/firebase-provider";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { createBlogPost } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FilePlus2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/file-upload";

// import 'react-quill/dist/quill.snow.css';
const TiptapEditor = dynamic(() => import('@/components/TiptapEditor'), {
  ssr: false,
});


const blogPostSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  content: z.string().min(10),
  excerpt: z.string().min(10).max(160),
  featuredImage: z.string().optional(), // Changed from url() to optional()
  videoUrl: z.string().url().optional(),
  published: z.boolean().default(false),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  media: z
    .array(
      z.object({
        type: z.enum(["image", "video"]),
        url: z.string().url(),
        altText: z.string().optional(),
      })
    )
    .optional(),
});

type BlogPostFormValues = z.infer<typeof blogPostSchema>;


export default function CreateBlogPostPage() {
  const { user } = useAuthRedirect({ requireAuth: true, redirectTo: '/auth/signin' });
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState("");
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null);
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false);

  useEffect(() => {
    const verifyAdmin = async () => {
      if (!user?.uid) {
        setIsAdmin(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/admin/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) throw new Error("Admin check failed");

        const { isAdmin } = await res.json();
        setIsAdmin(isAdmin === true);

      } catch (err) {
        console.error("Admin verification failed:", err);
        setIsAdmin(false);
        router.push('/auth/signin'); 
      }
    };

    verifyAdmin();
  }, [user, router]);

  useEffect(() => {
    if (user) {
      console.log("[DEBUG] Logged-in UID:", user.uid);
    } else {
      console.warn("[DEBUG] No user is currently logged in.");
    }
  }, [user]);
  
  const [mediaFiles, setMediaFiles] = useState<NonNullable<BlogPostFormValues["media"]>>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const removeMediaFile = (index: number) => {
    const updatedFiles = [...mediaFiles];
    updatedFiles.splice(index, 1);
    setMediaFiles(updatedFiles);
    form.setValue("media", updatedFiles);
  };

  // Handle featured image upload
  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }
    
    setUploadingFeaturedImage(true);
    setFeaturedImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setFeaturedImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    try {
      const url = await uploadFile(file, user?.uid || "anon");
      form.setValue("featuredImage", url);
      setUploadingFeaturedImage(false);
    } catch (error) {
      console.error("Featured image upload error", error);
      toast({
        title: "Featured Image Upload Failed",
        description: "Please try again.",
        variant: "destructive",
      });
      setUploadingFeaturedImage(false);
      setFeaturedImageFile(null);
      setFeaturedImagePreview(null);
    }
  };

  // Remove featured image
  const removeFeaturedImage = () => {
    setFeaturedImageFile(null);
    setFeaturedImagePreview(null);
    form.setValue("featuredImage", "");
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);

    try {
      const uploaded: BlogPostFormValues["media"] = [];

      for (const file of Array.from(files)) {
        const url = await uploadFile(file, user?.uid || "anon");
        const type = file.type.startsWith("video") ? "video" : "image";
        uploaded.push({ type, url, altText: file.name });
      }

      const allMedia = [...mediaFiles, ...uploaded];
      setMediaFiles(allMedia);
      form.setValue("media", allMedia);
    } catch (error) {
      console.error("Media upload error", error);
      toast({
        title: "Media Upload Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingMedia(false);
    }
  };
  
  const form = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      featuredImage: "",
      videoUrl: "",
      published: false,
      metaTitle: "",
      metaDescription: "",
    },
  });
  
  useEffect(() => {
    if (content) {
      form.setValue("content", content);
      form.clearErrors("content");
    }
  }, [content]);
  
  const onSubmit: SubmitHandler<BlogPostFormValues> = async (data) => {
    console.log("[DEBUG] Submit triggered");

    if (!user) {
      console.warn("[ERROR] User not logged in");
      toast({
        title: "Error",
        description: "You must be logged in to create blog posts.",
        variant: "destructive",
      });
      return;
    }

    if (!content) {
      console.warn("[ERROR] Blog content is empty");
      toast({
        title: "Error",
        description: "Content cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    const stripHtml = (html: string) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || '';
    };
    const postData = {
      ...data,
      content: stripHtml(content),
      authorId: user.uid,
      media: mediaFiles,
    };


    console.log("[DEBUG] Blog post payload:", postData);

    setIsLoading(true);

    try {
      const result = await createBlogPost(postData);

      console.log("[DEBUG] Result from createBlogPost:", result);

      if (result.success) {
        toast({
          title: "Blog Post Created!",
          description: `Your post "${data.title}" has been saved.`,
          variant: "default",
        });
        router.push("/admin/news/list");
      } else {
        console.error("[ERROR] Blog post creation failed:", result.error);
        toast({
          title: "Failed to Create Post",
          description: result.error || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("[ERROR] Exception thrown:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create blog post.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log("[DEBUG] Loading state set to false");
    }
  };

  if (isAdmin === null) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Checking admin access...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
            <FilePlus2 /> Create New Blog Post
          </CardTitle>
          <CardDescription>
            Fill in the details for your blog post. Only admins can create and publish posts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.warn("[ERROR] Validation failed:", errors);
          })} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="title">Title*</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  className="mt-1"
                  placeholder="Enter post title"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="slug">URL Slug*</Label>
                <Input
                  id="slug"
                  {...form.register("slug")}
                  className="mt-1"
                  placeholder="e.g., my-awesome-post"
                />
                {form.formState.errors.slug && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.slug.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="excerpt">Excerpt*</Label>
              <Input
                id="excerpt"
                {...form.register("excerpt")}
                className="mt-1"
                placeholder="Brief summary of your post"
              />
              {form.formState.errors.excerpt && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.excerpt.message}
                </p>
              )}
            </div>

            {/* Featured Image Upload Field */}
            <div className="mb-4">
              <Label htmlFor="featuredImageUpload">Upload Media (Images/Videos)</Label>
              <Input
                id="featuredImageUpload"
                type="file"
                accept="image/*"
                onChange={handleFeaturedImageUpload}
                disabled={uploadingFeaturedImage}
                className="mt-1"
              />
              {uploadingFeaturedImage && (
                <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
              )}
              
              {/* Featured Image Preview */}
              {featuredImagePreview && (
                <div className="mt-4 relative">
                  <Label>Featured Image Preview</Label>
                  <div className="border rounded p-2 relative mt-2 max-w-xs">
                    <img
                      src={featuredImagePreview}
                      alt="Featured preview"
                      className="w-full h-auto rounded"
                    />
                    <button
                      type="button"
                      onClick={removeFeaturedImage}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* File Upload Field */}
            {/* <div className="mb-4">
              <Label htmlFor="mediaUpload">Upload Media (Images/Videos)</Label>
              <Input
                id="mediaUpload"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                disabled={uploadingMedia}
                className="mt-1"
              />
              {uploadingMedia && (
                <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
              )}
            </div> */}

            {/* Video URL Field */}
            <div className="mb-4">
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                {...form.register("videoUrl")}
                className="mt-1"
                placeholder="https://example.com/video.mp4"
              />
              {form.formState.errors.videoUrl && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.videoUrl.message}
                </p>
              )}
            </div>

            {/* Media Preview Section */}
            {mediaFiles.length > 0 && (
              <div className="mb-6">
                <Label>Uploaded Media Preview</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                  {mediaFiles.map((file, idx) => (
                    <div key={idx} className="border rounded p-2 relative">
                      {file.type === "image" ? (
                        <img
                          src={file.url}
                          alt="Uploaded media"
                          className="w-full h-auto rounded"
                        />
                      ) : (
                        <video
                          src={file.url}
                          controls
                          className="w-full h-auto"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMediaFile(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}


            <div className="mb-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">
                Content <span className="text-red-500">*</span>
              </label>

              <div className="rounded-md border border-gray-600 bg-zinc-800 focus-within:ring-2 focus-within:ring-blue-500">
                <TiptapEditor content={content} onChange={setContent} />
              </div>

              {/* Hidden input to sync content with react-hook-form */}
              <input
                type="hidden"
                id="content"
                {...form.register("content")}
                value={content}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="metaTitle">Meta Title (SEO)</Label>
                <Input
                  id="metaTitle"
                  {...form.register("metaTitle")}
                  className="mt-1"
                  placeholder="Optional for SEO"
                />
              </div>

              <div>
                <Label htmlFor="metaDescription">Meta Description (SEO)</Label>
                <Input
                  id="metaDescription"
                  {...form.register("metaDescription")}
                  className="mt-1"
                  placeholder="Optional for SEO"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="published"
                checked={form.watch('published')}
                onCheckedChange={(checked) => form.setValue('published', Boolean(checked))}
              />
              <Label htmlFor="published" className="font-normal text-sm">
                Publish this post
              </Label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={isLoading}
                onClick={() => {
                  console.log("[DEBUG] Submit button clicked");
                  console.log("[DEBUG] Current form values:", form.getValues());
                }}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Saving..." : "Create Post"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/news/list')}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}