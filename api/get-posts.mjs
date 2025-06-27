import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  try {
    const postStrings = await kv.lrange('posts', 0, -1);
    
    const posts = postStrings.map((postStr, index) => {
      try {
        return JSON.parse(postStr);
      } catch (e) {
        console.error(`Error parsing post at index ${index}:`, postStr, e);
        return null; // パースに失敗した投稿はnullとして扱う
      }
    }).filter(Boolean); // nullになった要素を取り除く

    return response.status(200).json(posts || []);

  } catch (error) {
    console.error('Error fetching posts:', error);
    return response.status(500).json({ message: '投稿の取得中にエラーが発生しました。' });
  }
}