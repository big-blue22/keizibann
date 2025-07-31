import axios from 'axios';
import * as cheerio from 'cheerio';

// ユーザーエージェントを設定して、ボットとして認識されにくくします
const AXIOS_OPTIONS = {
  headers: {
    "User-Agent": "MyCustomPreviewBot/1.0 (https://github.com/big-blue22/keizibann)",
  },
  timeout: 5000, // 5秒でタイムアウト
};

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

  // Check if this is a mock URL (example.com)
  if (url.includes('example.com')) {
    console.log('モックURLを検出、モックデータを返します:', url);
    const mockPreviewData = getMockPreviewData(url);
    return response.status(200).json(mockPreviewData);
  }

  try {
    // 1. 指定されたURLからHTMLを取得
    console.log('HTML取得開始:', url);
    const { data: html } = await axios.get(url, AXIOS_OPTIONS);
    console.log('HTML取得成功:', html.length, '文字');

    // 2. CheerioでHTMLを解析
    const $ = cheerio.load(html);

    // 3. OGPタグと他のフォールバック用タグから情報を抽出
    const getMetatag = (name) => $(`meta[property='${name}']`).attr('content') || $(`meta[name='${name}']`).attr('content');

    const previewData = {
      title: getMetatag('og:title') || $('title').text() || 'タイトルなし',
      description: getMetatag('og:description') || '説明なし',
      image: getMetatag('og:image'),
      siteName: getMetatag('og:site_name') || new URL(url).hostname,
      url: url // 元のURLも返す
    };

    // 画像URLが相対パスの場合、絶対パスに変換
    if (previewData.image && previewData.image.startsWith('/')) {
        const siteUrl = new URL(url);
        previewData.image = `${siteUrl.protocol}//${siteUrl.hostname}${previewData.image}`;
    }

    console.log('プレビューデータ生成完了:', previewData);

    // 4. JSON形式でプレビューデータを返す
    return response.status(200).json(previewData);

  } catch (error) {
    console.error(`プレビューの取得に失敗しました: ${url}`, error.message);
    // エラーの種類に応じて、より具体的なメッセージを返すことも可能です
    let errorMessage = 'プレビューを生成できませんでした。';
    if (error.code === 'ECONNABORTED') {
        errorMessage = 'ページの読み込みがタイムアウトしました。';
    } else if (error.response) {
        errorMessage = `サイトからエラーが返されました (ステータス: ${error.response.status})。`;
    }
    return response.status(500).json({ error: errorMessage });
  }
}
