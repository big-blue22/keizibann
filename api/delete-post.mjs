// /api/delete-post.mjs
import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 1. ヘッダーから認証トークンを取得
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN" の形式を想定

    if (!token) {
      return response.status(401).json({ message: '認証トークンがありません。' });
    }

    // 2. トークンを検証
    jwt.verify(token, JWT_SECRET); // 不正なトークンならここでエラーが発生する

    // 3. 削除対象の投稿IDを取得
    const { postId } = request.body;
    if (!postId) {
      return response.status(400).json({ message: '投稿IDが指定されていません。' });
    }

    // 4. データベースから投稿を削除
    const allPosts = await kv.lrange('posts', 0, -1);
    const postsToKeep = allPosts.filter(p => JSON.parse(p).id !== postId);

    // トランザクションで安全にリストを更新
    await kv.multi()
      .del('posts') // 一旦リストを全削除
      .lpush('posts', ...postsToKeep) // 削除後のリストで再作成
      .exec();

    return response.status(200).json({ success: true });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return response.status(403).json({ message: '認証に失敗しました。' });
    }
    console.error('Error deleting post:', error);
    return response.status(500).json({ message: '投稿の削除中にエラーが発生しました。' });
  }
}
