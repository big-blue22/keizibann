import { kv } from '@vercel/kv';
import { isKvAvailable } from '../api/utils/kv-utils.mjs';
import { generatePreviewData } from '../api/utils/preview-utils.mjs';
import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');

// --- Data Loading ---
async function getAllPosts() {
  if (isKvAvailable()) {
    console.log('Vercel KVから投稿を読み込んでいます...');
    const postsJson = await kv.lrange('posts', 0, -1);
    // KVからのデータはJSON文字列なのでパースが必要
    return postsJson.map(p => JSON.parse(p));
  } else {
    console.log('ローカルのJSONファイルから投稿を読み込んでいます...');
    try {
      const data = await fs.readFile(POSTS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // ファイルがない場合は空配列
      }
      throw error;
    }
  }
}

// --- Data Saving ---
async function saveAllPosts(posts) {
  if (isKvAvailable()) {
    console.log('Vercel KVに投稿を保存しています...');
    // KVではリストを一度クリアして、更新されたリストを再プッシュするのが一般的
    const pipeline = kv.pipeline();
    pipeline.del('posts');
    for (const post of posts) {
      // 保存する前に再度JSON文字列に変換
      pipeline.lpush('posts', JSON.stringify(post));
    }
    await pipeline.exec();
  } else {
    console.log('ローカルのJSONファイルに投稿を保存しています...');
    const dataDir = path.dirname(POSTS_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2));
  }
}


// --- Main Script Logic ---
async function main() {
  console.log('🚀 プレビューデータ移行スクリプトを開始します...');

  const allPosts = await getAllPosts();
  if (allPosts.length === 0) {
    console.log('投稿が見つかりませんでした。処理を終了します。');
    return;
  }

  console.log(`取得した投稿数: ${allPosts.length}件`);

  let updatedCount = 0;
  const updatedPosts = [];

  for (const post of allPosts) {
    // `previewData`フィールドが存在しない、またはnullの場合に処理
    if (post.previewData === undefined || post.previewData === null) {
      console.log(`\n📝 投稿ID: ${post.id} のプレビューを生成します...`);
      console.log(`   URL: ${post.url}`);
      try {
        const previewData = await generatePreviewData(post.url);
        post.previewData = previewData;
        console.log(`   ✅ プレビュー生成成功: ${previewData.title}`);
        updatedCount++;
      } catch (error) {
        console.error(`   ❌ プレビュー生成失敗: ${error.message}`);
        // 失敗した場合は post.previewData は変更されない
      }
    } else {
      console.log(`\n⏭️ 投稿ID: ${post.id} は既にプレビューデータを持っています。スキップします。`);
    }
    updatedPosts.push(post);
  }

  if (updatedCount > 0) {
    console.log(`\n💾 ${updatedCount}件の投稿を更新しました。データベースに保存しています...`);
    // 投稿は新しい順に保存されるべきなので、createdAtでソートし直す
    updatedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    await saveAllPosts(updatedPosts);
    console.log('✅ 保存が完了しました。');
  } else {
    console.log('\n✨ 更新する投稿はありませんでした。');
  }

  console.log('🎉 移行スクリプトが正常に完了しました。');
}

main().catch(error => {
  console.error('\n🚨 スクリプトの実行中に致命的なエラーが発生しました:', error);
  process.exit(1);
});
