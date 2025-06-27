import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { postId, commentContent } = request.body;
    if (!postId || !commentContent) {
      return response.status(400).json({ message: '必須項目が不足しています。' });
    }

    const newComment = {
      id: `comment_${Date.now()}`,
      commentContent,
      createdAt: new Date().toISOString(),
    };

    // 特定の投稿IDに紐づくコメントリストの先頭に新しいコメントを追加
    await kv.lpush(`comments:${postId}`, JSON.stringify(newComment));

    return response.status(200).json({ success: true, comment: newComment });
  } catch (error) {
    console.error('Error adding comment:', error);
    return response.status(500).json({ message: 'コメントの保存中にエラーが発生しました。' });
  }
}
