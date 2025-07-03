// test-server-connection.mjs - サーバーデータ接続テスト

import { kv } from '@vercel/kv';

async function testServerConnection() {
  console.log('🔌 Vercel KVサーバー接続テスト開始\n');
  
  try {
    // 環境変数確認
    console.log('📋 環境変数確認:');
    console.log(`KV_REST_API_URL: ${process.env.KV_REST_API_URL ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`KV_REST_API_TOKEN: ${process.env.KV_REST_API_TOKEN ? '✅ 設定済み' : '❌ 未設定'}`);
    
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.log('\n💡 このテストは本番環境でのみ実行可能です');
      console.log('📝 本番環境での確認事項:');
      console.log('1. Vercelダッシュボードで環境変数を確認');
      console.log('2. KV_REST_API_URL と KV_REST_API_TOKEN が設定されているか');
      console.log('3. データベースに実際のデータが存在するか');
      return;
    }
    
    // KV接続テスト
    console.log('\n🔍 KVデータ確認:');
    
    // postsリストの取得
    const posts = await kv.lrange('posts', 0, -1) || [];
    console.log(`📊 サーバー投稿数: ${posts.length}件`);
    
    if (posts.length === 0) {
      console.log('📭 サーバーに投稿データがありません');
      console.log('💡 新規投稿を作成するか、データを復元してください');
      return;
    }
    
    // 各投稿の詳細表示
    console.log('\n📝 サーバー投稿一覧:');
    posts.forEach((postData, index) => {
      try {
        const post = typeof postData === 'string' ? JSON.parse(postData) : postData;
        console.log(`\n${index + 1}. ${post.title || post.summary || 'タイトルなし'}`);
        console.log(`   ID: ${post.id}`);
        console.log(`   作成日: ${new Date(post.createdAt).toLocaleDateString('ja-JP')}`);
        console.log(`   URL: ${post.url || 'なし'}`);
        console.log(`   累計閲覧数: ${post.viewCount || 0}`);
        console.log(`   直近データ: ${post.recentViews ? 'あり' : 'なし'}`);
        console.log(`   ラベル: ${post.labels ? post.labels.join(', ') : 'なし'}`);
      } catch (error) {
        console.log(`${index + 1}. ❌ データ解析エラー: ${postData}`);
      }
    });
    
    console.log('\n✅ サーバー接続テスト完了');
    console.log(`📈 実際のサーバーデータ: ${posts.length}件の投稿が見つかりました`);
    
  } catch (error) {
    console.error('\n❌ サーバー接続エラー:', error);
    console.log('\n🔧 対処法:');
    console.log('1. 環境変数の設定を確認');
    console.log('2. Vercel KVが正しく設定されているか確認');
    console.log('3. 本番環境でテストを実行');
  }
}

testServerConnection();
