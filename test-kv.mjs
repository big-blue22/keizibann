// Vercel KV接続テスト
import { kv } from '@vercel/kv';

async function testKvConnection() {
  try {
    console.log('Vercel KV接続テストを開始します...');
    
    // テストデータの書き込み
    const testKey = 'test_connection';
    const testValue = `test_${Date.now()}`;
    
    await kv.set(testKey, testValue);
    console.log('✓ データの書き込み成功');
    
    // テストデータの読み込み
    const retrievedValue = await kv.get(testKey);
    console.log('✓ データの読み込み成功:', retrievedValue);
    
    // テストデータの削除
    await kv.del(testKey);
    console.log('✓ データの削除成功');
    
    // 既存の投稿データの確認
    const posts = await kv.lrange('posts', 0, -1);
    console.log(`現在の投稿数: ${posts.length}`);
    
    if (posts.length > 0) {
      console.log('最新の投稿:');
      try {
        const latestPost = JSON.parse(posts[0]);
        console.log(`- ID: ${latestPost.id}`);
        console.log(`- 作成日: ${latestPost.createdAt}`);
        console.log(`- URL: ${latestPost.url}`);
      } catch (e) {
        console.log('投稿データの解析に失敗:', posts[0]);
      }
    }
    
    console.log('Vercel KV接続テスト完了！');
    
  } catch (error) {
    console.error('Vercel KV接続エラー:', error.message);
    console.error('詳細:', error);
  }
}

testKvConnection();
