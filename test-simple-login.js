// test-simple-login.js
// Node.js の http モジュールを使ってテスト

const http = require('http');

const testLogin = (password) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ password });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin-login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
};

// テスト実行
async function runTest() {
  console.log('🧪 管理者ログインAPIのテスト開始');
  console.log('');
  
  const testCases = [
    'admin123',
    'Admin123',
    'admin 123',
    'admin123 ',
    ' admin123',
    'wrong-password'
  ];
  
  for (const password of testCases) {
    try {
      console.log(`テスト: パスワード "${password}" (長さ: ${password.length})`);
      const result = await testLogin(password);
      console.log(`結果: ${result.status} - ${JSON.stringify(result.data)}`);
      console.log('');
    } catch (error) {
      console.log(`エラー: ${error.message}`);
      console.log('');
    }
  }
}

runTest();
