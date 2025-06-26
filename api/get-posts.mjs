// /api/get-posts.mjs
import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  try {
    const postsAsJson = await kv.lrange('posts', 0, -1);
    const posts = postsAsJson.map((post) => JSON.parse(post));
    return response.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return response.status(500).json({ message: '投稿の取得中にエラーが発生しました。' });
  }
}
