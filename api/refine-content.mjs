// /api/refine-content.mjs
import { GoogleGenerativeAI } from '@google/generative-ai';

// この関数は、フロントエンドから 'text' を受け取り、推敲した結果を返します
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { originalContent } = request.body;
    if (!originalContent) {
      return response.status(400).json({ message: '推敲する内容がありません。' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return response.status(500).json({ message: 'APIキーが設定されていません。' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // 最新モデル名を使用

    const prompt = `あなたはプロの編集者です。以下の日本語のテキストを、主要な意味を保持しつつ、簡潔で分かりやすい文章に推敲してください。マークダウン等は不要で、テキストのみ返してください。\n\n原文：\n---\n${originalContent}\n---\n\n推敲後の内容：`;

    const result = await model.generateContent(prompt);
    const refinedText = await result.response.text();

    return response.status(200).json({ refinedText: refinedText.trim() });

  } catch (error) {
    console.error('Error in refine-content API:', error);
    return response.status(500).json({ message: 'AIによる内容の推敲中にエラーが発生しました。' });
  }
}
