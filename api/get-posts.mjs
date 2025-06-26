// /api/get-posts.mjs
import { createClient } from '@vercel/kv';

export default async function handler(request, response) {
  // GETリクエスト以外は受け付けない
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // データベースに接続
    const kv = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    // 'posts' というリストから全ての項目を取得 (0 は最初, -1 は最後)
    const postsAsJson = await kv.lrange('posts', 0, -1);
    
    // KVには文字列で保存されているため、JSONオブジェクトに変換する
    const posts = postsAsJson.map((post) => JSON.parse(post));

    // 取得した投稿データをフロントエンドに返す
    return response.status(200).json(posts);

  } catch (error) {
    console.error('Error fetching posts:', error);
    return response.status(500).json({ message: 'サーバーでエラーが発生しました。' });
  }
}
