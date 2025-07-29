import { kv } from '@vercel/kv';
import { isKvAvailable } from './utils/kv-utils.mjs';
import fs from 'fs/promises';
import path from 'path';



// 開発環境用：ローカルファイルストレージ
async function loadPostsLocal() {
  const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');
  try {
    const data = await fs.readFile(POSTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { postId } = request.query;
    if (!postId) {
      return response.status(400).json({ message: 'postIdが指定されていません。' });
    }

    if (isKvAvailable()) {
      // 本番環境：Vercel KVを使用
      const comments = await kv.lrange(`comments:${postId}`, 0, -1);
      return response.status(200).json(comments || []);
    } else {
      // 開発環境：ローカルファイルを使用
      const posts = await loadPostsLocal();
      const targetPost = posts.find(p => p.id === postId);
      
      if (!targetPost) {
        return response.status(404).json({ message: '指定された投稿が見つかりません。' });
      }

      return response.status(200).json(targetPost.comments || []);
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
    return response.status(500).json({ message: 'コメントの取得中にエラーが発生しました。' });
  }
}
