import axios from 'axios';
import * as cheerio from 'cheerio';

// ユーザーエージェントを設定して、ボットとして認識されにくくします
const AXIOS_OPTIONS = {
  headers: {
    "User-Agent": "MyCustomPreviewBot/1.0 (https://github.com/big-blue22/keizibann)",
  },
  timeout: 5000, // 5秒でタイムアウト
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'GETメソッドのみ許可されています' });
  }

  const { url, only } = request.query;
  console.log('プレビューリクエスト受信:', url, 'only:', only);

  if (!url || typeof url !== 'string') {
    console.log('無効なURL:', url);
    return response.status(400).json({ error: 'URLが指定されていません' });
  }

  try {
    // 1. 指定されたURLからHTMLを取得
    console.log('HTML取得開始:', url);
    const { data: html } = await axios.get(url, AXIOS_OPTIONS);
    console.log('HTML取得成功:', html.length, '文字');

    // 2. CheerioでHTMLを解析
    const $ = cheerio.load(html);

    // "only=title" クエリがある場合は、タイトルのみを返却
    if (only === 'title') {
      const title = $('title').first().text() || getMetatag('og:title') || 'タイトルなし';
      console.log('タイトルのみを返却:', title);
      return response.status(200).json({ title: title });
    }

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
