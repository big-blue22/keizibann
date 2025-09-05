#!/usr/bin/env node
// 新規投稿の修正をテスト

import fs from 'fs/promises';

const testCreatePost = async () => {
  const testData = {
    url: 'https://example.com/ai-trends',
    summary: 'AIの最新技術について解説した記事です。GPT-4の新機能やClaude-3の性能比較、Geminiの利用方法などが詳しく説明されています。',
    originalContent: 'AI技術の急速な発展により、GPT-4やClaude-3、Geminiなどの大規模言語モデルが注目されています。'
  };

  console.log('🧪 新規投稿APIをテスト中...');
  
  try {
    const response = await fetch('http://localhost:3000/api/create-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ 投稿作成成功!');
      console.log('📝 作成された投稿:', JSON.stringify(result.post, null, 2));
      
      // ローカルデータファイルを確認
      try {
        const data = await fs.readFile('./data/posts.json', 'utf-8');
        const posts = JSON.parse(data);
        console.log(`📊 現在の投稿数: ${posts.length}`);
        console.log('🏷️ 最新投稿のラベル:', posts[0].labels);
      } catch (err) {
        console.log('ℹ️ ローカルデータファイルが見つからない（KVを使用している可能性）');
      }
      
    } else {
      console.error('❌ 投稿作成失敗:');
      console.error('Status:', response.status);
      console.error('Response:', result);
    }
  } catch (error) {
    console.error('❌ リクエスト中にエラー:', error.message);
  }
};

testCreatePost();
