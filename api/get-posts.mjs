import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  try {
    // kv.lrangeは、自動的にJSONをパースしてオブジェクトの配列を返してくれます
    const postStrings = await kv.lrange('posts', 0, -1);
    const posts = postStrings.map(postStr => JSON.parse(postStr));

    return response.status(200).json(posts || []);

  } catch (error) {
    console.error('Error fetching posts:', error);
    return response.status(500).json({ message: '投稿の取得中にエラーが発生しました。' });
  }
}
