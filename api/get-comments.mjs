import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { postId } = request.query;
    if (!postId) {
      return response.status(400).json({ message: 'postIdが指定されていません。' });
    }

    // 特定の投稿IDに紐づくコメントリストを取得
    const comments = await kv.lrange(`comments:${postId}`, 0, -1);

    return response.status(200).json(comments || []);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return response.status(500).json({ message: 'コメントの取得中にエラーが発生しました。' });
  }
}
