import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');

// 日付をYYYY-MM-DD形式で取得
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// 直近3日間の閲覧数を計算（既存のviewCountから推定）
function calculateRecentViewCount(viewCount) {
  if (!viewCount || viewCount === 0) return 0;
  
  // 既存のviewCountの一部を直近3日間の閲覧数として設定
  // 実際のデータがないため、viewCountの30%を直近3日間の閲覧数として推定
  return Math.max(1, Math.floor(viewCount * 0.3));
}

// 直近3日間の閲覧データを生成
function generateRecentViews(viewCount) {
  if (!viewCount || viewCount === 0) return {};
  
  const recentViewCount = calculateRecentViewCount(viewCount);
  const today = getTodayString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
  
  // 直近3日間に閲覧数を分散
  const todayViews = Math.ceil(recentViewCount * 0.5);
  const yesterdayViews = Math.ceil(recentViewCount * 0.3);
  const twoDaysAgoViews = recentViewCount - todayViews - yesterdayViews;
  
  return {
    [today]: todayViews,
    [yesterdayStr]: yesterdayViews,
    [twoDaysAgoStr]: Math.max(0, twoDaysAgoViews)
  };
}

async function updatePostsWithRecentViews() {
  try {
    console.log('投稿データに直近3日間の閲覧数フィールドを追加中...');
    
    // 投稿データを読み込み
    const data = await fs.readFile(POSTS_FILE, 'utf-8');
    const posts = JSON.parse(data);
    
    let updatedCount = 0;
    
    // 各投稿にrecentViewsとrecentViewCountフィールドを追加
    for (const post of posts) {
      if (!post.recentViews) {
        post.recentViews = generateRecentViews(post.viewCount);
        post.recentViewCount = calculateRecentViewCount(post.viewCount);
        updatedCount++;
        console.log(`投稿 ${post.id} を更新: recentViewCount = ${post.recentViewCount}`);
      }
    }
    
    // 更新されたデータを保存
    await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2));
    
    console.log(`完了: ${updatedCount}件の投稿を更新しました。`);
    console.log('更新内容:');
    console.log('- recentViews: 日別の閲覧数データ');
    console.log('- recentViewCount: 直近3日間の合計閲覧数');
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// スクリプトを実行
updatePostsWithRecentViews(); 