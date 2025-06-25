// /api/gemini.mjs

export default async function handler(request, response) {
  // この関数はPOSTリクエストのみを受け付けます
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // Vercelの環境変数からAPIキーを安全に取得します
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ message: 'API key is not configured' });
  }

  try {
    // フロントエンドから送信されたリクエストの本文を取得します
    const body = request.body;

    // 正しいモデル名を含む、Google Gemini APIのエンドポイントURL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${apiKey}`;

    // GoogleのAPIにリクエストを転送します
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // フロントエンドから受け取った本文をそのままGoogleに送ります
      body: JSON.stringify(body),
    });

    // Google APIからのレスポンスがエラーだった場合の処理
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API Error:', errorText);
      return response.status(geminiResponse.status).json({ message: 'Error from Gemini API', details: errorText });
    }

    // Google APIからの成功レスポンスを、そのままフロントエンドに返します
    const data = await geminiResponse.json();
    return response.status(200).json(data);

  } catch (error) {
    // 予期せぬエラーが起きた場合の処理
    console.error('Internal Server Error:', error);
    return response.status(500).json({ message: 'Internal Server Error' });
  }
}
