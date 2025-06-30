// test-deployment.mjs
// デプロイメント準備状況のテスト

import fs from 'fs/promises';
import path from 'path';

console.log('🚀 Vercelデプロイメント準備状況チェック');
console.log('');

// 1. 必要なファイルの存在確認
const requiredFiles = [
  'index.html',
  'vercel.json', 
  'package.json',
  'public/dist/output.css',
  'public/data/posts.json'
];

console.log('📁 必要ファイルの確認:');
for (const file of requiredFiles) {
  try {
    await fs.access(file);
    console.log(`✅ ${file} - 存在`);
  } catch {
    console.log(`❌ ${file} - 見つかりません`);
  }
}

// 2. APIファイルの確認
console.log('\n🔌 APIエンドポイントの確認:');
const apiDir = 'api';
try {
  const files = await fs.readdir(apiDir);
  const mjsFiles = files.filter(f => f.endsWith('.mjs'));
  console.log(`✅ ${mjsFiles.length}個のAPIファイル見つかりました:`);
  mjsFiles.forEach(file => console.log(`   - ${file}`));
} catch (error) {
  console.log(`❌ APIディレクトリエラー: ${error.message}`);
}

// 3. 設定ファイルの確認
console.log('\n⚙️ 設定ファイルの確認:');
try {
  const vercelConfig = JSON.parse(await fs.readFile('vercel.json', 'utf-8'));
  console.log(`✅ vercel.json - ${Object.keys(vercelConfig.functions || {}).length}個の関数定義`);
  
  const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
  console.log(`✅ package.json - buildスクリプト: ${packageJson.scripts?.build ? '有' : '無'}`);
  
} catch (error) {
  console.log(`❌ 設定ファイルエラー: ${error.message}`);
}

console.log('\n💡 デプロイ手順:');
console.log('1. vercel コマンドでデプロイ実行');
console.log('2. または GitHub連携でプッシュ時自動デプロイ');
console.log('3. 環境変数の設定（GEMINI_API_KEY, JWT_SECRET等）');
console.log('');
console.log('🎯 期待される結果:');
console.log('- ビルドエラーなし');
console.log('- 静的ファイル正常配信');
console.log('- API関数正常動作');
