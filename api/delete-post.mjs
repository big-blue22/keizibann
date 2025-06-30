// api/delete-post.mjs
import { kv } from '@vercel/kv';
import fs from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production';

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

  // 管理者認証をチェック
  const token = request.headers.authorization?.split(' ')[1];
  console.log('Received token for delete post:', token);
  
  if (!token) {
    console.error('No authorization token provided');
    return response.status(401).json({ message: '認証トークンが必要です。' });
  }

  try {
    // JWT token validation
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) {
      console.error('Token does not have admin privileges');
      return response.status(401).json({ message: '管理者権限が必要です。' });
    }
    console.log('Admin token verified successfully');
  } catch (jwtError) {
    console.error('JWT verification failed:', jwtError.message);
    return response.status(401).json({ message: '無効な認証トークンです。' });
  }

  try {
    const { postId } = request.body;
    console.log('Attempting to delete post with ID:', postId);
    console.log('Attempting to delete post with ID:', postId);
    if (!postId) {
      console.error('No postId provided in request body');
      return response.status(400).json({ message: '投稿IDが必要です。' });
    }

    if (isKvAvailable()) {
      // 本番環境：Vercel KVを使用
      const allPosts = await kv.lrange('posts', 0, -1);
      const postsToKeep = allPosts.filter(postData => {
        try {
          let post;
          // 既にオブジェクトの場合
          if (typeof postData === 'object' && postData !== null) {
            post = postData;
          }
          // 文字列の場合はJSON.parseを試行
          else if (typeof postData === 'string') {
            post = JSON.parse(postData);
          }
          else {
            return true; // 不明なデータは保持
          }
          
          return post.id !== postId;
        } catch (e) {
          console.error("Could not parse post, keeping it:", postData);
          return true;
        }
      });

      if (allPosts.length === postsToKeep.length) {
        console.log('Post not found for deletion:', postId);
        return response.status(404).json({ message: '指定された投稿が見つかりません。' });
      }

      console.log(`Deleting post from KV. Before: ${allPosts.length}, After: ${postsToKeep.length}`);

      await kv.del('posts');
      if (postsToKeep.length > 0) {
        // 確実にJSON文字列として保存し直す
        const stringifiedPosts = postsToKeep.map(postData => {
          if (typeof postData === 'string') {
            return postData;
          }
          return JSON.stringify(postData);
        });
        await kv.lpush('posts', ...stringifiedPosts.reverse());
      }
    } else {
      // 開発環境：ローカルファイルを使用
      const posts = await loadPostsLocal();
      const filteredPosts = posts.filter(post => post.id !== postId);
      
      if (posts.length === filteredPosts.length) {
        console.log('Post not found for deletion in local file:', postId);
        return response.status(404).json({ message: '指定された投稿が見つかりません。' });
      }

      console.log(`Deleting post from local file. Before: ${posts.length}, After: ${filteredPosts.length}`);

      await savePostsLocal(filteredPosts);
    }

    console.log('Post deleted successfully:', postId);
    return response.status(200).json({ success: true });

  } catch (error) {
    console.error('Error deleting post:', error);
    return response.status(500).json({ message: '投稿の削除中にエラーが発生しました。' });
  }
}
