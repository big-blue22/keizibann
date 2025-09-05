// api/utils/kv-utils.mjs - Shared KV utilities

// Vercel KVが利用可能かチェック（URLの形式も検証）
export function isKvAvailable() {
  const url = process.env.KV_REST_API_URL || process.env.KV_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.KV_TOKEN;
  
  console.log('KV環境変数チェック:', {
    'KV_REST_API_URL': !!process.env.KV_REST_API_URL,
    'KV_URL': !!process.env.KV_URL,
    'KV_REST_API_TOKEN': !!process.env.KV_REST_API_TOKEN,
    'KV_TOKEN': !!process.env.KV_TOKEN,
    'VERCEL': !!process.env.VERCEL,
    'NODE_ENV': process.env.NODE_ENV
  });
  
  // 環境変数が存在しない場合
  if (!url || !token) {
    console.log('❌ KV環境変数が不足:', { url: !!url, token: !!token });
    return false;
  }
  
  // URLが有効なHTTPS形式かチェック
  try {
    const parsedUrl = new URL(url);
    const isValidKv = parsedUrl.protocol === 'https:' && 
                     (url.includes('vercel-storage.com') || url.includes('upstash'));
    
    console.log('KV URL検証:', { url, isValid: isValidKv });
    return isValidKv;
  } catch (error) {
    console.log('❌ Invalid KV URL format:', url, error.message);
    return false;
  }
}

// KV操作のエラーハンドリング付きラッパー
export async function safeKvOperation(operation, fallbackValue = null) {
  try {
    return await operation();
  } catch (error) {
    console.error('❌ KV operation failed:', error.message);
    return fallbackValue;
  }
}