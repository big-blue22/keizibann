#!/usr/bin/env node
// test-final-verification.mjs - 最終動作確認テスト

import fs from 'fs';
import path from 'path';

console.log('🚀 最終動作確認テスト開始');
console.log('================================');

// 1. 必要なファイルの存在確認
console.log('\n📁 ファイル構造確認:');
const requiredFiles = [
  'index.html',
  'public/index.html', 
  'public/dist/output.css',
  'public/data/posts.json',
  'api/admin-login.mjs',
  'api/create-post.mjs',
  'api/delete-post.mjs',
  'api/get-posts.mjs',
  'api/increment-view-count.mjs',
  'api/preview.mjs',
  'vercel.json',
  'package.json'
];

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 見つかりません`);
  }
}

// 2. package.json の build スクリプト確認
console.log('\n📦 package.json buildスクリプト確認:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.scripts && packageJson.scripts.build) {
    console.log(`✅ buildスクリプト: ${packageJson.scripts.build}`);
  } else {
    console.log('❌ buildスクリプトが見つかりません');
  }
} catch (err) {
  console.log('❌ package.json読み取りエラー:', err.message);
}

// 3. vercel.json 設定確認
console.log('\n⚙️ vercel.json設定確認:');
try {
  const vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  console.log(`✅ outputDirectory: ${vercelJson.outputDirectory || '未設定'}`);
  console.log(`✅ API関数数: ${vercelJson.functions ? Object.keys(vercelJson.functions).length : 0}`);
} catch (err) {
  console.log('❌ vercel.json読み取りエラー:', err.message);
}

// 4. CSS ファイルサイズ確認
console.log('\n🎨 CSS ファイル確認:');
try {
  const cssPath = 'public/dist/output.css';
  const stats = fs.statSync(cssPath);
  console.log(`✅ ${cssPath}: ${Math.round(stats.size / 1024)}KB`);
} catch (err) {
  console.log('❌ CSS ファイル確認エラー:', err.message);
}

// 5. index.html の autoComplete 設定確認
console.log('\n🔐 autoComplete設定確認:');
try {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  if (indexHtml.includes('autoComplete: "off"')) {
    console.log('✅ フォーム全体のautoComplete="off"が設定済み');
  } else {
    console.log('❌ フォーム全体のautoComplete設定が見つからない');
  }
  
  if (indexHtml.includes('autocomplete="off"')) {
    console.log('✅ URL入力欄のautocomplete="off"が設定済み');
  } else {
    console.log('❌ URL入力欄のautocomplete設定が見つからない');
  }
} catch (err) {
  console.log('❌ index.html確認エラー:', err.message);
}

// 6. 環境変数の確認（.env.local）
console.log('\n🔑 環境変数ファイル確認:');
const envFiles = ['.env.local', '.env.production'];
for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    console.log(`✅ ${envFile} 存在`);
  } else {
    console.log(`⚠️ ${envFile} 未作成（Vercel環境変数で設定予定）`);
  }
}

console.log('\n✨ 最終動作確認テスト完了');
console.log('\n📋 デプロイ前チェックリスト:');
console.log('□ Vercel環境変数設定 (GEMINI_API_KEY, ADMIN_PASSWORD, JWT_SECRET)');
console.log('□ KV環境変数設定 (KV_REST_API_URL, KV_REST_API_TOKEN)');
console.log('□ 本番デプロイテスト');
console.log('□ 管理者ログイン機能テスト');
console.log('□ 投稿・削除機能テスト');
console.log('□ URL履歴非表示テスト');
