// simple-api-test.mjs - APIの簡単な動作確認

import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');

// 直近3日間の合計閲覧数を計算
function calculateRecentViewCount(recentViews) {
  if (!recentViews) return 0;
  
  // 現在日時から3日前まで
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const cutoffDate = threeDaysAgo.toISOString().split('T')[0];
  
  let totalCount = 0;
  Object.entries(recentViews).forEach(([date, count]) => {
    if (date >= cutoffDate) {
      totalCount += count;
    }
  });
  
  return totalCount;
}

// 投稿データを正規化（recentViewCountを計算）
function normalizePost(post) {
  if (!post) return null;
  
  // recentViewCountが未計算の場合は計算
  if (post.recentViewCount === undefined && post.recentViews) {
    post.recentViewCount = calculateRecentViewCount(post.recentViews);
  }
  
  return post;
}

async function testLocal() {
  console.log('📊 ローカルデータテスト開始\n');
  
  try {
    // データファイル読み込み
    const data = await fs.readFile(POSTS_FILE, 'utf-8');
    const posts = JSON.parse(data);
    
    console.log(`✅ ${posts.length}件の投稿を読み込みました`);
    
    // 各投稿を正規化
    const normalizedPosts = posts.map(normalizePost);
    
    // テスト投稿を検索
    const testPost = normalizedPosts.find(post => post.title?.includes('閲覧数表示テスト'));
    
    if (testPost) {
      console.log('\n🎯 テスト投稿の詳細:');
      console.log(`- ID: ${testPost.id}`);
      console.log(`- タイトル: ${testPost.title}`);
      console.log(`- 累計閲覧数: ${testPost.viewCount}`);
      console.log(`- 直近3日間閲覧数: ${testPost.recentViewCount}`);
      console.log('- recentViews:', testPost.recentViews);
      
      // 表示フォーマットのテスト
      const displayText = `閲覧数: 累計 ${testPost.viewCount || 0} 回 ／ 直近3日間 ${testPost.recentViewCount !== undefined ? testPost.recentViewCount : 0} 回`;
      console.log(`\n🎨 表示形式: ${displayText}`);
      
      // 手動計算での検証
      console.log('\n🔍 手動計算検証:');
      const today = new Date();
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(today.getDate() - 3);
      const cutoffDate = threeDaysAgo.toISOString().split('T')[0];
      console.log(`- 3日前の日付: ${cutoffDate}`);
      
      let manualTotal = 0;
      Object.entries(testPost.recentViews || {}).forEach(([date, count]) => {
        const isRecent = date >= cutoffDate;
        console.log(`  ${date}: ${count} ${isRecent ? '(含む)' : '(除外)'}`);
        if (isRecent) manualTotal += count;
      });
      
      console.log(`- 手動計算結果: ${manualTotal}`);
      console.log(`- API計算結果: ${testPost.recentViewCount}`);
      
      if (manualTotal === testPost.recentViewCount) {
        console.log('✅ 計算結果が一致しています');
      } else {
        console.log('❌ 計算結果が異なります');
      }
      
    } else {
      console.log('⚠️ テスト投稿が見つかりませんでした');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testLocal();
