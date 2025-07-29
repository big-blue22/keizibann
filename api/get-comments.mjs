import { kv } from '@vercel/kv';
import { isKvAvailable } from './utils/kv-utils.mjs';
import fs from 'fs/promises';
import path from 'path';

// Mock comments data for development/fallback scenarios
function getMockComments(postId) {
  const mockComments = {
    'mock-1': [
      {
        id: 'comment-1',
        author: 'テストユーザー1',
        content: 'とても参考になる記事でした！',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2時間前
      },
      {
        id: 'comment-2',
        author: 'テストユーザー2',
        content: 'AI技術の発展は本当に興味深いですね。',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30分前
      },
      {
        id: 'comment-3',
        author: 'テストユーザー3',
        content: '次回の記事も楽しみにしています。',
        createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString() // 10分前
      }
    ],
    'mock-2': [
      {
        id: 'comment-4',
        author: 'React開発者',
        content: 'Reactのベストプラクティスがよくまとまっていますね。',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString() // 1時間前
      }
    ],
    'mock-3': [], // No comments for this post
    'fallback-1': [] // No comments for fallback post
  };
  
  return mockComments[postId] || [];
}

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

    // Check if this is a mock post ID
    if (postId.startsWith('mock-') || postId.startsWith('fallback-')) {
      console.log('モック投稿IDを検出、モックコメントを返します:', postId);
      const mockComments = getMockComments(postId);
      return response.status(200).json(mockComments);
    }

    if (isKvAvailable()) {
      // 本番環境：Vercel KVを使用
      try {
        const comments = await kv.lrange(`comments:${postId}`, 0, -1);
        return response.status(200).json(comments || []);
      } catch (kvError) {
        console.error('❌ KV comments fetch error:', kvError.message);
        console.log('🔄 Falling back to empty comments due to KV error');
        return response.status(200).json([]);
      }
    } else {
      // 開発環境：ローカルファイルを使用
      const posts = await loadPostsLocal();
      const targetPost = posts.find(p => p.id === postId);
      
      if (!targetPost) {
        // Instead of 404, return empty array for better UX
        console.log('投稿が見つかりません、空のコメント配列を返します:', postId);
        return response.status(200).json([]);
      }

      return response.status(200).json(targetPost.comments || []);
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
    return response.status(500).json({ message: 'コメントの取得中にエラーが発生しました。' });
  }
}
