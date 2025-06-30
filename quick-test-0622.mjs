// quick-test-0622.mjs
import adminLoginHandler from './api/admin-login.mjs';

const createMockResponse = () => {
  let result = {};
  return {
    status: function(code) {
      result.statusCode = code;
      return this;
    },
    json: function(data) {
      result.data = data;
      console.log(`Response ${result.statusCode}:`, JSON.stringify(data, null, 2));
      return this;
    }
  };
};

console.log('🧪 パスワード 0622 のテスト');

const testPasswords = ['0622', ' 0622 ', '0622\n', 'admin123', ''];

for (const password of testPasswords) {
  console.log(`\n=== テスト: "${password}" ===`);
  
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
