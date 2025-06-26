import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return response.status(401).json({ message: '認証トークンがありません。' });
    }

    jwt.verify(token, JWT_SECRET);

    const { postId } = request.body;
    if (!postId) {
      return response.status(400).json({ message: '投稿IDが指定されていません。' });
    }

    const allPosts = await kv.lrange('posts', 0, -1);

    // ★★★ ここが修正点 ★★★
    // JSON.parse(p) をやめて、直接 p.id でアクセスします
    const postsToKeep = allPosts.filter(p => p.id !== postId);

    if (allPosts.length === postsToKeep.length) {
      // 削除対象が見つからなかった場合
      return response.status(404).json({ message: '削除対象の投稿が見つかりませんでした。' });
    }
    
    // トランザクションで安全にリストを更新
    // lpushは複数の引数を取れるので、スプレッド構文(...)を使います
    if (postsToKeep.length > 0) {
      await kv.multi()
        .del('posts')
        .lpush('posts', ...postsToKeep)
        .exec();
    } else {
      // 全ての投稿が削除された場合は、キー自体を削除
      await kv.del('posts');
    }

    return response.status(200).json({ success: true });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return response.status(403).json({ message: '認証に失敗しました。' });
    }
    console.error('Error deleting post:', error);
    return response.status(500).json({ message: '投稿の削除中にエラーが発生しました。' });
  }
}
