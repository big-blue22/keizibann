// データ復元スクリプト
import { kv } from '@vercel/kv';

// 復元するデータ
const corruptedPosts = [
  {
    id: 'post_1751018811518',
    url: 'https://x.com/yugen_matuni/status/1937955160262905938',
    summary: '意味を伝える情報がありません。',
    labels: [],
    createdAt: '2025-06-27T10:06:51.518Z',
    viewCount: 0
  },
  {
    id: 'post_1751017027963',
    url: 'https://x.com/Dodgers/status/1938087197913076132',
    summary: '情報がありません。',
    labels: [],
    createdAt: '2025-06-27T09:37:07.963Z',
    viewCount: 0
  },
  {
    id: 'post_1751014745189',
    url: 'https://x.com/Dodgers/status/1938087197913076132',
    summary: '意味をなさないため、推敲できません。',
    labels: [],
    createdAt: '2025-06-27T08:59:05.190Z',
    viewCount: 0
  },
  {
    id: 'post_1751014695650',
    url: 'https://x.com/yugen_matuni/status/1937955160262905938',
    summary: 'klklk',
    labels: [],
    createdAt: '2025-06-27T08:58:15.650Z',
    viewCount: 0
  },
  {
    id: 'post_1751014676514',
    url: 'https://x.com/Dodgers/status/1938087197913076132',
    summary: '情報がありません。',
    labels: [],
    createdAt: '2025-06-27T08:57:56.514Z',
    viewCount: 0
  },
  {
    id: 'post_1751013258717',
    url: 'https://x.com/yugen_matuni/status/1937955160262905938',
    summary: '情報が不足しているため、推敲できません。',
    labels: [],
    createdAt: '2025-06-27T08:34:18.717Z',
    viewCount: 0
  },
  {
    id: 'post_1751013244429',
    url: 'https://x.com/Dodgers/status/1938087197913076132',
    summary: '無意味な文字列です。',
    labels: [],
    createdAt: '2025-06-27T08:34:04.429Z',
    viewCount: 0
  },
  {
    id: 'post_1750932805991',
    url: 'https://x.com/genspark_japan/status/1938175412863164522',
    summary: 'Gensparkはどこまで進化するのか...',
    labels: ['人工知能', '未来予測', '技術トレンド', 'Genspark (仮称)', '特定モデルなし'],
    createdAt: '2025-06-26T10:13:25.991Z',
    viewCount: 0
  },
  {
    id: 'post_1750929070515',
    url: 'https://x.com/yugen_matuni/status/1937955160262905938',
    summary: 'Gemini CLIを見る限り、最新の技術は1ヶ月以内にOSSとして再構築されるほど、開発スピードが速まっている。2025年も折り返し地点なのに、この進化の速度は衝撃的だ。今後半年でどこまで発展するのか、目が離せない。',
    labels: ['人工知能', 'オープンソースソフトウェア', '技術開発', 'AI開発速度', 'Gemini'],
    createdAt: '2025-06-26T09:11:10.515Z',
    viewCount: 0
  }
];

async function restoreData() {
  try {
    console.log('データ復元を開始します...');
    
    // 現在のpostsリストを完全に削除
    await kv.del('posts');
    console.log('既存のpostsリストを削除しました');
    
    // 復元データを正しいJSON文字列形式でKVに保存
    for (const post of corruptedPosts.reverse()) { // 古い順に追加するため reverse
      const postJson = JSON.stringify(post);
      await kv.lpush('posts', postJson);
      console.log(`復元完了: ${post.id} - ${post.summary.substring(0, 30)}...`);
    }
    
    console.log(`\n✅ ${corruptedPosts.length}件のデータ復元が完了しました！`);
    
    // 復元後の確認
    const posts = await kv.lrange('posts', 0, -1);
    console.log(`\n確認: 現在のデータベース内投稿数: ${posts.length}`);
    
  } catch (error) {
    console.error('❌ データ復元中にエラーが発生しました:', error);
  }
}

restoreData();
