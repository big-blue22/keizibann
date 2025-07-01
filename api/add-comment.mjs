import { kv } from '@vercel/kv';
import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');

// Vercel KVが利用可能かチェック
function isKvAvailable() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
}

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
  const dataDir = path.dirname(POSTS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2));
}

// 投稿のcommentCountを更新
async function updatePostCommentCount(postId, increment = 1) {
  try {
    if (isKvAvailable()) {
      // 本番環境：Vercel KVを使用
      const postsAsStrings = await kv.lrange('posts', 0, -1);
      const posts = postsAsStrings.map(postData => {
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

      const postIndex = posts.findIndex(post => post.id === postId);
      if (postIndex !== -1) {
        posts[postIndex].commentCount = (posts[postIndex].commentCount || 0) + increment;
        
        // KVのリストを更新
        await kv.del('posts');
        for (let i = posts.length - 1; i >= 0; i--) {
          await kv.lpush('posts', JSON.stringify(posts[i]));
        }
        
        return posts[postIndex];
      }
    } else {
      // 開発環境：ローカルファイルを使用
      const posts = await loadPostsLocal();
      const postIndex = posts.findIndex(post => post.id === postId);
      if (postIndex !== -1) {
        posts[postIndex].commentCount = (posts[postIndex].commentCount || 0) + increment;
        await savePostsLocal(posts);
        return posts[postIndex];
      }
    }
  } catch (error) {
    console.error('Error updating post comment count:', error);
  }
  return null;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { postId, commentContent } = request.body;
    if (!postId || !commentContent) {
      return response.status(400).json({ message: '必須項目が不足しています。' });
    }

    const newComment = {
      id: `comment_${Date.now()}`,
      commentContent,
      createdAt: new Date().toISOString(),
    };

    // 特定の投稿IDに紐づくコメントリストの先頭に新しいコメントを追加
    if (isKvAvailable()) {
      await kv.lpush(`comments:${postId}`, JSON.stringify(newComment));
    }

    // 投稿のcommentCountを更新
    const updatedPost = await updatePostCommentCount(postId, 1);

    return response.status(200).json({ 
      success: true, 
      comment: newComment,
      post: updatedPost 
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return response.status(500).json({ message: 'コメントの保存中にエラーが発生しました。' });
  }
}
