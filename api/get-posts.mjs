// api/get-posts.mjs - サーバーデータ取得のみに集中

import { kv } from '@vercel/kv';
import { isKvAvailable } from './utils/kv-utils.mjs';



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
      console.log('❌ KV not available - returning mock data for local development');
      
      // ローカル開発用のモックデータを返す
      const mockPosts = [
        {
          id: 'mock-1',
          url: 'https://example.com/ai-trends',
          content: 'AI技術の最新トレンドについて詳しく解説している記事です。',
          labels: ['AI', 'トレンド', '技術'],
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1日前
          recentViews: { 
            [new Date().toISOString().split('T')[0]]: 10,
            [new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split('T')[0]]: 5 
          },
          recentViewCount: 15,
          commentCount: 3
        },
        {
          id: 'mock-2',
          url: 'https://example.com/react-tips',
          content: 'React開発で役立つ実践的なテクニック集です。',
          labels: ['React', 'JavaScript', 'フロントエンド'],
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3日前
          recentViews: { 
            [new Date().toISOString().split('T')[0]]: 8,
            [new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split('T')[0]]: 12 
          },
          recentViewCount: 20,
          commentCount: 1
        },
        {
          id: 'mock-3',
          url: 'https://example.com/database-design',
          content: 'データベース設計の基本原則と実装のベストプラクティス。',
          labels: ['データベース', '設計', 'バックエンド'],
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7日前
          recentViews: { 
            [new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString().split('T')[0]]: 3 
          },
          recentViewCount: 3,
          commentCount: 0
        }
      ];
      
      return response.status(200).json(mockPosts);
    }

    console.log('✅ KV available, fetching posts...');
    
    // Vercel KVから投稿データを取得
    let rawPosts;
    try {
      rawPosts = await kv.lrange('posts', 0, -1) || [];
      console.log(`📊 Raw posts from KV: ${rawPosts.length} items`);
    } catch (kvError) {
      console.error('❌ KV fetch error:', kvError.message);
      console.log('🔄 Falling back to mock data due to KV error');
      
      // KVエラーの場合はモックデータを返す
      const mockPosts = [
        {
          id: 'fallback-1',
          url: 'https://example.com/ai-trends',
          content: 'AI技術の最新トレンドについて詳しく解説している記事です。（KVエラー時のフォールバック）',
          labels: ['AI', 'トレンド', '技術'],
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          recentViews: { 
            [new Date().toISOString().split('T')[0]]: 3
          },
          viewCount: 10,
          recentViewCount: 3,
          commentCount: 0
        }
      ];
      return response.status(200).json(mockPosts);
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
