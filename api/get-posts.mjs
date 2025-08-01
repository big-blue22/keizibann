// api/get-posts.mjs - サーバーデータ取得のみに集中

import { kv } from '@vercel/kv';
import { isKvAvailable } from './utils/kv-utils.mjs';
import fs from 'fs/promises';
import path from 'path';



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
    console.log('🔍 get-posts API called');
    
    // Vercel KVが利用可能かチェック
    if (!isKvAvailable()) {
      console.log('❌ KV not available - falling back to local data');
      
      // ローカルファイルからデータを読み込み
      try {
        const localDataPath = path.join(process.cwd(), 'data', 'posts.json');
        const localData = await fs.readFile(localDataPath, 'utf-8');
        const localPosts = JSON.parse(localData);
        console.log(`📁 Loaded ${localPosts.length} posts from local file`);
        
        // ローカルデータを正規化して返す
        const normalizedPosts = localPosts.map(post => normalizePost(post));
        normalizedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return response.status(200).json(normalizedPosts);
        
      } catch (localError) {
        console.error('❌ Local data fetch error:', localError.message);
        console.log('🔄 No local data available, returning empty posts array');
        return response.status(200).json([]);
      }
    }

    console.log('✅ KV available, fetching posts...');
    
    // Vercel KVから投稿データを取得
    let rawPosts;
    try {
      rawPosts = await kv.lrange('posts', 0, -1) || [];
      console.log(`📊 Raw posts from KV: ${rawPosts.length} items`);
    } catch (kvError) {
      console.error('❌ KV fetch error:', kvError.message);
      console.log('🔄 KV unavailable, falling back to local data');
      
      // KVエラー時もローカルデータにフォールバック
      try {
        const localDataPath = path.join(process.cwd(), 'data', 'posts.json');
        const localData = await fs.readFile(localDataPath, 'utf-8');
        const localPosts = JSON.parse(localData);
        console.log(`📁 Fallback: Loaded ${localPosts.length} posts from local file`);
        
        const normalizedPosts = localPosts.map(post => normalizePost(post));
        normalizedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return response.status(200).json(normalizedPosts);
        
      } catch (localError) {
        console.error('❌ Local data fallback error:', localError.message);
        return response.status(200).json([]);
      }
    }
    
    if (rawPosts.length === 0) {
      console.log('📭 No posts found in KV');
      return response.status(200).json([]);
    }

    // JSON文字列をパース
    const posts = [];
    for (let i = 0; i < rawPosts.length; i++) {
      try {
        const postData = rawPosts[i];
        if (!postData) continue;
        
        const post = typeof postData === 'string' ? JSON.parse(postData) : postData;
        if (post && post.id) {
          // コメント数を取得
          try {
            const comments = await kv.lrange(`comments:${post.id}`, 0, -1) || [];
            post.commentCount = comments.length;
          } catch (commentError) {
            console.log(`⚠️ Comment fetch error for ${post.id}:`, commentError.message);
            post.commentCount = 0;
          }
          
          // recentViewCountを計算
          const normalizedPost = normalizePost(post);
          posts.push(normalizedPost);
        }
      } catch (parseError) {
        console.error(`❌ Parse error for post ${i}:`, parseError.message);
      }
    }

    console.log(`✅ Successfully processed ${posts.length} posts`);

    // 作成日時でソート（降順 - 新しい順）
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return response.status(200).json(posts);

  } catch (error) {
    console.error('❌ Error in get-posts API:', error);
    return response.status(500).json({ 
      message: '投稿の取得中にエラーが発生しました',
      error: error.message
    });
  }
}
