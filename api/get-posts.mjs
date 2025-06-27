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
  // GETリクエスト以外は受け付けない
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Only GET requests are allowed' });
  }

  try {
    let posts = [];

    if (isKvAvailable()) {
      // 本番環境：Vercel KVを使用
      const postsAsStrings = await kv.lrange('posts', 0, -1);
      posts = postsAsStrings.map(postString => {
        try {
          return JSON.parse(postString);
        } catch (e) {
          console.error('破損した投稿データをスキップしました:', postString, e);
          return null;
        }
      }).filter(post => post !== null);
    } else {
      // 開発環境：ローカルファイルを使用
      posts = await loadPostsLocal();
    }

    return response.status(200).json(posts);

  } catch (error) {
    console.error('投稿の取得中にエラーが発生しました:', error);
    return response.status(500).json({ message: 'サーバー側で問題が発生しました。' });
  }
}
