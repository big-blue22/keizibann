import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');

// 日付をYYYY-MM-DD形式で取得
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// 直近3日間の閲覧数を更新（increment-view-count.mjsと同じロジック）
function updateRecentViews(post) {
  const today = getTodayString();
  
  // recentViewsが存在しない場合は初期化
  if (!post.recentViews) {
    post.recentViews = {};
  }
  
  // 3日以上前のデータを削除
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const cutoffDate = threeDaysAgo.toISOString().split('T')[0];
  
  Object.keys(post.recentViews).forEach(date => {
    if (date < cutoffDate) {
      delete post.recentViews[date];
    }
  });
  
  return post;
}

// 直近3日間の合計閲覧数を計算
function calculateRecentViewCount(recentViews) {
  if (!recentViews) return 0;
  return Object.values(recentViews).reduce((sum, count) => sum + count, 0);
}

async function fixRecentViews() {
  try {
    console.log('=== 直近3日間の閲覧数データ修正 ===\n');
    
    // 現在の日付情報を表示
    const today = getTodayString();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoffDate = threeDaysAgo.toISOString().split('T')[0];
    
    console.log(`現在の日付: ${today}`);
    console.log(`3日前の日付: ${cutoffDate}`);
    console.log(`カットオフ日付（3日以上前）: ${cutoffDate}\n`);
    
    // 現在のデータを読み込み
    const data = await fs.readFile(POSTS_FILE, 'utf-8');
    const posts = JSON.parse(data);
    
    console.log('修正前のデータ:');
    posts.forEach((post, index) => {
      console.log(`\n投稿 ${index + 1}:`);
      console.log(`  ID: ${post.id}`);
      console.log(`  総閲覧数: ${post.viewCount || 0}`);
      console.log(`  直近3日間の合計: ${post.recentViewCount || 0}`);
      console.log(`  日別閲覧数:`, post.recentViews || {});
    });
    
    // 各投稿のrecentViewsを修正
    const updatedPosts = posts.map(post => {
      const updatedPost = { ...post };
      
      // 古いデータを削除
      updatedPost = updateRecentViews(updatedPost);
      
      // recentViewCountを再計算
      updatedPost.recentViewCount = calculateRecentViewCount(updatedPost.recentViews);
      
      return updatedPost;
    });
    
    console.log('\n修正後のデータ:');
    updatedPosts.forEach((post, index) => {
      console.log(`\n投稿 ${index + 1}:`);
      console.log(`  ID: ${post.id}`);
      console.log(`  総閲覧数: ${post.viewCount || 0}`);
      console.log(`  直近3日間の合計: ${post.recentViewCount || 0}`);
      console.log(`  日別閲覧数:`, post.recentViews || {});
    });
    
    // データを保存
    await fs.writeFile(POSTS_FILE, JSON.stringify(updatedPosts, null, 2));
    console.log('\n✅ データを修正して保存しました');
    
    // 検証
    console.log('\n=== 検証結果 ===');
    updatedPosts.forEach((post, index) => {
      const calculatedCount = calculateRecentViewCount(post.recentViews);
      const isCorrect = calculatedCount === post.recentViewCount;
      const hasOldData = Object.keys(post.recentViews || {}).some(date => date < cutoffDate);
      
      console.log(`投稿 ${index + 1}:`);
      console.log(`  計算された合計: ${calculatedCount}`);
      console.log(`  保存された合計: ${post.recentViewCount}`);
      console.log(`  合計が一致: ${isCorrect ? '✅' : '❌'}`);
      console.log(`  古いデータが残っている: ${hasOldData ? '❌' : '✅'}`);
    });
    
    console.log('\n=== 修正完了 ===');
    
  } catch (error) {
    console.error('修正中にエラーが発生しました:', error);
  }
}

fixRecentViews(); 