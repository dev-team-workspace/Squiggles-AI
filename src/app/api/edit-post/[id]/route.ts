import { NextResponse } from 'next/server';
import { updateBlogPost } from '@/lib/actions';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json(); 

    const updatedData = {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      featuredImage: data.featuredImage,
      content: data.content,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      published: data.published, 
    };

    await updateBlogPost(params.id, updatedData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
