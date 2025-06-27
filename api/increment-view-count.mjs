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
    let updatedPost = null;

    const updatedPosts = posts.map(postStr => {
      const post = JSON.parse(postStr);
      if (post.id === postId) {
        post.viewCount = (post.viewCount || 0) + 1;
        updatedPost = post;
        return JSON.stringify(post);
      }
      return postStr;
    });

    if (updatedPost) {
      await kv.del('posts');
      if (updatedPosts.length > 0) {
        await kv.lpush('posts', ...updatedPosts.reverse());
      }
      return response.status(200).json({ success: true, post: updatedPost });
    } else {
      return response.status(404).json({ message: '投稿が見つかりませんでした。' });
    }

  } catch (error) {
    console.error('Error incrementing view count:', error);
    return response.status(500).json({ message: '閲覧数の更新中にエラーが発生しました。' });
  }
}