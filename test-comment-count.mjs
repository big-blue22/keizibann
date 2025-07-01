// コメント数表示のテスト用スクリプト

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

async function testCommentCount() {
  try {
    console.log('=== コメント数表示テスト ===');
    
    // 投稿を取得
    const posts = await loadPostsLocal();
    console.log('投稿数:', posts.length);
    
    if (posts.length > 0) {
      const firstPost = posts[0];
      console.log('最初の投稿:');
      console.log('- ID:', firstPost.id);
      console.log('- commentCount:', firstPost.commentCount);
      
      // テスト用コメントを追加
      if (isKvAvailable()) {
        const testComment = {
          id: `comment_test_${Date.now()}`,
          commentContent: 'これはテスト用のコメントです',
          createdAt: new Date().toISOString(),
        };
        
        await kv.lpush(`comments:${firstPost.id}`, JSON.stringify(testComment));
        console.log('テスト用コメントを追加しました:', testComment.id);
        
        // コメント数を確認
        const comments = await kv.lrange(`comments:${firstPost.id}`, 0, -1);
        console.log('実際のコメント数:', comments.length);
      } else {
        console.log('KVが利用できません。開発環境でのテストをスキップします。');
      }
    }
    
  } catch (error) {
    console.error('テストエラー:', error);
  }
}

testCommentCount();
