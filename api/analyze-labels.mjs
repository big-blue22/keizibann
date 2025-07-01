// /api/analyze-labels.mjs
import { GoogleGenerativeAI } from '@google/generative-ai';
import { kv } from '@vercel/kv';
import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');

// 開発環境用：ローカルファイルストレージ
async function loadPostsLocal() {
  try {
    const data = await fs.readFile(POSTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Vercel KVが利用可能かチェック
function isKvAvailable() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
}

// 既存ラベルを取得
async function getExistingLabels() {
  try {
    let posts;
    if (isKvAvailable()) {
      posts = await kv.get('posts') || [];
    } else {
      posts = await loadPostsLocal();
    }
    
    const labelSet = new Set();
    posts.forEach(post => {
      if (post.labels && Array.isArray(post.labels)) {
        post.labels.forEach(label => labelSet.add(label));
      }
    });
    
    return Array.from(labelSet).sort();
  } catch {
    return [];
  }
}

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

        // 初回分析：AIモデルが含まれているかチェック
        const preCheckPrompt = `以下のコンテンツにAIモデルやAI技術（GPT, Claude, Gemini, ChatGPT, LLaMA, BERT, OpenAI, Anthropic, Google AI等）が言及されているかを判定してください。

コンテンツ：
---
${content}
---

AIモデル/技術が含まれている場合は "YES"、含まれていない場合は "NO" で回答してください。`;

        const preCheckResult = await model.generateContent(preCheckPrompt);
        const containsAI = (await preCheckResult.response.text()).trim().toUpperCase().includes('YES');

        let existingLabels = [];
        let promptTemplate = '';

        if (containsAI) {
            // AIモデルが含まれている場合のみ既存ラベルを活用
            existingLabels = await getExistingLabels();
            promptTemplate = existingLabels.length > 0 
                ? `あなたは技術コンテンツの分析専門家です。以下のコンテンツを分析して、含まれている技術要素を特定してください。

【既存ラベル】（可能な限り再利用してください）
${existingLabels.join(', ')}

【検出すべき要素（優先順位順）】
1. AIモデル名（必須）: GPT-4, GPT-3.5, Claude, Gemini, ChatGPT, LLaMA, BERT など
2. プログラミング言語: JavaScript, Python, TypeScript, Java, C++ など
3. フレームワーク/ライブラリ: React, Vue.js, Django, Flask, Express など
4. 技術分野: 機械学習, Web開発, データベース, クラウド など

【重要】
- AIモデルが言及されている場合は必ず含めてください
- 既存ラベルと同じ意味の場合は既存ラベルを優先してください
- 具体的で正確な名前を使用してください
- 日本語のラベルを優先してください
- 結果はJSON配列で返してください`
                : `あなたは技術コンテンツの分析専門家です。以下のコンテンツを分析して、含まれている技術要素を特定してください。

【検出すべき要素（優先順位順）】
1. AIモデル名（必須）: GPT-4, GPT-3.5, Claude, Gemini, ChatGPT, LLaMA, BERT など
2. プログラミング言語: JavaScript, Python, TypeScript, Java, C++ など
3. フレームワーク/ライブラリ: React, Vue.js, Django, Flask, Express など
4. 技術分野: 機械学習, Web開発, データベース, クラウド など

【重要】
- AIモデルが言及されている場合は必ず含めてください
- 具体的で正確な名前を使用してください
- 日本語のラベルを優先してください
- 結果はJSON配列で返してください`;
        } else {
            // AIモデルが含まれていない場合は既存ラベルを使わない
            promptTemplate = `あなたは技術コンテンツの分析専門家です。以下のコンテンツを分析して、含まれている技術要素を特定してください。

【検出すべき要素（優先順位順）】
1. プログラミング言語: JavaScript, Python, TypeScript, Java, C++ など
2. フレームワーク/ライブラリ: React, Vue.js, Django, Flask, Express など
3. 技術分野: Web開発, データベース, クラウド, セキュリティ など
4. ツール/プラットフォーム: Docker, Kubernetes, AWS, Azure など

【重要】
- 具体的で正確な名前を使用してください
- 日本語のラベルを優先してください
- 結果はJSON配列で返してください`;
        }

        const prompt = `${promptTemplate}

分析するコンテンツ：
---
${content}
---

技術ラベル（JSON配列）:`;

        const result = await model.generateContent(prompt);
        let jsonStr = await result.response.text();

        // AIの応答からJSON部分だけを抽出する
        const fenceRegex = /```(?:json)?\s*(.*?)\s*```/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[1]) {
          jsonStr = match[1].trim();
        }
        
        // JSON以外の部分を除去
        const jsonMatch = jsonStr.match(/\[.*\]/s);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }

        const labels = JSON.parse(jsonStr);
        
        // AIモデルが含まれているかチェック（containsAIがtrueの場合のみ）
        if (containsAI) {
            const hasAiModel = labels.some(label => 
                /gpt|claude|gemini|llama|bert|chatgpt|openai|anthropic|google.*ai/i.test(label)
            );
            
            if (!hasAiModel) {
                // フォールバック検出
                const contentLower = content.toLowerCase();
                const aiModels = ['GPT-4', 'GPT-3.5', 'ChatGPT', 'Claude', 'Gemini', 'LLaMA', 'BERT'];
                for (const model of aiModels) {
                    if (contentLower.includes(model.toLowerCase())) {
                        labels.unshift(model);
                        break;
                    }
                }
            }
        }

        return response.status(200).json({ 
            labels: Array.isArray(labels) ? labels : [],
            usedExistingLabels: containsAI && existingLabels.length > 0
        });

    } catch (error) {
        console.error('Error in analyze-labels API:', error);
        return response.status(500).json({ message: 'AIによるラベル分析中にエラーが発生しました。' });
    }
}
