// /api/refine-content.mjs
import { GoogleGenerativeAI } from '@google/generative-ai';

// この関数は、フロントエンドから 'text' を受け取り、推敲した結果を返します
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { originalContent } = request.body;
    if (!originalContent || typeof originalContent !== 'string') {
      return response.status(400).json({ message: '推敲する内容がありません。' });
    }
    
    if (originalContent.trim().length === 0) {
      return response.status(400).json({ message: '空の内容は推敲できません。' });
    }
    
    if (originalContent.length > 10000) {
      return response.status(400).json({ message: '内容が長すぎます。10,000文字以内でお願いします。' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API Key available:', !!apiKey);
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set');
      return response.status(500).json({ message: 'APIキーが設定されていません。管理者にお問い合わせください。' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // 安定したモデル名を使用

    const prompt = `あなたはプロの編集者です。以下の日本語のテキストを、主要な意味を保持しつつ、簡潔で分かりやすい文章に推敲してください。マークダウン等は不要で、テキストのみ返してください。\n\n原文：\n---\n${originalContent}\n---\n\n推敲後の内容：`;

    const result = await model.generateContent(prompt);
    const response_data = result.response;
    const refinedText = response_data.text();

    return response.status(200).json({ refinedText: refinedText.trim() });

  } catch (error) {
    console.error('Error in refine-content API:', error);
    
    // より詳細なエラー情報を提供
    let errorMessage = 'AIによる内容の推敲中にエラーが発生しました。';
    
    if (error.message && error.message.includes('API key')) {
      errorMessage = 'APIキーに問題があります。管理者にお問い合わせください。';
    } else if (error.message && error.message.includes('quota')) {
      errorMessage = 'API使用量の上限に達しました。しばらく時間をおいてからお試しください。';
    } else if (error.message && error.message.includes('network')) {
      errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
    }
    
    return response.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
