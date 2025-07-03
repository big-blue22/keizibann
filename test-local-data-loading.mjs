// test-local-data-loading.mjs - ローカルデータ読み込みテスト

import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');
const PUBLIC_POSTS_FILE = path.join(process.cwd(), 'public', 'data', 'posts.json');

async function testLocalDataLoading() {
  console.log('📁 ローカルデータ読み込みテスト開始\n');
  
  try {
    // 1. メインのデータファイル確認
    console.log('🔍 メインデータファイル確認:');
    const mainData = await fs.readFile(POSTS_FILE, 'utf-8');
    const mainPosts = JSON.parse(mainData);
    console.log(`- ${POSTS_FILE}: ${mainPosts.length}件の投稿`);
    
    // 2. 公開ディレクトリのデータファイル確認
    console.log('\n🌐 公開ディレクトリのデータファイル確認:');
    try {
      const publicData = await fs.readFile(PUBLIC_POSTS_FILE, 'utf-8');
      const publicPosts = JSON.parse(publicData);
      console.log(`- ${PUBLIC_POSTS_FILE}: ${publicPosts.length}件の投稿`);
      
      // データの同期確認
      if (mainPosts.length === publicPosts.length) {
        console.log('✅ メインとpublicのデータ件数が一致');
      } else {
        console.log('⚠️ メインとpublicのデータ件数が異なります');
        console.log('📋 同期が必要です');
      }
    } catch (error) {
      console.log('❌ 公開ディレクトリのデータファイルが見つかりません');
      console.log('📋 同期が必要です');
    }
    
    // 3. フロントエンド正規化処理のシミュレーション
    console.log('\n🔄 フロントエンド正規化処理シミュレーション:');
    
    const normalizedPosts = mainPosts.map(post => {
      if (!post) return null;
      
      // recentViewCountが未計算の場合は計算
      if (post.recentViewCount === undefined && post.recentViews) {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const cutoffDate = threeDaysAgo.toISOString().split('T')[0];
        
        let totalCount = 0;
        Object.entries(post.recentViews).forEach(([date, count]) => {
          if (date >= cutoffDate) {
            totalCount += count;
          }
        });
        post.recentViewCount = totalCount;
      }
      
      return post;
    }).filter(post => post !== null);
    
    // 作成日時でソート（降順）
    normalizedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log(`- 正規化後: ${normalizedPosts.length}件の投稿`);
    
    // 4. ソート結果確認
    console.log('\n📊 ソート結果（最新順）:');
    normalizedPosts.forEach((post, index) => {
      const title = post.title || post.summary || 'タイトルなし';
      const date = new Date(post.createdAt).toLocaleDateString('ja-JP');
      const viewCount = post.viewCount || 0;
      const recentViewCount = post.recentViewCount !== undefined ? post.recentViewCount : 0;
      
      console.log(`${index + 1}. ${title}`);
      console.log(`   作成日: ${date}`);
      console.log(`   閲覧数: 累計 ${viewCount} 回 ／ 直近3日間 ${recentViewCount} 回`);
      console.log('');
    });
    
    // 5. publicディレクトリの同期
    console.log('🔄 publicディレクトリの同期実行:');
    await fs.writeFile(PUBLIC_POSTS_FILE, JSON.stringify(mainPosts, null, 2));
    console.log('✅ publicディレクトリのデータを更新しました');
    
  } catch (error) {
    console.error('❌ テスト中にエラー:', error);
  }
}

testLocalDataLoading();
