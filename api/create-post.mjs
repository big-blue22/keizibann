// /api/create-post.mjs
import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { url, summary, labels } = request.body;
    if (!url || !summary || !labels) {
      return response.status(400).json({ message: '必須項目が不足しています。' });
    }

    const newPost = {
      id: `post_${Date.now()}`,
      url,
      summary,
      labels,
      createdAt: new Date().toISOString(),
      viewCount: 0, // 新しくviewCountを追加
    };

    // 'posts' というキーのリストの先頭に新しい投稿を追加
    await kv.lpush('posts', JSON.stringify(newPost));

    return response.status(200).json({ success: true, post: newPost });
  } catch (error) {
    console.error('Error creating post:', error);
    return response.status(500).json({ message: '投稿の保存中にエラーが発生しました。' });
  }
}
