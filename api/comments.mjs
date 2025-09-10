// /api/comments.mjs - コメント関連の統合API
import { kv } from '@vercel/kv';
import { isKvAvailable } from './utils/kv-utils.mjs';
import fs from 'fs/promises';
import path from 'path';

const COMMENTS_FILE = path.join(process.cwd(), 'data', 'comments.json');

// ローカルファイルからコメントを読み込み
async function loadCommentsLocal() {
  try {
    const data = await fs.readFile(COMMENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// ローカルファイルにコメントを保存
async function saveCommentsLocal(comments) {
  const dataDir = path.dirname(COMMENTS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  await fs.writeFile(COMMENTS_FILE, JSON.stringify(comments, null, 2));
}

export default async function handler(request, response) {
  const { method } = request;
  
  try {
    if (method === 'GET') {
      // GET /api/comments?postId=xxx - コメント取得
      const { postId } = request.query;
      if (!postId) {
        return response.status(400).json({ message: 'postId is required' });
      }

      const isVercelEnv = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
      const shouldUseKv = isKvAvailable() || isVercelEnv;

      if (shouldUseKv) {
        const comments = await kv.lrange(`comments:${postId}`, 0, -1) || [];
        const parsedComments = comments.map(c => typeof c === 'string' ? JSON.parse(c) : c);
        return response.status(200).json(parsedComments);
      } else {
        const allComments = await loadCommentsLocal();
        const postComments = allComments.filter(c => c.postId === postId);
        return response.status(200).json(postComments);
      }

    } else if (method === 'POST') {
      // POST /api/comments - コメント追加
      const { postId, content } = request.body;
      if (!postId || !content) {
        return response.status(400).json({ message: 'postId and content are required' });
      }

      const newComment = {
        id: `comment_${Date.now()}`,
        postId,
        content,
        createdAt: new Date().toISOString(),
      };

      const isVercelEnv = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
      const shouldUseKv = isKvAvailable() || isVercelEnv;

      if (shouldUseKv) {
        await kv.lpush(`comments:${postId}`, JSON.stringify(newComment));
      } else {
        const comments = await loadCommentsLocal();
        comments.push(newComment);
        await saveCommentsLocal(comments);
      }

      return response.status(200).json({ success: true, comment: newComment });

    } else if (method === 'DELETE') {
      // DELETE /api/comments - コメント削除
      const { commentId, postId } = request.body;
      if (!commentId || !postId) {
        return response.status(400).json({ message: 'commentId and postId are required' });
      }

      const isVercelEnv = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
      const shouldUseKv = isKvAvailable() || isVercelEnv;

      if (shouldUseKv) {
        const comments = await kv.lrange(`comments:${postId}`, 0, -1) || [];
        const filteredComments = comments.filter(c => {
          const comment = typeof c === 'string' ? JSON.parse(c) : c;
          return comment.id !== commentId;
        });

        await kv.del(`comments:${postId}`);
        for (const comment of filteredComments) {
          await kv.lpush(`comments:${postId}`, typeof comment === 'string' ? comment : JSON.stringify(comment));
        }
      } else {
        const allComments = await loadCommentsLocal();
        const filteredComments = allComments.filter(c => c.id !== commentId);
        await saveCommentsLocal(filteredComments);
      }

      return response.status(200).json({ success: true });

    } else {
      return response.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Comments API error:', error);
    return response.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
}
