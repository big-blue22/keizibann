// api/delete-post.mjs
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
  if (request.method !== 'DELETE') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { postId } = request.body;
    if (!postId) {
      return response.status(400).json({ message: '投稿IDが必要です。' });
    }

    if (isKvAvailable()) {
      // 本番環境：Vercel KVを使用
      const allPosts = await kv.lrange('posts', 0, -1);
      const postsToKeep = allPosts.filter(postString => {
        try {
          const post = JSON.parse(postString);
          return post.id !== postId;
        } catch (e) {
          console.error("Could not parse post, keeping it:", postString);
          return true;
        }
      });

      if (allPosts.length === postsToKeep.length) {
        return response.status(404).json({ message: '指定された投稿が見つかりません。' });
      }

      await kv.del('posts');
      if (postsToKeep.length > 0) {
        await kv.lpush('posts', ...postsToKeep.reverse());
      }
    } else {
      // 開発環境：ローカルファイルを使用
      const posts = await loadPostsLocal();
      const filteredPosts = posts.filter(post => post.id !== postId);
      
      if (posts.length === filteredPosts.length) {
        return response.status(404).json({ message: '指定された投稿が見つかりません。' });
      }

      await savePostsLocal(filteredPosts);
    }

    return response.status(200).json({ success: true });

  } catch (error) {
    console.error('Error deleting post:', error);
    return response.status(500).json({ message: '投稿の削除中にエラーが発生しました。' });
  }
}
