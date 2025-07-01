// 既存の投稿データにcommentCountフィールドを追加するスクリプト

import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');

async function updatePostsWithCommentCount() {
  try {
    // 既存の投稿データを読み込み
    const data = await fs.readFile(POSTS_FILE, 'utf-8');
    const posts = JSON.parse(data);

    // 各投稿にcommentCountフィールドを追加（既に存在する場合は変更しない）
    const updatedPosts = posts.map(post => ({
      ...post,
      commentCount: post.commentCount !== undefined ? post.commentCount : 0
    }));

    // 更新されたデータを保存
    await fs.writeFile(POSTS_FILE, JSON.stringify(updatedPosts, null, 2));
    
    console.log('投稿データにcommentCountフィールドを追加しました。');
    console.log(`更新された投稿数: ${updatedPosts.length}`);
    
    // 更新結果を確認
    updatedPosts.forEach(post => {
      console.log(`- ${post.id}: commentCount = ${post.commentCount}`);
    });

  } catch (error) {
    console.error('データ更新エラー:', error);
  }
}

updatePostsWithCommentCount();
