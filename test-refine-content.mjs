// テスト用のスクリプト
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testRefineContent() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY環境変数が設定されていません');
      return;
    }

    console.log('Gemini APIのテストを開始します...');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const testContent = "これはテストの文章です。AIによる推敲機能が正常に動作するかを確認しています。";
    const prompt = `あなたはプロの編集者です。以下の日本語のテキストを、主要な意味を保持しつつ、簡潔で分かりやすい文章に推敲してください。マークダウン等は不要で、テキストのみ返してください。\n\n原文：\n---\n${testContent}\n---\n\n推敲後の内容：`;

    const result = await model.generateContent(prompt);
    const response_data = result.response;
    const refinedText = response_data.text();

    console.log('テスト成功！');
    console.log('原文:', testContent);
    console.log('推敲後:', refinedText.trim());
    
  } catch (error) {
    console.error('テスト失敗:', error.message);
  }
}

testRefineContent();
