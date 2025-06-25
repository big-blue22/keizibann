// /api/gemini.js

// Vercelでは、この形式で関数をエクスポートします。
export default async function handler(request, response) {
  // フロントエンドからのリクエストはPOSTメソッドであると想定
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // APIキーをサーバーの環境変数から安全に取得
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ message: 'API key is not configured' });
  }

  try {
    // フロントエンドから送信された本文（例: { "prompt": "日本の首都は？" }）を取得
    const body = request.body;

    // Gemini APIのエンドポイントURL (text-onlyモデルの場合)
  const geminiResponse = await callGoogleApi({ model: 'gemini-2.5-flash-preview-04-17', contents: ... });

    // Gemini APIへリクエストを転送
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // フロントエンドから受け取ったリクエスト本文をそのままGeminiへ
      body: JSON.stringify(body),
    });

    if (!geminiResponse.ok) {
      // Gemini APIからエラーが返ってきた場合
      const errorText = await geminiResponse.text();
      console.error('Gemini API Error:', errorText);
      return response.status(geminiResponse.status).json({ message: 'Error from Gemini API', details: errorText });
    }

    // Gemini APIからのレスポンスをフロントエンドに返す
    const data = await geminiResponse.json();
    return response.status(200).json(data);

  } catch (error) {
    console.error('Internal Server Error:', error);
    return response.status(500).json({ message: 'Internal Server Error' });
  }
}
