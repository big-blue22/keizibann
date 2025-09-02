import { kv } from '@vercel/kv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { lookup } from 'dns/promises';
import ipaddr from 'ipaddr.js';

// ユーザーエージェントを設定して、ボットとして認識されにくくします
const AXIOS_OPTIONS = {
  headers: {
    "User-Agent": "MyCustomPreviewBot/1.0 (https://github.com/big-blue22/keizibann)",
  },
  timeout: 5000, // 5秒でタイムアウト
};

// SSRF攻撃を防ぐためのURL検証関数
async function isSafeUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);

    // 1. プロトコルがhttpまたはhttpsであることを確認
    if (protocol !== 'http:' && protocol !== 'https:') {
      console.warn(`[SSRF] 不正なプロトコル: ${protocol}`);
      return false;
    }

    // 2. ホスト名をIPアドレスに解決
    const { address } = await lookup(hostname);

    // 3. IPアドレスがグローバルユニキャストであることを確認
    const ip = ipaddr.parse(address);
    const range = ip.range();

    if (range !== 'unicast') {
      console.warn(`[SSRF] プライベートIP範囲へのアクセス試行: ${hostname} (${address})`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[SSRF] URL検証中にエラーが発生: ${error.message}`);
    return false;
  }
}

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

  // SSRF対策：URLの安全性を検証
  if (!(await isSafeUrl(url))) {
    console.log(`[SSRF] 安全でないURLのためリクエストをブロック: ${url}`);
    return response.status(400).json({ error: '無効または安全でないURLが指定されました。' });
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

    const description = (getMetatag('twitter:description') || getMetatag('og:description') || '説明なし').substring(0, 200);

    const previewData = {
      title: getMetatag('og:title') || $('title').text() || 'タイトルなし',
      description: description,
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
