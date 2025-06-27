// /api/create-post.mjs
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
  const dataDir = path.dirname(POSTS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
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
    const { url, summary, labels } = request.body;
    if (!url || !summary || !labels) {
      return response.status(400).json({ message: '必須項目が不足しています。' });
    }

    const newPost = {
      id: `post_${Date.now()}`,
      url,
      summary,
      labels,
      createdAt: new Date().toISOString(),
      viewCount: 0,
    };

    if (isKvAvailable()) {
      // 本番環境：Vercel KVを使用
      await kv.lpush('posts', JSON.stringify(newPost));
    } else {
      // 開発環境：ローカルファイルを使用
      const posts = await loadPostsLocal();
      posts.unshift(newPost);
      await savePostsLocal(posts);
    }

    return response.status(200).json({ success: true, post: newPost });
  } catch (error) {
    console.error('Error creating post:', error);
    return response.status(500).json({ message: '投稿の保存中にエラーが発生しました。' });
  }
}
