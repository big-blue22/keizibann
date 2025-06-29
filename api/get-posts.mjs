// api/get-posts.mjs

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

// Vercel KVが利用可能かチェック
function isKvAvailable() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Only GET requests are allowed' });
  }

  try {
    const { sortBy } = request.query; // ★ 並び替えパラメータを取得
    let posts = [];

    if (isKvAvailable()) {
      // 本番環境：Vercel KVを使用
      const postsAsStrings = await kv.lrange('posts', 0, -1);
      posts = postsAsStrings.map(postData => {
        try {
          if (typeof postData === 'object' && postData !== null) {
            return postData;
          }
          if (typeof postData === 'string') {
            return JSON.parse(postData);
          }
          return null;
        } catch (e) {
          console.error('投稿データの解析に失敗:', postData, e);
          return null;
        }
      }).filter(post => post !== null);
    } else {
      // 開発環境：ローカルファイルを使用
      posts = await loadPostsLocal();
    }

    // ★ 並び替え処理を追加
    if (sortBy === 'viewCount') {
      posts.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    } else {
      // デフォルトは作成日時の降順
      posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return response.status(200).json(posts);

  } catch (error) {
    console.error('投稿の取得中にエラーが発生しました:', error);
    return response.status(500).json({ message: 'サーバー側で問題が発生しました。' });
  }
}
