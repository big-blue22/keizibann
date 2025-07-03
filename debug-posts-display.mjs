// debug-posts-display.mjs - 投稿表示問題のデバッグ

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

async function debugPostsDisplay() {
  console.log('🔍 投稿表示問題のデバッグ開始\n');
  
  try {
    // 1. データファイル確認
    console.log('📁 データファイル確認:');
    const data = await fs.readFile(POSTS_FILE, 'utf-8');
    const rawPosts = JSON.parse(data);
    console.log(`- ファイル内投稿数: ${rawPosts.length}件`);
    
    // 2. 各投稿の基本情報確認
    console.log('\n📝 投稿一覧:');
    rawPosts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title || post.summary || 'タイトルなし'}`);
      console.log(`   ID: ${post.id}`);
      console.log(`   作成日: ${post.createdAt}`);
      console.log(`   URL: ${post.url || 'なし'}`);
      console.log(`   累計閲覧数: ${post.viewCount || 0}`);
      console.log(`   直近閲覧データ: ${post.recentViews ? 'あり' : 'なし'}`);
      console.log('');
    });
    
    // 3. 正規化処理確認
    console.log('🔄 正規化処理テスト:');
    const normalizedPosts = rawPosts.map(normalizePost).filter(post => post !== null);
    console.log(`- 正規化後投稿数: ${normalizedPosts.length}件`);
    
    // 4. 各投稿の正規化結果確認
    console.log('\n✅ 正規化後の投稿:');
    normalizedPosts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title || post.summary || 'タイトルなし'}`);
      console.log(`   recentViewCount: ${post.recentViewCount}`);
      
      // フロントエンド表示形式のテスト
      const displayText = `閲覧数: 累計 ${post.viewCount || 0} 回 ／ 直近3日間 ${post.recentViewCount !== undefined ? post.recentViewCount : 0} 回`;
      console.log(`   表示: ${displayText}`);
      console.log('');
    });
    
    // 5. ソート処理確認
    console.log('📊 ソート処理テスト:');
    
    // デフォルト：作成日時でソート（降順）
    const sortedByDate = [...normalizedPosts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    console.log('\n- 作成日時順（デフォルト）:');
    sortedByDate.forEach((post, index) => {
      console.log(`  ${index + 1}. ${post.title || post.summary || 'タイトルなし'} (${post.createdAt})`);
    });
    
    // 6. フィルタリング確認
    console.log('\n🔍 フィルタリング確認:');
    const validPosts = normalizedPosts.filter(post => 
      post.id && 
      post.createdAt && 
      (post.title || post.summary)
    );
    console.log(`- 有効な投稿数: ${validPosts.length}件`);
    
    if (validPosts.length !== normalizedPosts.length) {
      console.log('⚠️ 無効な投稿が検出されました:');
      normalizedPosts.forEach((post, index) => {
        if (!post.id || !post.createdAt || (!post.title && !post.summary)) {
          console.log(`  - 投稿${index + 1}: ID=${post.id}, 作成日=${post.createdAt}, タイトル=${post.title || post.summary || 'なし'}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ デバッグ中にエラー:', error);
  }
}

debugPostsDisplay();
