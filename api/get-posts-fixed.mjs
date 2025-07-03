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

// 直近3日間の合計閲覧数を計算
function calculateRecentViewCount(recentViews) {
  if (!recentViews) return 0;
  
  // 現在日時から3日前まで
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const cutoffDate = threeDaysAgo.toISOString().split('T')[0];
  
  let totalCount = 0;
  Object.entries(recentViews).forEach(([date, count]) => {
    if (date >= cutoffDate) {
      totalCount += count;
    }
  });
  
  return totalCount;
}

// 投稿データを正規化（recentViewCountを計算）
function normalizePost(post) {
  if (!post) return null;
  
  // recentViewCountが未計算の場合は計算
  if (post.recentViewCount === undefined && post.recentViews) {
    post.recentViewCount = calculateRecentViewCount(post.recentViews);
  }
  
  return post;
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
      const rawPosts = await kv.lrange('posts', 0, -1) || [];
      
      posts = rawPosts.map(postData => {
        try {
          if (!postData) {
            return null;
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

      // 各投稿のコメント数とrecentViewCountを取得
      posts = await Promise.all(posts.map(async (post) => {
        try {
          const comments = await kv.lrange(`comments:${post.id}`, 0, -1);
          const normalizedPost = normalizePost({ ...post, commentCount: comments ? comments.length : 0 });
          return normalizedPost;
        } catch (error) {
          console.error(`Error fetching comment count for post ${post.id}:`, error);
          const normalizedPost = normalizePost({ ...post, commentCount: 0 });
          return normalizedPost;
        }
      }));
    } else {
      // 開発環境：ローカルファイルを使用
      posts = await loadPostsLocal();
      
      // 開発環境でもコメント数とrecentViewCountを取得
      posts = await Promise.all(posts.map(async (post) => {
        try {
          // 開発環境でもKVが利用可能な場合はコメント数を取得
          if (isKvAvailable()) {
            const comments = await kv.lrange(`comments:${post.id}`, 0, -1);
            const normalizedPost = normalizePost({ ...post, commentCount: comments ? comments.length : 0 });
            return normalizedPost;
          } else {
            // KVが利用できない場合はコメント数を0とする
            const normalizedPost = normalizePost({ ...post, commentCount: 0 });
            return normalizedPost;
          }
        } catch (error) {
          console.error(`Error processing post ${post.id}:`, error);
          const normalizedPost = normalizePost({ ...post, commentCount: 0 });
          return normalizedPost;
        }
      }));
    }

    // ★ 並び替え処理
    if (sortBy === 'popular') {
      // 閲覧数でソート（降順）
      posts.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    } else if (sortBy === 'recent_popular') {
      // 直近3日間の閲覧数でソート（降順）
      posts.sort((a, b) => (b.recentViewCount || 0) - (a.recentViewCount || 0));
    } else {
      // デフォルト：作成日時でソート（降順）
      posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return response.status(200).json(posts);

  } catch (error) {
    console.error('Error in get-posts API:', error);
    return response.status(500).json({ message: '投稿の取得中にエラーが発生しました。' });
  }
}
