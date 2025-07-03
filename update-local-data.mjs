// update-local-data.mjs - ローカルデータを実際のサーバーデータに合わせて更新

import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');
const PUBLIC_POSTS_FILE = path.join(process.cwd(), 'public', 'data', 'posts.json');

// 実際にサーバーに投稿された質の良いデータのみ（2024年のダミーデータを除外）
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

async function updateLocalData() {
  console.log('📝 ローカルデータの更新開始\n');
  
  try {
    // 作成日時でソート（降順 - 新しい順）
    const sortedPosts = actualServerPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log('🗑️ 2024年のダミーデータを削除し、実際のサーバーデータのみに更新');
    console.log(`📊 投稿数: ${sortedPosts.length}件 (実際のサーバー投稿のみ)\n`);
    
    // 投稿リスト表示
    console.log('📝 更新後の投稿一覧:');
    sortedPosts.forEach((post, index) => {
      const date = new Date(post.createdAt).toLocaleDateString('ja-JP');
      console.log(`${index + 1}. ${post.title}`);
      console.log(`   作成日: ${date}`);
      console.log(`   閲覧数: 累計 ${post.viewCount} 回 ／ 直近3日間 ${post.recentViewCount} 回`);
      console.log(`   ラベル: ${post.labels.join(', ')}`);
      console.log(`   URL: ${post.url}`);
      console.log('');
    });
    
    // メインデータファイルに保存
    await fs.writeFile(POSTS_FILE, JSON.stringify(sortedPosts, null, 2));
    console.log('✅ メインデータファイル (/data/posts.json) を更新しました');
    
    // 公開ディレクトリにも同期
    await fs.writeFile(PUBLIC_POSTS_FILE, JSON.stringify(sortedPosts, null, 2));
    console.log('✅ 公開ディレクトリ (/public/data/posts.json) も同期しました');
    
    console.log('\n🎉 ローカルデータの更新が完了しました！');
    console.log('\n📋 注意事項:');
    console.log('- これらは実際にサーバーに投稿されたデータです');
    console.log('- 2024年のダミーデータは削除されました');
    console.log('- サーバーのVercel KVデータも同様に復元する必要があります');
    console.log('- 本番環境では restore-server-data.mjs を実行してください');
    
  } catch (error) {
    console.error('❌ ローカルデータ更新中にエラー:', error);
  }
}

updateLocalData();
