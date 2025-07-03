// test-view-count-verification.mjs
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
  
  // 今日の閲覧数をインクリメント
  post.recentViews[today] = (post.recentViews[today] || 0) + 1;
  
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

async function testViewCount() {
  try {
    console.log('=== 直近3日間の閲覧数カウント機能テスト ===\n');
    
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
    
    console.log('現在の投稿データ:');
    posts.forEach((post, index) => {
      console.log(`\n投稿 ${index + 1}:`);
      console.log(`  ID: ${post.id}`);
      console.log(`  総閲覧数: ${post.viewCount || 0}`);
      console.log(`  直近3日間の合計: ${post.recentViewCount || 0}`);
      console.log(`  日別閲覧数:`, post.recentViews || {});
    });
    
    // テスト用の投稿を作成（既存の投稿をコピー）
    const testPost = { ...posts[0] };
    testPost.id = 'test_post_' + Date.now();
    
    console.log('\n=== 閲覧数カウントのテスト ===');
    
    // 1回目の閲覧
    console.log('\n1回目の閲覧:');
    testPost.viewCount = (testPost.viewCount || 0) + 1;
    const updatedPost1 = updateRecentViews(testPost);
    updatedPost1.recentViewCount = calculateRecentViewCount(updatedPost1.recentViews);
    console.log(`  総閲覧数: ${updatedPost1.viewCount}`);
    console.log(`  直近3日間の合計: ${updatedPost1.recentViewCount}`);
    console.log(`  日別閲覧数:`, updatedPost1.recentViews);
    
    // 2回目の閲覧
    console.log('\n2回目の閲覧:');
    updatedPost1.viewCount = updatedPost1.viewCount + 1;
    const updatedPost2 = updateRecentViews(updatedPost1);
    updatedPost2.recentViewCount = calculateRecentViewCount(updatedPost2.recentViews);
    console.log(`  総閲覧数: ${updatedPost2.viewCount}`);
    console.log(`  直近3日間の合計: ${updatedPost2.recentViewCount}`);
    console.log(`  日別閲覧数:`, updatedPost2.recentViews);
    
    // 3日後の日付でテスト（古いデータの削除をテスト）
    console.log('\n=== 3日後の日付でのテスト（古いデータ削除） ===');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const futureDateString = futureDate.toISOString().split('T')[0];
    
    console.log(`テスト用の未来の日付: ${futureDateString}`);
    
    // 未来の日付で閲覧数を追加
    const futurePost = { ...updatedPost2 };
    futurePost.recentViews[futureDateString] = 5;
    futurePost.recentViewCount = calculateRecentViewCount(futurePost.recentViews);
    
    console.log('未来の日付を追加後:');
    console.log(`  直近3日間の合計: ${futurePost.recentViewCount}`);
    console.log(`  日別閲覧数:`, futurePost.recentViews);
    
    // 3日後の日付でupdateRecentViewsを実行（古いデータが削除されるはず）
    const cleanedPost = updateRecentViews(futurePost);
    cleanedPost.recentViewCount = calculateRecentViewCount(cleanedPost.recentViews);
    
    console.log('\n古いデータ削除後:');
    console.log(`  直近3日間の合計: ${cleanedPost.recentViewCount}`);
    console.log(`  日別閲覧数:`, cleanedPost.recentViews);
    
    // 検証
    console.log('\n=== 検証結果 ===');
    const hasOldData = Object.keys(cleanedPost.recentViews).some(date => date < cutoffDate);
    console.log(`古いデータ（${cutoffDate}以前）が残っている: ${hasOldData ? '❌ 問題あり' : '✅ 正常'}`);
    
    const totalCount = Object.values(cleanedPost.recentViews).reduce((sum, count) => sum + count, 0);
    console.log(`計算された合計閲覧数: ${totalCount}`);
    console.log(`recentViewCountフィールド: ${cleanedPost.recentViewCount}`);
    console.log(`合計が一致している: ${totalCount === cleanedPost.recentViewCount ? '✅ 正常' : '❌ 問題あり'}`);
    
    console.log('\n=== テスト完了 ===');
    
  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error);
  }
}

testViewCount(); 