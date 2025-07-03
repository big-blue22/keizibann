// restore-complete-posts.mjs - 完全な投稿データの復元

import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');
const PUBLIC_POSTS_FILE = path.join(process.cwd(), 'public', 'data', 'posts.json');

// 元の高品質な投稿データセット
const qualityPosts = [
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
  },
  {
    id: 'post_1750932805991',
    url: 'https://x.com/genspark_japan/status/1938175412863164522',
    title: 'Gensparkの進化への期待',
    summary: 'Gensparkはどこまで進化するのか... AIエージェントの新しい可能性を感じさせる技術に注目が集まっている。',
    labels: ['人工知能', '未来予測', '技術トレンド', 'Genspark', 'AIエージェント'],
    createdAt: '2025-06-26T10:13:25.991Z',
    viewCount: 8,
    recentViews: {
      "2025-07-01": 2,
      "2025-07-02": 1,
      "2025-06-30": 1,
      "2025-06-29": 1
    },
    recentViewCount: 4
  },
  {
    id: 'post_1703673600000',
    url: 'https://github.com/vercel/storage',
    title: 'Vercel Storage解説',
    summary: 'Vercel Storageは、Vercelプラットフォーム上でデータベースやファイルストレージを簡単に利用できるサービスです。KV、Postgres、Blobなど様々なストレージオプションを提供しています。',
    labels: ['Vercel', 'データベース', 'クラウド'],
    createdAt: '2024-12-27T10:00:00.000Z',
    viewCount: 25,
    recentViews: {
      "2025-07-01": 4,
      "2025-07-02": 3,
      "2025-07-03": 2,
      "2025-06-30": 3,
      "2025-06-29": 2
    },
    recentViewCount: 9
  },
  {
    id: 'post_1703659200000',
    url: 'https://nextjs.org/docs/app/building-your-application/data-fetching',
    title: 'Next.js App Routerのデータフェッチング',
    summary: 'Next.js App Routerでのデータフェッチングの最新手法について。Server Components、Client Components、そしてキャッシュ戦略の使い分けを解説しています。',
    labels: ['Next.js', 'React', 'フロントエンド'],
    createdAt: '2024-12-27T06:00:00.000Z',
    viewCount: 32,
    recentViews: {
      "2025-07-01": 5,
      "2025-07-02": 4,
      "2025-07-03": 3,
      "2025-06-30": 4,
      "2025-06-29": 2
    },
    recentViewCount: 12
  },
  {
    id: 'post_1703140000000',
    url: 'https://platform.openai.com/docs/guides/reasoning',
    title: 'OpenAI o1モデルの推論能力',
    summary: 'OpenAIの新しいo1モデルシリーズは、複雑な推論タスクで画期的な性能を示している。数学、科学、プログラミングなどの分野で人間レベルの思考プロセスを再現できる。',
    labels: ['OpenAI', '推論AI', '数学', 'プログラミング'],
    createdAt: '2024-12-21T12:00:00.000Z',
    viewCount: 45,
    recentViews: {
      "2025-07-01": 7,
      "2025-07-02": 5,
      "2025-07-03": 4,
      "2025-06-30": 6,
      "2025-06-29": 3
    },
    recentViewCount: 16
  },
  {
    id: 'post_1702880000000',
    url: 'https://arxiv.org/abs/2312.11805',
    title: 'LLMのマルチモーダル学習',
    summary: '大規模言語モデル（LLM）のマルチモーダル機能が急速に進化している。テキスト、画像、音声を統合した新しいAIアプリケーションの可能性を探る。',
    labels: ['マルチモーダルAI', '機械学習', '研究論文'],
    createdAt: '2024-12-18T08:00:00.000Z',
    viewCount: 28,
    recentViews: {
      "2025-07-01": 3,
      "2025-07-02": 2,
      "2025-07-03": 2,
      "2025-06-30": 3,
      "2025-06-29": 1
    },
    recentViewCount: 7
  }
];

async function restoreCompletePosts() {
  console.log('📁 完全な投稿データの復元開始\n');
  
  try {
    // 作成日時でソート（降順）
    const sortedPosts = qualityPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log(`📊 復元する投稿数: ${sortedPosts.length}件\n`);
    
    // 復元予定の投稿リスト表示
    console.log('📝 復元する投稿一覧:');
    sortedPosts.forEach((post, index) => {
      const date = new Date(post.createdAt).toLocaleDateString('ja-JP');
      console.log(`${index + 1}. ${post.title} (${date})`);
      console.log(`   閲覧数: 累計 ${post.viewCount} 回 ／ 直近3日間 ${post.recentViewCount} 回`);
      console.log(`   ラベル: ${post.labels.join(', ')}`);
      console.log('');
    });
    
    // メインデータファイルに保存
    await fs.writeFile(POSTS_FILE, JSON.stringify(sortedPosts, null, 2));
    console.log('✅ メインデータファイルを更新しました');
    
    // 公開ディレクトリにも同期
    await fs.writeFile(PUBLIC_POSTS_FILE, JSON.stringify(sortedPosts, null, 2));
    console.log('✅ 公開ディレクトリも同期しました');
    
    console.log('\n🎉 完全な投稿データの復元が完了しました！');
    console.log('\n📊 復元結果:');
    console.log(`- 投稿数: ${sortedPosts.length}件`);
    console.log('- 累計閲覧数と直近3日間閲覧数の両方を含む');
    console.log('- 高品質なタイトルと説明文');
    console.log('- 適切なラベル付け');
    
  } catch (error) {
    console.error('❌ 復元中にエラー:', error);
  }
}

restoreCompletePosts();
