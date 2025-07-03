// check-kv-data.mjs - Vercel KVのデータ確認

import { kv } from '@vercel/kv';

async function checkKvData() {
  console.log('🔍 Vercel KVデータ確認開始\n');
  
  try {
    // KV接続確認
    console.log('🔌 KV接続確認:');
    console.log(`KV_REST_API_URL: ${process.env.KV_REST_API_URL ? '設定済み' : '未設定'}`);
    console.log(`KV_REST_API_TOKEN: ${process.env.KV_REST_API_TOKEN ? '設定済み' : '未設定'}`);
    
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.log('❌ KV環境変数が設定されていません（開発環境）');
      console.log('💡 本番環境でのみKVデータを確認できます');
      return;
    }
    
    // postsリストの確認
    console.log('\n📊 postsリストの確認:');
    const posts = await kv.lrange('posts', 0, -1);
    console.log(`投稿数: ${posts ? posts.length : 0}件`);
    
    if (posts && posts.length > 0) {
      console.log('\n📝 KVに保存されている投稿:');
      posts.forEach((postData, index) => {
        try {
          const post = typeof postData === 'string' ? JSON.parse(postData) : postData;
          const title = post.title || post.summary || 'タイトルなし';
          const date = new Date(post.createdAt).toLocaleDateString('ja-JP');
          console.log(`${index + 1}. ${title.substring(0, 50)}... (${date})`);
          console.log(`   ID: ${post.id}`);
          console.log(`   URL: ${post.url || 'なし'}`);
          console.log(`   閲覧数: ${post.viewCount || 0}`);
          console.log('');
        } catch (error) {
          console.log(`${index + 1}. ❌ パース不可: ${postData}`);
        }
      });
    } else {
      console.log('📭 KVに投稿データがありません');
    }
    
    // その他のKVキーの確認
    console.log('\n🗂️ その他のKVデータ確認:');
    try {
      // コメントデータの確認（サンプル）
      const sampleCommentKey = 'comments:post_1750929070515';
      const comments = await kv.lrange(sampleCommentKey, 0, -1);
      console.log(`サンプルコメント (${sampleCommentKey}): ${comments ? comments.length : 0}件`);
      
      // 閲覧数データの確認（サンプル）
      const sampleViewKey = 'views:post_1750929070515';
      const views = await kv.get(sampleViewKey);
      console.log(`サンプル閲覧数 (${sampleViewKey}): ${views || 0}`);
      
    } catch (error) {
      console.log('⚠️ その他のデータ確認中にエラー:', error.message);
    }
    
  } catch (error) {
    console.error('❌ KVデータ確認中にエラー:', error);
    console.log('\n💡 対処法:');
    console.log('1. Vercel環境変数を確認');
    console.log('2. KV_REST_API_URL と KV_REST_API_TOKEN の設定');
    console.log('3. 本番環境での実行');
  }
}

checkKvData();
