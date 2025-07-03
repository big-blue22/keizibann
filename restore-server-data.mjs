// restore-server-data.mjs - サーバーの実際の投稿データ復元

import { kv } from '@vercel/kv';

// 実際にサーバーに投稿された質の良いデータ（破損したものは除外）
const actualServerPosts = [
  {
    id: 'post_1750932805991',
    url: 'https://x.com/genspark_japan/status/1938175412863164522',
    title: 'Gensparkの進化可能性',
    summary: 'Gensparkはどこまで進化するのか... AIエージェントとしての新しい可能性を探る技術に期待が高まっている。',
    labels: ['人工知能', '未来予測', '技術トレンド', 'Genspark', 'AIエージェント'],
    createdAt: '2025-06-26T10:13:25.991Z',
    viewCount: 8,
    recentViews: {
      "2025-07-01": 2,
      "2025-07-02": 1,
      "2025-07-03": 1,
      "2025-06-30": 1,
      "2025-06-29": 1
    },
    recentViewCount: 4
  },
  {
    id: 'post_1750929070515',
    url: 'https://x.com/yugen_matuni/status/1937955160262905938',
    title: 'AI開発速度の衝撃的な進化',
    summary: 'Gemini CLIを見る限り、最新の技術は1ヶ月以内にOSSとして再構築されるほど、開発スピードが速まっている。2025年も折り返し地点なのに、この進化の速度は衝撃的だ。今後半年でどこまで発展するのか、目が離せない。',
    labels: ['人工知能', 'オープンソースソフトウェア', '技術開発', 'AI開発速度', 'Gemini'],
    createdAt: '2025-06-26T09:11:10.515Z',
    viewCount: 15,
    recentViews: {
      "2025-07-01": 3,
      "2025-07-02": 2,
      "2025-07-03": 1,
      "2025-06-30": 2,
      "2025-06-29": 1
    },
    recentViewCount: 6
  }
];

// Vercel KVが利用可能かチェック
function isKvAvailable() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
}

async function restoreServerData() {
  console.log('🔄 サーバーデータ復元開始\n');
  
  try {
    if (!isKvAvailable()) {
      console.log('⚠️ 開発環境: KV環境変数が設定されていません');
      console.log('💡 このスクリプトは本番環境またはKV設定済み環境で実行してください\n');
      
      console.log('📋 本番環境での実行手順:');
      console.log('1. Vercelにデプロイ');
      console.log('2. 環境変数を設定:');
      console.log('   - KV_REST_API_URL');
      console.log('   - KV_REST_API_TOKEN');
      console.log('3. 本番環境でこのスクリプトを実行');
      
      console.log('\n📝 復元予定のデータ:');
      actualServerPosts.forEach((post, index) => {
        console.log(`${index + 1}. ${post.title}`);
        console.log(`   作成日: ${new Date(post.createdAt).toLocaleDateString('ja-JP')}`);
        console.log(`   URL: ${post.url}`);
        console.log(`   ラベル: ${post.labels.join(', ')}`);
        console.log('');
      });
      return;
    }
    
    console.log('🔌 KV接続確認: OK');
    
    // 現在のデータを確認
    console.log('\n📊 現在のKVデータ確認:');
    const currentPosts = await kv.lrange('posts', 0, -1) || [];
    console.log(`現在の投稿数: ${currentPosts.length}件`);
    
    if (currentPosts.length > 0) {
      console.log('\n🗑️ 既存データの削除...');
      await kv.del('posts');
      console.log('✅ 既存データを削除しました');
    }
    
    // 新しいデータを投稿（古い順に追加）
    console.log('\n📝 新しいデータの投稿:');
    const sortedPosts = actualServerPosts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    for (const post of sortedPosts) {
      const postJson = JSON.stringify(post);
      await kv.lpush('posts', postJson);
      console.log(`✅ 投稿追加: ${post.title}`);
    }
    
    // 復元後の確認
    console.log('\n🔍 復元後の確認:');
    const restoredPosts = await kv.lrange('posts', 0, -1) || [];
    console.log(`復元後の投稿数: ${restoredPosts.length}件`);
    
    restoredPosts.forEach((postData, index) => {
      try {
        const post = typeof postData === 'string' ? JSON.parse(postData) : postData;
        const date = new Date(post.createdAt).toLocaleDateString('ja-JP');
        console.log(`${index + 1}. ${post.title} (${date})`);
      } catch (error) {
        console.log(`${index + 1}. ❌ パース不可: ${postData}`);
      }
    });
    
    console.log('\n🎉 サーバーデータの復元が完了しました！');
    
  } catch (error) {
    console.error('❌ サーバーデータ復元中にエラー:', error);
  }
}

restoreServerData();
