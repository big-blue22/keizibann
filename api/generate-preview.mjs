// /api/generate-preview.mjs - 既存投稿用のプレビュー生成API
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

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    console.log('=== GENERATE PREVIEW START ===');
    const { postId, url } = request.body;
    
    if (!postId || !url) {
      return response.status(400).json({ message: 'postId と url が必要です' });
    }

    console.log('プレビュー生成リクエスト:', { postId, url });

    // プレビューデータを生成
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

    // 投稿を更新
    const isVercelEnv = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    const shouldUseKv = isKvAvailable() || isVercelEnv;

    if (shouldUseKv) {
      // KV環境：投稿を検索して更新
      console.log('KV環境で投稿を更新中...');
      
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

      // KVを更新
      const pipeline = kv.pipeline();
      pipeline.del('posts');
      for (const postJson of updatedPosts) {
        pipeline.lpush('posts', postJson);
      }
      await pipeline.exec();

    } else {
      // ローカル環境：ファイルを更新
      console.log('ローカル環境で投稿を更新中...');
      
      const posts = await loadPostsLocal();
      const post = posts.find(p => p.id === postId);
      
      if (!post) {
        return response.status(404).json({ message: '投稿が見つかりません' });
      }

      post.previewData = previewData;
      await savePostsLocal(posts);
      console.log('✅ ローカルファイルを更新しました:', postId);
    }

    console.log('=== GENERATE PREVIEW END ===');
    return response.status(200).json({ 
      success: true, 
      previewData,
      message: 'プレビューが正常に生成されました'
    });

  } catch (error) {
    console.error('❌ プレビュー生成API でエラー:', error);
    return response.status(500).json({ 
      message: 'サーバーエラーが発生しました', 
      error: error.message 
    });
  }
}
