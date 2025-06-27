// /api/analyze-labels.mjs
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { content } = request.body;
        if (!content) {
            return response.status(400).json({ message: '分析する内容がありません。' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return response.status(500).json({ message: 'APIキーが設定されていません。' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const prompt = `あなたは、テキストからAIモデルの名前を特定する専門家です。以下のコンテンツを分析し、言及されている具体的なAIモデル名（例: "GPT-4", "Claude 3", "Gemini 1.5 Pro"）のみを抽出してください。該当するモデル名がない場合は、空の配列 [] を返してください。結果は必ず日本語のJSON配列形式で、モデル名のみを格納して返してください。

分析するコンテンツ：
---
${content}
---

抽出したAIモデル名 (JSON配列形式)：`;

        const result = await model.generateContent(prompt);
        let jsonStr = await result.response.text();

        // AIの応答からJSON部分だけを抽出する
        const fenceRegex = /```(json)?\s*(.*)\s*```/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
          jsonStr = match[2].trim();
        }

        const labels = JSON.parse(jsonStr);

        return response.status(200).json({ labels });

    } catch (error) {
        console.error('Error in analyze-labels API:', error);
        return response.status(500).json({ message: 'AIによるラベル分析中にエラーが発生しました。' });
    }
}
