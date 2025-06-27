// api/increment-view-count.mjs
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
    const { postId } = request.body;
    if (!postId) {
      return response.status(400).json({ message: 'postIdが指定されていません。' });
    }

    // 簡単な重複防止：同じIPからの短時間での重複リクエストをチェック
    const clientIp = request.headers['x-forwarded-for'] || 
                     request.headers['x-real-ip'] || 
                     request.connection?.remoteAddress || 
                     request.socket?.remoteAddress || 
                     'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';
    const fingerprint = `${clientIp}_${userAgent}_${postId}`;

    if (isKvAvailable()) {
      // 重複チェック（5分間のクールダウン）
      const cooldownKey = `viewcount_cooldown:${fingerprint}`;
      const lastAccess = await kv.get(cooldownKey);
      const now = Date.now();
      const cooldownPeriod = 5 * 60 * 1000; // 5分間

      if (lastAccess && (now - lastAccess) < cooldownPeriod) {
        return response.status(429).json({ message: '閲覧数の更新が短時間で重複しています。しばらく待ってから再試行してください。' });
      }

      // 本番環境：Vercel KVを使用
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
        postToUpdate.viewCount = (postToUpdate.viewCount || 0) + 1;
        // 確実にJSON文字列として保存
        await kv.lset('posts', postIndex, JSON.stringify(postToUpdate));
        // クールダウンタイマーを設定
        await kv.set(cooldownKey, now, { ex: Math.floor(cooldownPeriod / 1000) });
        return response.status(200).json({ success: true, post: postToUpdate });
      } else {
        return response.status(404).json({ message: '投稿が見つかりませんでした。' });
      }
    } else {
      // 開発環境：ローカルファイルを使用（簡易的なメモリベースの重複チェック）
      if (!global.viewCountCooldown) {
        global.viewCountCooldown = new Map();
      }
      
      const lastAccess = global.viewCountCooldown.get(fingerprint);
      const now = Date.now();
      const cooldownPeriod = 5 * 60 * 1000; // 5分間

      if (lastAccess && (now - lastAccess) < cooldownPeriod) {
        return response.status(429).json({ message: '閲覧数の更新が短時間で重複しています。しばらく待ってから再試行してください。' });
      }
      const posts = await loadPostsLocal();
      const postIndex = posts.findIndex(post => post.id === postId);

      if (postIndex !== -1) {
        posts[postIndex].viewCount = (posts[postIndex].viewCount || 0) + 1;
        await savePostsLocal(posts);
        // クールダウンタイマーを設定
        global.viewCountCooldown.set(fingerprint, now);
        // 古いエントリをクリーンアップ（メモリリーク防止）
        setTimeout(() => {
          global.viewCountCooldown.delete(fingerprint);
        }, cooldownPeriod);
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
