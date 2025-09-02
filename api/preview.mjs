import { kv } from '@vercel/kv';
import { fetchPreviewData } from './utils/kv-utils.mjs';

// Mock preview data for example.com URLs (used in development/fallback scenarios)
function getMockPreviewData(url) {
  const mockData = {
    'https://example.com/ai-trends': {
      title: 'AI技術の最新トレンド',
      description: 'AI技術の最新トレンドについて詳しく解説している記事です。',
      image: 'https://via.placeholder.com/600x315/6366f1/ffffff?text=AI+Trends',
      siteName: 'Example Tech Blog',
      url: url
    },
    'https://example.com/react-tips': {
      title: 'React開発のベストプラクティス',
      description: 'React開発で役立つ実践的なテクニック集です。',
      image: 'https://via.placeholder.com/600x315/06b6d4/ffffff?text=React+Tips',
      siteName: 'Example Tech Blog',
      url: url
    },
    'https://example.com/database-design': {
      title: 'データベース設計の基本',
      description: 'データベース設計の基本原則と実装のベストプラクティス。',
      image: 'https://via.placeholder.com/600x315/10b981/ffffff?text=Database+Design',
      siteName: 'Example Tech Blog',
      url: url
    }
  };
  
  return mockData[url] || {
    title: 'サンプル記事',
    description: 'これはモックデータのサンプル記事です。',
    image: 'https://via.placeholder.com/600x315/8b5cf6/ffffff?text=Sample+Article',
    siteName: 'Example Site',
    url: url
  };
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'GETメソッドのみ許可されています' });
  }

  const { url } = request.query;
  console.log('プレビューリクエスト受信:', url);

  if (!url || typeof url !== 'string') {
    console.log('無効なURL:', url);
    return response.status(400).json({ error: 'URLが指定されていません' });
  }

  // --- キャッシュロジック（KV認証情報がある場合のみ） ---
  const useCache = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
  const cacheKey = `preview:${url}`;

  if (useCache) {
    try {
      const cachedData = await kv.get(cacheKey);
      if (cachedData) {
        console.log('キャッシュからプレビューデータを返します:', url);
        return response.status(200).json(cachedData);
      }
    } catch (error) {
      console.error('Vercel KVからのキャッシュ取得に失敗:', error);
      // キャッシュエラーは処理を続行
    }
  }

  // Check if this is a mock URL (example.com)
  if (url.includes('example.com')) {
    console.log('モックURLを検出、モックデータを返します:', url);
    const mockPreviewData = getMockPreviewData(url);
    return response.status(200).json(mockPreviewData);
  }

  try {
    const previewData = await fetchPreviewData(url);

    // --- キャッシュに保存（KV認証情報がある場合のみ） ---
    if (useCache) {
      try {
        // キャッシュの有効期限を1時間（3600秒）に設定
        await kv.set(cacheKey, previewData, { ex: 3600 });
        console.log('プレビューデータをキャッシュに保存しました:', url);
      } catch (error) {
        console.error('Vercel KVへのキャッシュ保存に失敗:', error);
      }
    }

    // 4. JSON形式でプレビューデータを返す
    return response.status(200).json(previewData);

  } catch (error) {
    console.error(`プレビューの取得に失敗しました: ${url}`, error.message);
    return response.status(500).json({ error: error.message });
  }
}
