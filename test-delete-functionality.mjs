// test-delete-functionality.mjs
// このスクリプトは削除機能のテスト手順を表示します

console.log('🧪 投稿・コメント削除機能のテスト手順');
console.log('');
console.log('1. まず開発サーバーを起動してください:');
console.log('   npx vercel dev');
console.log('');
console.log('2. ブラウザで http://localhost:3000 を開く');
console.log('');
console.log('3. 管理者ログインのテスト:');
console.log('   - 右上の「管理者ログイン」をクリック');
console.log('   - パスワード: admin123');
console.log('   - ログイン成功後、「管理者モード」が表示される');
console.log('');
console.log('4. テスト投稿の作成:');
console.log('   - 新しい投稿を作成');
console.log('   - URL: https://example.com/test');
console.log('   - 要約: テスト投稿');
console.log('');
console.log('5. 投稿削除のテスト:');
console.log('   - 管理者モードで投稿カードの右上に「削除」ボタンが表示される');
console.log('   - 削除ボタンをクリックして削除を実行');
console.log('');
console.log('6. コメント削除のテスト:');
console.log('   - 投稿にコメントを追加');
console.log('   - 管理者モードでコメント右上に「削除」ボタンが表示される');
console.log('   - 削除ボタンをクリックして削除を実行');
console.log('');
console.log('❗ 問題が発生する場合:');
console.log('   - ブラウザの開発者ツール(F12)でコンソールエラーを確認');
console.log('   - ネットワークタブで API レスポンスを確認');
console.log('   - サーバーのターミナルでサーバーサイドログを確認');
console.log('');
console.log('✅ 期待される動作:');
console.log('   - 管理者ログイン後、削除ボタンが表示される');
console.log('   - 削除ボタンクリック後、投稿/コメントが即座に削除される');
console.log('   - エラーメッセージが表示されない');
