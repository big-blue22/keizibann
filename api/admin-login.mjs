// /api/admin-login.mjs
import jwt from 'jsonwebtoken';

const ADMIN_PASSWORD = '0622'; // あなたのパスワード
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { password } = request.body;
    
    console.log('Admin login attempt');
    console.log('JWT_SECRET available:', !!JWT_SECRET);
    console.log('Password provided:', !!password);

    if (!password) {
      return response.status(400).json({ message: 'パスワードが指定されていません。' });
    }

    if (password === ADMIN_PASSWORD) {
      // パスワードが正しい場合、管理者権限を持つトークンを生成
      console.log('Password correct, generating token');
      const token = jwt.sign(
        { isAdmin: true }, // トークンに含める情報
        JWT_SECRET,        // 秘密鍵
        { expiresIn: '3h' } // 有効期限 (例: 3時間)
      );
      console.log('Token generated successfully');
      return response.status(200).json({ success: true, token });
    } else {
      // パスワードが間違っている場合
      console.log('Incorrect password provided');
      return response.status(401).json({ message: 'パスワードが正しくありません。' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    return response.status(500).json({ message: 'ログイン処理中にエラーが発生しました。', error: error.message });
  }
}
