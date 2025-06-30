// test-login-direct.mjs
// APIファイルを直接テスト

import adminLoginHandler from './api/admin-login.mjs';

// モックのrequest/responseオブジェクトを作成
const createMockResponse = () => {
  const response = {
    statusCode: 200,
    headers: {},
    body: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.body = data;
      console.log(`Response ${this.statusCode}:`, JSON.stringify(data, null, 2));
      return this;
    }
  };
  return response;
};

const testPasswords = [
  'admin123',
  'Admin123', 
  'admin 123',
  'admin123 ',
  ' admin123',
  'wrong-password',
  '',
  undefined
];

console.log('🧪 管理者ログインAPI直接テスト開始');
console.log('');

for (const password of testPasswords) {
  console.log(`\n=== テスト: パスワード "${password}" (長さ: ${password ? password.length : 'N/A'}) ===`);
  
  const mockRequest = {
    method: 'POST',
    body: { password }
  };
  
  const mockResponse = createMockResponse();
  
  try {
    await adminLoginHandler(mockRequest, mockResponse);
  } catch (error) {
    console.error('エラー:', error);
  }
}
