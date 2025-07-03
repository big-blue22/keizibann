// cleanup-test-posts.mjs - テスト投稿のクリーンアップ

import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');
const PUBLIC_POSTS_FILE = path.join(process.cwd(), 'public', 'data', 'posts.json');

async function cleanupTestPosts() {
  console.log('🧹 テスト投稿クリーンアップ開始\n');
  
  try {
    // データファイル読み込み
    const data = await fs.readFile(POSTS_FILE, 'utf-8');
    const posts = JSON.parse(data);
    
    console.log(`📊 処理前: ${posts.length}件の投稿`);
    
    // テスト投稿を除外（重複も排除）
    const seen = new Set();
    const cleanedPosts = posts.filter(post => {
      // テスト投稿は除外
      if (post.title?.includes('テスト') || post.id?.startsWith('test-')) {
        console.log(`🗑️ 削除: ${post.title || post.id}`);
        return false;
      }
      
      // 重複投稿の除外
      if (seen.has(post.id)) {
        console.log(`🔄 重複削除: ${post.id}`);
        return false;
      }
      seen.add(post.id);
      
      return true;
    });
    
    console.log(`📊 処理後: ${cleanedPosts.length}件の投稿`);
    
    // クリーンアップ後の投稿一覧表示
    console.log('\n📝 残った投稿:');
    cleanedPosts.forEach((post, index) => {
      const title = post.title || post.summary || 'タイトルなし';
      const date = new Date(post.createdAt).toLocaleDateString('ja-JP');
      console.log(`${index + 1}. ${title} (${date})`);
    });
    
    // メインファイルを更新
    await fs.writeFile(POSTS_FILE, JSON.stringify(cleanedPosts, null, 2));
    console.log('\n✅ メインデータファイルを更新しました');
    
    // 公開ディレクトリも同期
    await fs.writeFile(PUBLIC_POSTS_FILE, JSON.stringify(cleanedPosts, null, 2));
    console.log('✅ 公開ディレクトリも同期しました');
    
    console.log('\n🎉 クリーンアップ完了！');
    
  } catch (error) {
    console.error('❌ クリーンアップ中にエラー:', error);
  }
}

cleanupTestPosts();
