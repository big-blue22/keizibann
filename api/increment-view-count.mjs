// api/increment-view-count.mjs
import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { postId } = request.body;
    if (!postId) {
      return response.status(400).json({ message: 'postIdが指定されていません。' });
    }

    const posts = await kv.lrange('posts', 0, -1);
    let postToUpdate = null;
    let postIndex = -1;

    // 更新対象の投稿と、そのリスト内での位置（index）を見つける
    for (let i = 0; i < posts.length; i++) {
      try {
        const post = JSON.parse(posts[i]);
        if (post.id === postId) {
          postToUpdate = post;
          postIndex = i;
          break;
        }
      } catch (e) {
        console.error(`Error parsing post at index ${i}:`, posts[i], e);
        // JSONのパースに失敗した投稿はスキップします
      }
    }

    if (postToUpdate && postIndex !== -1) {
      // 閲覧数を増やす
      postToUpdate.viewCount = (postToUpdate.viewCount || 0) + 1;

      // lsetコマンドで、指定した位置の要素を更新する
      await kv.lset('posts', postIndex, JSON.stringify(postToUpdate));
      
      return response.status(200).json({ success: true, post: postToUpdate });
    } else {
      return response.status(404).json({ message: '投稿が見つかりませんでした。' });
    }

  } catch (error) {
    console.error('Error incrementing view count:', error);
    return response.status(500).json({ message: '閲覧数の更新中にエラーが発生しました。' });
  }
}
