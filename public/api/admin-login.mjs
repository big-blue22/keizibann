// /api/admin-login.mjs
import jwt from 'jsonwebtoken';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '0622'; // 環境変数から取得
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production';

// ログイン試行回数を記録（本番では Redis などを使用すべき）
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15分

function getClientIP(request) {
  return request.headers['x-forwarded-for'] || 
         request.headers['x-real-ip'] || 
         request.connection?.remoteAddress || 
         'unknown';
}

function isLockedOut(ip) {
  const attempts = loginAttempts.get(ip);
  if (!attempts) return false;
  
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
    if (timeSinceLastAttempt < LOCKOUT_TIME) {
      return true;
    } else {
      // ロックアウト期間が過ぎたらリセット
      loginAttempts.delete(ip);
      return false;
    }
  }
  return false;
}

function recordFailedAttempt(ip) {
  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  attempts.count++;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(ip, attempts);
}

function clearFailedAttempts(ip) {
  loginAttempts.delete(ip);
}

export default async function handler(request, response) {
  // CORS ヘッダーを設定
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const clientIP = getClientIP(request);
  
  // レート制限チェック
  if (isLockedOut(clientIP)) {
    console.log(`Login attempt blocked - IP locked out: ${clientIP}`);
    return response.status(429).json({ 
      message: 'ログイン試行回数が上限に達しました。しばらくしてからもう一度お試しください。',
      retryAfter: 15 * 60 // 15分
    });
  }

  try {
    const { password } = request.body;
    
    // パスワードの前後の空白を削除
    const trimmedPassword = password ? password.trim() : '';
    
    console.log('Admin login attempt from IP:', clientIP);
    console.log('Password provided:', !!password);

    if (!trimmedPassword) {
      console.log('No password provided');
      recordFailedAttempt(clientIP);
      return response.status(400).json({ message: 'パスワードが指定されていません。' });
    }

    // 意図的な遅延を追加（タイミング攻撃を防ぐ）
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (trimmedPassword === ADMIN_PASSWORD) {
      // パスワードが正しい場合、管理者権限を持つトークンを生成
      console.log('Password correct, generating token');
      clearFailedAttempts(clientIP);
      
      const token = jwt.sign(
        { 
          isAdmin: true, 
          ip: clientIP,
          iat: Math.floor(Date.now() / 1000)
        }, // トークンに含める情報
        JWT_SECRET,        // 秘密鍵
        { expiresIn: '1h' } // 有効期限を3時間から1時間に短縮
      );
      console.log('Token generated successfully for IP:', clientIP);
      return response.status(200).json({ success: true, token });
    } else {
      // パスワードが間違っている場合
      console.log('Incorrect password provided from IP:', clientIP);
      recordFailedAttempt(clientIP);
      
      const attempts = loginAttempts.get(clientIP);
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - (attempts?.count || 0);
      
      return response.status(401).json({ 
        message: 'パスワードが正しくありません。',
        remainingAttempts: Math.max(0, remainingAttempts)
      });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    return response.status(500).json({ message: 'ログイン処理中にエラーが発生しました。', error: error.message });
  }
}
