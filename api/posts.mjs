// /api/posts.mjs - 投稿管理関連の統合API
import { kv } from '@vercel/kv';
import { isKvAvailable } from './utils/kv-utils.mjs';
import { generatePreviewData } from './utils/preview-utils.mjs';
import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');

// ローカルファイルから投稿を読み込み
async function loadPostsLocal() {
  try {
    const data = await fs.readFile(POSTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// ローカルファイルに投稿を保存
async function savePostsLocal(posts) {
  const dataDir = path.dirname(POSTS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2));
}

// 直近3日間の合計閲覧数を計算
function calculateRecentViewCount(recentViews) {
  if (!recentViews) return 0;
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

// 投稿データを正規化
function normalizePost(post) {
  if (!post) return null;
  if (post.recentViewCount === undefined && post.recentViews) {
    post.recentViewCount = calculateRecentViewCount(post.recentViews);
  }
  return post;
}

export default async function handler(request, response) {
  const { method } = request;
  
  try {
    if (method === 'GET') {
      // GET /api/posts - 投稿一覧取得
      console.log('🔍 posts API called');
      
      const isVercelEnv = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
      const shouldUseKv = isKvAvailable() || isVercelEnv;

      if (!shouldUseKv) {
        console.log('❌ KV not available - falling back to local data');
        try {
          const localPosts = await loadPostsLocal();
          console.log(`📁 Loaded ${localPosts.length} posts from local file`);
          const normalizedPosts = localPosts.map(post => normalizePost(post));
          normalizedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          return response.status(200).json(normalizedPosts);
        } catch (localError) {
          console.error('❌ Local data fetch error:', localError.message);
          return response.status(200).json([]);
        }
      }

      console.log('✅ KV available, fetching posts...');
      
      let rawPosts;
      try {
        rawPosts = await kv.lrange('posts', 0, -1) || [];
        console.log(`📊 Raw posts from KV: ${rawPosts.length} items`);
      } catch (kvError) {
        console.error('❌ KV fetch error:', kvError.message);
        try {
          const localPosts = await loadPostsLocal();
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

      const posts = [];
      for (let i = 0; i < rawPosts.length; i++) {
        try {
          const postData = rawPosts[i];
          if (!postData) continue;
          
          const post = typeof postData === 'string' ? JSON.parse(postData) : postData;
          if (post && post.id) {
            try {
              const comments = await kv.lrange(`comments:${post.id}`, 0, -1) || [];
              post.commentCount = comments.length;
            } catch (commentError) {
              console.log(`⚠️ Comment fetch error for ${post.id}:`, commentError.message);
              post.commentCount = 0;
            }
            
            const normalizedPost = normalizePost(post);
            posts.push(normalizedPost);
          }
        } catch (parseError) {
          console.error(`❌ Parse error for post ${i}:`, parseError.message);
        }
      }

      console.log(`✅ Successfully processed ${posts.length} posts`);
      posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return response.status(200).json(posts);

    } else if (method === 'DELETE') {
      // DELETE /api/posts - 投稿削除
      const { postId } = request.body;
      if (!postId) {
        return response.status(400).json({ message: 'postId is required' });
      }

      const isVercelEnv = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
      const shouldUseKv = isKvAvailable() || isVercelEnv;

      if (shouldUseKv) {
        const posts = await kv.lrange('posts', 0, -1);
        const filteredPosts = posts.filter(postData => {
          const post = typeof postData === 'string' ? JSON.parse(postData) : postData;
          return post.id !== postId;
        });

        await kv.del('posts');
        for (const post of filteredPosts) {
          await kv.lpush('posts', typeof post === 'string' ? post : JSON.stringify(post));
        }
        await kv.del(`comments:${postId}`);
      } else {
        const posts = await loadPostsLocal();
        const filteredPosts = posts.filter(p => p.id !== postId);
        await savePostsLocal(filteredPosts);
      }

      return response.status(200).json({ success: true });

    } else if (method === 'PUT') {
      // PUT /api/posts - プレビュー生成
      const { postId, url, action } = request.body;
      
      if (action === 'generate-preview') {
        if (!postId || !url) {
          return response.status(400).json({ message: 'postId and url are required for preview generation' });
        }

        let previewData;
        try {
          console.log('URLプレビューを生成中...', url);
          previewData = await generatePreviewData(url);
          console.log('✅ プレビュー生成成功:', previewData);
        } catch (error) {
          console.error('❌ プレビューの生成に失敗:', error.message);
          return response.status(500).json({ 
            message: 'プレビューの生成に失敗しました', 
            error: error.message 
          });
        }

        const isVercelEnv = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
        const shouldUseKv = isKvAvailable() || isVercelEnv;

        if (shouldUseKv) {
          const posts = await kv.lrange('posts', 0, -1);
          let found = false;
          const updatedPosts = [];

          for (const postData of posts) {
            let post;
            try {
              post = typeof postData === 'string' ? JSON.parse(postData) : postData;
            } catch (e) {
              console.error('投稿のパースに失敗:', e);
              continue;
            }

            if (post.id === postId) {
              post.previewData = previewData;
              found = true;
              console.log('✅ 投稿を更新しました:', postId);
            }
            updatedPosts.push(JSON.stringify(post));
          }

          if (!found) {
            return response.status(404).json({ message: '投稿が見つかりません' });
          }

          const pipeline = kv.pipeline();
          pipeline.del('posts');
          for (const postJson of updatedPosts) {
            pipeline.lpush('posts', postJson);
          }
          await pipeline.exec();

        } else {
          const posts = await loadPostsLocal();
          const post = posts.find(p => p.id === postId);
          
          if (!post) {
            return response.status(404).json({ message: '投稿が見つかりません' });
          }

          post.previewData = previewData;
          await savePostsLocal(posts);
          console.log('✅ ローカルファイルを更新しました:', postId);
        }

        return response.status(200).json({ 
          success: true, 
          previewData,
          message: 'プレビューが正常に生成されました'
        });
      }

      return response.status(400).json({ message: 'Invalid action' });

    } else {
      return response.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Posts API error:', error);
    return response.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
}
