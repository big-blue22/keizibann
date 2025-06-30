// test-security-improvements.mjs
import adminLoginHandler from './api/admin-login.mjs';

const createMockRequest = (password, ip = '127.0.0.1') => ({
  method: 'POST',
  body: { password },
  headers: {
    'x-forwarded-for': ip
  },
  connection: { remoteAddress: ip }
});

const createMockResponse = () => {
  let result = { headers: {} };
  return {
    setHeader: function(name, value) {
      result.headers[name] = value;
    },
    status: function(code) {
      result.statusCode = code;
      return this;
    },
    json: function(data) {
      result.data = data;
      return this;
    },
    getResult: () => result
  };
};

console.log('🔒 セキュリティ改善のテスト開始');
console.log('=====================================');

// テスト1: 正常なログイン
console.log('\n1. 正常なログイン');
const normalResponse = createMockResponse();
await adminLoginHandler(createMockRequest('0622'), normalResponse);
const normalResult = normalResponse.getResult();
console.log(`結果: ${normalResult.statusCode} - ${normalResult.data?.success ? 'Success' : 'Failed'}`);

// テスト2: 複数回の失敗ログイン（レート制限テスト）
console.log('\n2. レート制限テスト（同一IP）');
const testIP = '192.168.1.100';

for (let i = 1; i <= 7; i++) {
  console.log(`\n試行 ${i}:`);
  const response = createMockResponse();
  await adminLoginHandler(createMockRequest('wrong-password', testIP), response);
  const result = response.getResult();
  
  if (result.statusCode === 429) {
    console.log('✅ レート制限が適用されました');
    break;
  } else {
    console.log(`失敗ログイン - 残り試行回数: ${result.data?.remainingAttempts || 'N/A'}`);
  }
}

// テスト3: 空白文字のトリミング
console.log('\n3. 空白文字トリミングテスト');
const trimTests = [' 0622 ', '0622\n', '\t0622\t'];
for (const testPassword of trimTests) {
  const response = createMockResponse();
  await adminLoginHandler(createMockRequest(testPassword), response);
  const result = response.getResult();
  console.log(`"${testPassword}" -> ${result.statusCode === 200 ? '✅ Success' : '❌ Failed'}`);
}

console.log('\n🏁 セキュリティテスト完了');
