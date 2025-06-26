// /api/create-post.mjs
import { createClient } from '@vercel/kv';

export default async function handler(request, response) {
  // POSTリクエスト以外は受け付けない
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // フロントエンドから送られてきた投稿内容を取得
    const { text } = request.body;

    // 投稿内容が空の場合はエラーを返す
    if (!text || text.trim() === '') {
      return response.status(400).json({ message: '投稿内容が空です。' });
    }

    // 保存する投稿オブジェクトを作成
    const newPost = {
      id: `post_${Date.now()}`, // ユニークなIDを生成
      text: text,
      createdAt: new Date().toISOString(), // 投稿日時
    };

    // データベースに接続
    const kv = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    // 'posts' という名前のリストに、新しい投稿をJSON形式で追加
    await kv.lpush('posts', JSON.stringify(newPost));

    // 成功したことを、追加した投稿データと共にフロントエンドに返す
    return response.status(200).json({ success: true, post: newPost });

  } catch (error) {
    console.error('Error creating post:', error);
    return response.status(500).json({ message: 'サーバーでエラーが発生しました。' });
  }
}
