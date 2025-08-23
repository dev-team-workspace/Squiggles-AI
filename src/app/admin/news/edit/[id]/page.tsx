// ✅ Server Component
import { getBlogPostById, getAllBlogPostIds } from "@/lib/actions";
import { redirect } from "next/navigation";
import EditBlogPostForm from "@/components/blog/EditBlogPostForm";

export async function generateStaticParams() {
  const postIds = await getAllBlogPostIds();
  return postIds.map((id: string) => ({ id }));
}

export default async function EditBlogPostPage({
  params,
}: {
  params: { id: string };
}) {
  const post = await getBlogPostById(params.id);

  if (!post) {
    redirect("/admin/news/list");
  }

  return <EditBlogPostForm post={post} />;
}
