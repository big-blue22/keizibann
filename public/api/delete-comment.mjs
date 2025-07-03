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

// 投稿のcommentCountを更新
async function updatePostCommentCount(postId, increment = -1) {
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
        posts[postIndex].commentCount = Math.max((posts[postIndex].commentCount || 0) + increment, 0);
        
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
        posts[postIndex].commentCount = Math.max((posts[postIndex].commentCount || 0) + increment, 0);
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

  // 管理者認証
  const token = request.headers.authorization?.split(' ')[1];
  console.log('Received token for delete comment:', token);
  
  if (!token) {
    console.error('No authorization token provided for comment deletion');
    return response.status(401).json({ message: '認証トークンが必要です。' });
  }

  try {
    // JWT token validation
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) {
      console.error('Token does not have admin privileges');
      return response.status(401).json({ message: '管理者権限が必要です。' });
    }
    
    // トークンの有効期限をより厳密にチェック
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      console.error('Token has expired');
      return response.status(401).json({ message: 'トークンの有効期限が切れています。再ログインしてください。' });
    }
    
    console.log('Admin token verified successfully for comment deletion');
  } catch (jwtError) {
    console.error('JWT verification failed for comment deletion:', jwtError.message);
    if (jwtError.name === 'TokenExpiredError') {
      return response.status(401).json({ message: 'トークンの有効期限が切れています。再ログインしてください。' });
    } else if (jwtError.name === 'JsonWebTokenError') {
      return response.status(401).json({ message: '無効なトークンです。' });
    } else {
      return response.status(401).json({ message: '認証に失敗しました。' });
    }
  }

  try {
    const { postId, commentId } = request.body;
    console.log('Attempting to delete comment:', { postId, commentId });
    
    if (!postId || !commentId) {
      console.error('Missing required fields for comment deletion:', { postId, commentId });
      return response.status(400).json({ message: '必須項目が不足しています。' });
    }

    // コメントリストから指定されたコメントを削除
    if (isKvAvailable()) {
      // 本番環境：Vercel KVを使用
      // Vercel KVのLREMは指定された値と一致する要素を削除します。
      // ここではコメントIDでフィルタリングするために、一度全てのコメントを取得し、
      // 削除対象を除外した新しいリストで上書きします。
      const commentsKey = `comments:${postId}`;
      let comments = await kv.lrange(commentsKey, 0, -1);
      console.log(`Found ${comments.length} comments for post ${postId}`);

      // JSON文字列として保存されているため、パースしてフィルタリング
      const parsedComments = comments.map(c => JSON.parse(c));
      const updatedComments = parsedComments.filter(c => c.id !== commentId);
      console.log(`After filtering: ${updatedComments.length} comments remaining`);

      if (parsedComments.length === updatedComments.length) {
        console.log('Comment not found for deletion:', commentId);
        return response.status(404).json({ message: '指定されたコメントが見つかりません。' });
      }

      // 元のリストを削除し、新しいリストで上書き
      await kv.del(commentsKey);
      if (updatedComments.length > 0) {
        // lpushは複数の引数を取れるので、逆順にして一括で追加
        await kv.lpush(commentsKey, ...updatedComments.map(c => JSON.stringify(c)).reverse());
      }

      // 投稿のcommentCountを更新
      await updatePostCommentCount(postId, -1);
    } else {
      // 開発環境：ローカルファイルを使用
      console.log('Using local file storage for comment deletion');
      const posts = await loadPostsLocal();
      const targetPost = posts.find(p => p.id === postId);
      
      if (!targetPost) {
        console.log('Post not found for comment deletion:', postId);
        return response.status(404).json({ message: '指定された投稿が見つかりません。' });
      }

      if (!targetPost.comments) {
        targetPost.comments = [];
      }

      const originalCommentCount = targetPost.comments.length;
      targetPost.comments = targetPost.comments.filter(c => c.id !== commentId);
      
      if (originalCommentCount === targetPost.comments.length) {
        console.log('Comment not found for deletion:', commentId);
        return response.status(404).json({ message: '指定されたコメントが見つかりません。' });
      }

      await savePostsLocal(posts);
      console.log(`Comment deleted from local file. Before: ${originalCommentCount}, After: ${targetPost.comments.length}`);

      // 投稿のcommentCountを更新
      await updatePostCommentCount(postId, -1);
    }

    console.log('Comment deleted successfully:', commentId);
    return response.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return response.status(500).json({ message: 'コメントの削除中にエラーが発生しました。' });
  }
}
