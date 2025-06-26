import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  try {
    // kv.lrangeは、自動的にJSONをパースしてオブジェクトの配列を返してくれます
    const posts = await kv.lrange('posts', 0, -1);

    // 以前のコードにあった JSON.parse の処理は不要なので削除しました。

    // 取得した投稿データをフロントエンドに返す
    return response.status(200).json(posts || []); // もし投稿がまだなければ空の配列を返す

  } catch (error) {
    console.error('Error fetching posts:', error);
    return response.status(500).json({ message: '投稿の取得中にエラーが発生しました。' });
  }
}
