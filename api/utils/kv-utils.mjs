// api/utils/kv-utils.mjs - Shared KV utilities

// Vercel KVが利用可能かチェック（URLの形式も検証）
export function isKvAvailable() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  
  // 環境変数が存在しない場合
  if (!url || !token) {
    return false;
  }
  
  // URLが有効なHTTPS形式かチェック
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' && url.includes('vercel-storage.com');
  } catch (error) {
    console.log('❌ Invalid KV URL format:', url);
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