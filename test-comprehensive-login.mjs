// test-comprehensive-login.mjs
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
      console.log(`✅ Response ${result.statusCode}:`, JSON.stringify(data, null, 2));
      return this;
    },
    getResult: () => result
  };
};

const testCases = [
  { password: 'admin123', expected: 'success', description: '正しいパスワード' },
  { password: ' admin123 ', expected: 'success', description: '前後に空白があるパスワード' },
  { password: 'admin123\n', expected: 'success', description: '改行文字があるパスワード' },
  { password: 'admin123\t', expected: 'success', description: 'タブ文字があるパスワード' },
  { password: 'Admin123', expected: 'error', description: '大文字小文字が違うパスワード' },
  { password: 'admin 123', expected: 'error', description: '中に空白があるパスワード' },
  { password: 'admin1234', expected: 'error', description: '文字数が違うパスワード' },
  { password: '', expected: 'error', description: '空のパスワード' },
  { password: '   ', expected: 'error', description: '空白のみのパスワード' },
  { password: undefined, expected: 'error', description: 'undefinedパスワード' },
  { password: null, expected: 'error', description: 'nullパスワード' }
];

console.log('🧪 包括的な管理者ログインテスト開始');
console.log('=====================================');

for (const testCase of testCases) {
  console.log(`\n🔍 テスト: ${testCase.description}`);
  console.log(`入力: "${testCase.password}" (type: ${typeof testCase.password})`);
  
  const mockRequest = {
    method: 'POST',
    body: { password: testCase.password }
  };
  
  const mockResponse = createMockResponse();
  
  try {
    await adminLoginHandler(mockRequest, mockResponse);
    const result = mockResponse.getResult();
    
    const actualResult = result.statusCode === 200 ? 'success' : 'error';
    const isExpected = actualResult === testCase.expected;
    
    console.log(`期待: ${testCase.expected}, 実際: ${actualResult} ${isExpected ? '✅' : '❌'}`);
    
    if (!isExpected) {
      console.log('❌ 予期しない結果!');
    }
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
  }
}

console.log('\n🏁 テスト完了');
