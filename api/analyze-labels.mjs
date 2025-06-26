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

        const prompt = `あなたは熟練したAIコンテンツアナリストです。以下のテキストに基づき、関連するカテゴリラベルを特定してください。主要なAIモデル名（例: "GPT-4"）を必ず1つ含めてください。もし特定モデルがなければ "特定モデルなし" を含めてください。合計3〜5個のラベルを、日本語のJSON配列形式で返してください。\n\n分析するコンテンツ：\n---\n${content}\n---\n\n提案ラベル (JSON配列形式)：`;

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
