// /api/create-post.mjs
import { kv } from '@vercel/kv';
import { isKvAvailable } from './utils/kv-utils.mjs';
import { generatePreviewData } from './utils/preview-utils.mjs'; // プレビュー生成関数をインポート
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

async function savePostsLocal(posts) {
  const dataDir = path.dirname(POSTS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2));
}

// 既存の投稿からラベルを取得する関数
async function getExistingLabels() {
  try {
    if (isKvAvailable()) {
      const posts = await kv.lrange('posts', 0, -1);
      const allLabels = new Set();
      
      for (const postData of posts) {
        try {
          let post;
          if (typeof postData === 'object' && postData !== null) {
            post = postData;
          } else if (typeof postData === 'string') {
            post = JSON.parse(postData);
          } else {
            continue;
          }
          
          if (post.labels && Array.isArray(post.labels)) {
            post.labels.forEach(label => allLabels.add(label));
          }
        } catch (e) {
          console.error('Error parsing post for labels:', e);
        }
      }
      
      return Array.from(allLabels);
    } else {
      const posts = await loadPostsLocal();
      const allLabels = new Set();
      
      posts.forEach(post => {
        if (post.labels && Array.isArray(post.labels)) {
          post.labels.forEach(label => allLabels.add(label));
        }
      });
      
      return Array.from(allLabels);
    }
  } catch (error) {
    console.error('Error getting existing labels:', error);
    return [];
  }
}

// AIを使用してラベルを生成する関数
async function generateLabelsWithAI(content, existingLabels) {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not set, falling back to basic labeling');
      return [];
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
${content}
---${existingLabelsText}

適切なラベル（JSON配列）:`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // JSONの抽出を試行
    let jsonStr = responseText.trim();
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
    return Array.isArray(labels) ? labels : [];
    
  } catch (error) {
    console.error('AI label generation error:', error);
    return [];
  }
}

// フォールバック用のラベル生成（AIが失敗した場合）
async function fallbackLabelGeneration(content, existingLabels) {
  const contentLower = content.toLowerCase();
  const foundLabels = [];
  
  // 既存ラベルとの部分マッチング
  for (const existingLabel of existingLabels) {
    const labelLower = existingLabel.toLowerCase();
    if (contentLower.includes(labelLower) || 
        labelLower.split(/[\s\-_]/).some(part => contentLower.includes(part))) {
      foundLabels.push(existingLabel);
    }
  }
  
  // 基本的な技術キーワードマッチング（既存ラベル優先）
  const techKeywords = {
    'JavaScript': ['javascript', 'js', 'node.js', 'nodejs'],
    'TypeScript': ['typescript', 'ts'],
    'React': ['react', 'jsx', 'react.js'],
    'Vue.js': ['vue', 'vue.js', 'nuxt'],
    'Python': ['python', 'django', 'flask', 'fastapi'],
    'AI': ['ai', 'machine learning', 'deep learning', 'llm'],
    'Web開発': ['web', 'frontend', 'backend', 'fullstack'],
    'データベース': ['database', 'sql', 'mongodb', 'postgres', 'mysql'],
    'クラウド': ['aws', 'azure', 'gcp', 'cloud', 'vercel', 'netlify']
  };

  for (const [label, keywords] of Object.entries(techKeywords)) {
    if (keywords.some(keyword => contentLower.includes(keyword))) {
      // 既存ラベルに同じようなものがあるかチェック
      const existingMatch = existingLabels.find(existing => 
        existing.toLowerCase().includes(label.toLowerCase()) || 
        label.toLowerCase().includes(existing.toLowerCase())
      );
      
      if (existingMatch) {
        foundLabels.push(existingMatch);
      } else {
        foundLabels.push(label);
      }
    }
  }

  return foundLabels.length > 0 ? [...new Set(foundLabels)] : ['技術情報'];
}



export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { url, originalContent } = request.body;
    let summary = request.body.summary;
    let title = ''; // titleをここで宣言
    let previewData = null;

    if (!url) {
      return response.status(400).json({ message: 'URLは必須です。' });
    }

    // プレビューデータをまず取得試行
    try {
      previewData = await generatePreviewData(url);
    } catch (error) {
      console.warn(`プレビューデータの取得に失敗しました（続行）: ${error.message}`);
      // プレビューが失敗しても、summaryがあれば投稿は作成できるので、ここではエラーにしない
    }

    // summaryが提供されていない場合、プレビューデータから生成
    if (!summary || summary.trim() === '') {
      if (!previewData) {
        // プレビュー取得に失敗していて、かつsummaryもない場合はエラー
        return response.status(400).json({ message: `URLから情報を取得できませんでした。有効なURLか確認してください。` });
      }
      title = previewData.title || 'タイトルなし';
      summary = previewData.description || '説明なし';
    } else {
      // summaryが提供されている場合、タイトルはプレビューから取得（なければURL）
      title = previewData?.title || url;
    }

    // ラベルを自動生成
    let labels = [];
    try {
      const content = `タイトル: ${title}\n要約: ${summary}\n詳細: ${originalContent || ''}`;
      const existingLabels = await getExistingLabels();
      const aiLabels = await generateLabelsWithAI(content, existingLabels);
      
      if (aiLabels.length > 0) {
        labels = aiLabels;
      } else {
        labels = await fallbackLabelGeneration(content, existingLabels);
      }
    } catch (error) {
      console.error('Label generation error:', error);
      labels = ['AI', '技術情報']; // 安全なフォールバック
    }

    const newPost = {
      id: `post_${Date.now()}`,
      url,
      title, // titleフィールドを追加
      summary,
      labels,
      createdAt: new Date().toISOString(),
      viewCount: 0,
      commentCount: 0,
      previewData: previewData
    };

    console.log('Creating post with data:', newPost);

    try {
      console.log('--- DIAGNOSTIC LOG ---');
      console.log('Preparing to save post. Full object:');
      console.log(JSON.stringify(newPost, null, 2));
      console.log('Checking types of newPost properties:');
      for (const key in newPost) {
        console.log(`- ${key}: ${typeof newPost[key]}`);
      }
      const postJsonString = JSON.stringify(newPost);
      console.log('Stringified JSON to be sent:');
      console.log(postJsonString);
      console.log('--- END DIAGNOSTIC LOG ---');

      if (isKvAvailable()) {
        await kv.lpush('posts', postJsonString);
        console.log('KVに保存された投稿:', postJsonString);
      } else {
        const posts = await loadPostsLocal();
        posts.unshift(newPost);
        await savePostsLocal(posts);
        console.log('ローカルファイルに投稿を保存しました。');
      }
    } catch (dbError) {
      console.error('データベース保存エラー:', dbError);
      throw new Error('データベースへの保存に失敗しました。KVストアの接続設定などを確認してください。');
    }

    return response.status(200).json({ success: true, post: newPost });
  } catch (error) {
    console.error('Error creating post:', error);
    const message = error.message.includes('データベース') || error.message.includes('URLから情報を取得')
      ? error.message
      : '投稿の保存中に予期せぬエラーが発生しました。';
    return response.status(500).json({ message });
  }
}
