// ラベル生成機能のテスト
// node test-label-generation.mjs で実行

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');

// 既存の投稿からラベルを取得
async function getExistingLabels() {
  try {
    const data = await fs.readFile(POSTS_FILE, 'utf-8');
    const posts = JSON.parse(data);
    const allLabels = new Set();
    
    posts.forEach(post => {
      if (post.labels && Array.isArray(post.labels)) {
        post.labels.forEach(label => allLabels.add(label));
      }
    });
    
    return Array.from(allLabels);
  } catch (error) {
    console.error('Error getting existing labels:', error);
    return [];
  }
}

// テスト用のコンテンツ
const testContents = [
  "GPT-4を使用したReactアプリケーションの開発について説明します。TypeScriptとNext.jsを使ってAIチャットボットを作成しました。",
  "Claudeとの対話を通じてPythonのデータ分析スクリプトを作成する方法を紹介します。pandas、numpy、matplotlibを使用しています。",
  "GeminiのAPIを使用してVue.jsアプリケーションにAI機能を統合する手順を解説します。"
];

async function testLabelGeneration() {
  console.log('既存ラベルを取得中...');
  const existingLabels = await getExistingLabels();
  console.log('既存ラベル:', existingLabels);
  
  for (let i = 0; i < testContents.length; i++) {
    console.log(`\n--- テスト ${i + 1} ---`);
    console.log('内容:', testContents[i]);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.log('GEMINI_API_KEY not set, skipping AI test');
        continue;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const existingLabelsText = existingLabels.length > 0 
        ? `\n\n既存のラベル（可能な限りこれらを使用してください）:\n${existingLabels.join(', ')}` 
        : '';

      const prompt = `あなたは技術コンテンツの分類専門家です。以下の内容を分析して、適切なラベルを生成してください。

【重要な要件】
1. AIモデル名の検出は必須です（GPT-4, Claude, Gemini, LLaMA, etc.）
2. 技術スタック、プログラミング言語、フレームワークを特定してください
3. 既存のラベルがある場合は、可能な限りそれらを使用してください
4. 日本語のラベルを返してください
5. 結果はJSON配列形式で返してください（例: ["GPT-4", "JavaScript", "React"]）

分析する内容:
---
${testContents[i]}
---${existingLabelsText}

適切なラベル（JSON配列）:`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      console.log('AI応答:', responseText);
      
      // JSONの抽出
      let jsonStr = responseText.trim();
      const jsonMatch = jsonStr.match(/\[.*\]/s);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
        const labels = JSON.parse(jsonStr);
        console.log('生成されたラベル:', labels);
      }
      
    } catch (error) {
      console.error('エラー:', error.message);
    }
  }
}

testLabelGeneration();
