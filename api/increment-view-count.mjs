// api/increment-view-count.mjs
import { kv } from '@vercel/kv';
import { isKvAvailable } from './utils/kv-utils.mjs';
import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');
const VIEW_THROTTLE_MINUTES = 5; // 同じIPから同じ投稿への重複アクセス制限時間（分）

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



// IPアドレスを取得
function getClientIP(request) {
  return request.headers['x-forwarded-for'] || 
         request.headers['x-real-ip'] || 
         request.connection?.remoteAddress || 
         'unknown';
}

// 日付をYYYY-MM-DD形式で取得
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// 直近3日間の閲覧数を更新
function updateRecentViews(post) {
  const today = getTodayString();
  
  // recentViewsが存在しない場合は初期化
  if (!post.recentViews) {
    post.recentViews = {};
  }
  
  // 今日の閲覧数をインクリメント
  post.recentViews[today] = (post.recentViews[today] || 0) + 1;
  
  // 3日以上前のデータを削除
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const cutoffDate = threeDaysAgo.toISOString().split('T')[0];
  
  Object.keys(post.recentViews).forEach(date => {
    if (date < cutoffDate) {
      delete post.recentViews[date];
    }
  });
  
  return post;
}

// 直近3日間の合計閲覧数を計算
function calculateRecentViewCount(recentViews) {
  if (!recentViews) return 0;
  return Object.values(recentViews).reduce((sum, count) => sum + count, 0);
}

// 重複アクセスチェック
async function isDuplicateView(postId, clientIP) {
  const key = `view_throttle:${postId}:${clientIP}`;
  
  if (isKvAvailable()) {
    try {
      const lastView = await kv.get(key);
      if (lastView) {
        const timeDiff = Date.now() - parseInt(lastView);
        return timeDiff < (VIEW_THROTTLE_MINUTES * 60 * 1000);
      }
      // 新しいビューを記録
      await kv.set(key, Date.now().toString(), { ex: VIEW_THROTTLE_MINUTES * 60 });
      return false;
    } catch (error) {
      console.error('Error checking duplicate view:', error);
      return false; // エラーの場合は制限しない
    }
  } else {
    // 開発環境では簡易的な制限（メモリ上で管理）
    if (!global.viewThrottle) {
      global.viewThrottle = new Map();
    }
    
    const lastView = global.viewThrottle.get(key);
    if (lastView) {
      const timeDiff = Date.now() - lastView;
      if (timeDiff < (VIEW_THROTTLE_MINUTES * 60 * 1000)) {
        return true;
      }
    }
    
    global.viewThrottle.set(key, Date.now());
    // 古いエントリをクリーンアップ
    setTimeout(() => {
      global.viewThrottle.delete(key);
    }, VIEW_THROTTLE_MINUTES * 60 * 1000);
    
    return false;
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { postId } = request.body;
    if (!postId) {
      return response.status(400).json({ message: 'postIdが指定されていません。' });
    }

    // クライアントIPを取得
    const clientIP = getClientIP(request);
    console.log(`View count request from IP: ${clientIP} for post: ${postId}`);

    // 重複アクセスチェック
    const isDuplicate = await isDuplicateView(postId, clientIP);
    if (isDuplicate) {
      console.log(`Duplicate view blocked for IP: ${clientIP}, post: ${postId}`);
      return response.status(429).json({ 
        message: 'Too many requests. Please wait before viewing again.',
        throttled: true 
      });
    }

    if (isKvAvailable()) {
      // 本番環境：Vercel KVを使用
      try {
        const posts = await kv.lrange('posts', 0, -1);
        let postToUpdate = null;
        let postIndex = -1;

        for (let i = 0; i < posts.length; i++) {
          try {
            let post;
            // 既にオブジェクトの場合
            if (typeof posts[i] === 'object' && posts[i] !== null) {
              post = posts[i];
            }
            // 文字列の場合はJSON.parseを試行
            else if (typeof posts[i] === 'string') {
              post = JSON.parse(posts[i]);
            }
            else {
              continue; // 不明なデータはスキップ
            }
            
            if (post.id === postId) {
              postToUpdate = post;
              postIndex = i;
              break;
            }
          } catch (e) {
            console.error(`Error parsing post at index ${i}:`, posts[i], e);
          }
        }

        if (postToUpdate && postIndex !== -1) {
          // 総閲覧数をインクリメント
          postToUpdate.viewCount = (postToUpdate.viewCount || 0) + 1;
          
          // 直近3日間の閲覧数を更新
          postToUpdate = updateRecentViews(postToUpdate);
          
          // 直近3日間の合計閲覧数を計算
          postToUpdate.recentViewCount = calculateRecentViewCount(postToUpdate.recentViews);
          
          // 確実にJSON文字列として保存
          await kv.lset('posts', postIndex, JSON.stringify(postToUpdate));
          return response.status(200).json({ success: true, post: postToUpdate });
        } else {
          return response.status(404).json({ message: '投稿が見つかりませんでした。' });
        }
      } catch (kvError) {
        console.error('❌ KV operation error:', kvError.message);
        return response.status(503).json({ 
          message: 'サービスが一時的に利用できません。しばらく後でお試しください。',
          error: 'KV service unavailable'
        });
      }
    } else {
      // 開発環境：ローカルファイルを使用
      const posts = await loadPostsLocal();
      const postIndex = posts.findIndex(post => post.id === postId);

      if (postIndex !== -1) {
        // 総閲覧数をインクリメント
        posts[postIndex].viewCount = (posts[postIndex].viewCount || 0) + 1;
        
        // 直近3日間の閲覧数を更新
        posts[postIndex] = updateRecentViews(posts[postIndex]);
        
        // 直近3日間の合計閲覧数を計算
        posts[postIndex].recentViewCount = calculateRecentViewCount(posts[postIndex].recentViews);
        
        await savePostsLocal(posts);
        return response.status(200).json({ success: true, post: posts[postIndex] });
      } else {
        return response.status(404).json({ message: '投稿が見つかりませんでした。' });
      }
    }

  } catch (error) {
    console.error('Error incrementing view count:', error);
    return response.status(500).json({ message: '閲覧数の更新中にエラーが発生しました。' });
  }
}
