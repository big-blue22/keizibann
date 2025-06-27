// api/increment-view-count.mjs
import { kv } from '@vercel/kv';
import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');

// 開発環境用：ローカルファイルストレージ
async function loadPostsLocal() {
  try {
    const data = await fs.readFile(POSTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function savePostsLocal(posts) {
  await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2));
}

// Vercel KVが利用可能かチェック
function isKvAvailable() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { postId } = request.body;
    if (!postId) {
      return response.status(400).json({ message: 'postIdが指定されていません。' });
    }

    if (isKvAvailable()) {
      // 本番環境：Vercel KVを使用
      const posts = await kv.lrange('posts', 0, -1);
      let postToUpdate = null;
      let postIndex = -1;

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
        }
      }

      if (postToUpdate && postIndex !== -1) {
        postToUpdate.viewCount = (postToUpdate.viewCount || 0) + 1;
        await kv.lset('posts', postIndex, JSON.stringify(postToUpdate));
        return response.status(200).json({ success: true, post: postToUpdate });
      } else {
        return response.status(404).json({ message: '投稿が見つかりませんでした。' });
      }
    } else {
      // 開発環境：ローカルファイルを使用
      const posts = await loadPostsLocal();
      const postIndex = posts.findIndex(post => post.id === postId);

      if (postIndex !== -1) {
        posts[postIndex].viewCount = (posts[postIndex].viewCount || 0) + 1;
        await savePostsLocal(posts);
        return response.status(200).json({ success: true, post: posts[postIndex] });
      } else {
        return response.status(404).json({ message: '投稿が見つかりませんでした。' });
      }
    }

  } catch (error) {
    console.error('Error incrementing view count:', error);
    return response.status(500).json({ message: '閲覧数の更新中にエラーが発生しました。' });
  }
}
