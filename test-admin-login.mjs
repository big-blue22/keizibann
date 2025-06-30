// 管理者ログイン機能のテスト
// curl コマンドでテスト

console.log('管理者ログイン機能のテスト');

// テストケース1: 正しいパスワード
async function testCorrectPassword() {
  console.log('\n=== 正しいパスワードでのテスト ===');
  try {
    const response = await fetch('http://localhost:3000/api/admin-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: '0622' })
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.text();
    console.log('Response:', data);
    
    if (response.ok) {
      const jsonData = JSON.parse(data);
      console.log('Success! Token received:', !!jsonData.token);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// テストケース2: 間違ったパスワード
async function testWrongPassword() {
  console.log('\n=== 間違ったパスワードでのテスト ===');
  try {
    const response = await fetch('http://localhost:3000/api/admin-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: 'wrong' })
    });
    
    console.log('Status:', response.status);
    const data = await response.text();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// curlコマンドでのテスト例も出力
console.log('\n=== curlコマンドでのテスト例 ===');
console.log('正しいパスワード:');
console.log('curl -X POST http://localhost:3000/api/admin-login -H "Content-Type: application/json" -d \'{"password":"0622"}\'');

console.log('\n間違ったパスワード:');
console.log('curl -X POST http://localhost:3000/api/admin-login -H "Content-Type: application/json" -d \'{"password":"wrong"}\'');

// 実際にサーバーが動いている場合のテスト実行
if (typeof window === 'undefined') {
  // Node.js環境でのテスト
  (async () => {
    try {
      await testCorrectPassword();
      await testWrongPassword();
    } catch (error) {
      console.log('Server not running or fetch not available:', error.message);
    }
  })();
}
