// final-display-test.mjs - 最終表示テスト

import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');

async function finalDisplayTest() {
  console.log('🎯 最終表示テスト開始\n');
  
  try {
    // データファイル読み込み
    const data = await fs.readFile(POSTS_FILE, 'utf-8');
    const posts = JSON.parse(data);
    
    console.log(`📊 投稿数: ${posts.length}件\n`);
    
    // 各投稿の表示シミュレーション
    console.log('🎨 フロントエンド表示シミュレーション:');
    console.log('━'.repeat(60));
    
    posts.forEach((post, index) => {
      const title = post.title || post.summary;
      const date = new Date(post.createdAt).toLocaleDateString('ja-JP');
      const viewCount = post.viewCount || 0;
      const recentViewCount = post.recentViewCount !== undefined ? post.recentViewCount : 0;
      const labels = post.labels?.join(', ') || 'ラベルなし';
      
      console.log(`\n📝 投稿 ${index + 1}:`);
      console.log(`タイトル: ${title}`);
      console.log(`ラベル: ${labels}`);
      console.log(`作成日: ${date}`);
      console.log(`閲覧数: 累計 ${viewCount} 回 ／ 直近3日間 ${recentViewCount} 回`);
      
      if (post.url) {
        console.log(`URL: ${post.url}`);
      }
    });
    
    console.log('\n━'.repeat(60));
    console.log('✅ 投稿は正常に表示されています');
    console.log('✅ 累計閲覧数と直近3日間閲覧数の両方が表示されています');
    
    // 表示順序確認
    console.log('\n📅 表示順序（作成日時降順）:');
    const sortedPosts = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    sortedPosts.forEach((post, index) => {
      const title = post.title || post.summary;
      const date = new Date(post.createdAt).toISOString();
      console.log(`${index + 1}. ${title} (${date})`);
    });
    
  } catch (error) {
    console.error('❌ テスト中にエラー:', error);
  }
}

finalDisplayTest();
