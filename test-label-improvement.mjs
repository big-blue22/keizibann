#!/usr/bin/env node
// test-label-improvement.mjs - ラベル付けロジック改善テスト

import { readFile } from 'fs/promises';
import { join } from 'path';

console.log('🏷️ ラベル付けロジック改善テスト開始');
console.log('=====================================');

// テストケース
const testCases = [
  {
    name: "AIモデル含有（GPT-4）",
    content: "GPT-4を使ってReactアプリケーションの開発を効率化する方法について説明します。TypeScriptとNext.jsを組み合わせて実装。",
    expectExistingLabels: true
  },
  {
    name: "AIモデル含有（Claude）",
    content: "ClaudeとPythonを使ってデータ分析を自動化しました。pandas、numpy、matplotlibを活用。",
    expectExistingLabels: true
  },
  {
    name: "AI技術なし（Web開発）",
    content: "Vue.jsとExpressを使ったWebアプリケーションの構築手順。MongoDBとの連携、認証機能の実装について。",
    expectExistingLabels: false
  },
  {
    name: "AI技術なし（インフラ）",
    content: "DockerとKubernetesを使ったマイクロサービスのデプロイメント。AWS EKSでの運用とCI/CDパイプライン構築。",
    expectExistingLabels: false
  },
  {
    name: "曖昧なAI言及",
    content: "人工知能技術の進歩について考察。機械学習の基本概念とディープラーニングの応用事例。",
    expectExistingLabels: false
  }
];

// APIテスト実行
async function testLabelingLogic() {
  console.log('\n📋 テストケース実行:');
  
  for (const testCase of testCases) {
    console.log(`\n🔍 ${testCase.name}`);
    console.log(`内容: "${testCase.content.substring(0, 50)}..."`);
    
    try {
      // analyze-labels APIを呼び出し（モック）
      const mockRequest = {
        method: 'POST',
        body: { content: testCase.content }
      };
      
      const mockResponse = {
        status: (code) => ({
          json: (data) => {
            console.log(`📊 結果: ${JSON.stringify(data, null, 2)}`);
            
            if (testCase.expectExistingLabels && data.usedExistingLabels) {
              console.log('✅ 期待通り: AIモデル含有のため既存ラベルを活用');
            } else if (!testCase.expectExistingLabels && !data.usedExistingLabels) {
              console.log('✅ 期待通り: AI技術なしのため既存ラベル非活用');
            } else {
              console.log('⚠️ 期待と異なる結果');
            }
            
            return data;
          }
        })
      };
      
      // 実際のAPIロジックはGemini APIが必要なためスキップ
      console.log('📝 実際のAPI呼び出しは本番環境で確認してください');
      
    } catch (error) {
      console.log(`❌ エラー: ${error.message}`);
    }
  }
}

// 設計変更の説明
function explainChanges() {
  console.log('\n🔄 実装した変更点:');
  console.log('=====================================');
  
  console.log('\n1. 🧠 事前AI判定の追加');
  console.log('   - コンテンツにAIモデル/技術が含まれているかを事前チェック');
  console.log('   - GPT, Claude, Gemini, ChatGPT, LLaMA, BERT等を検出');
  
  console.log('\n2. 📚 条件付き既存ラベル活用');
  console.log('   - AIモデルが含まれている場合のみ既存ラベルを参照');
  console.log('   - AI技術なしの場合は既存ラベルを使わずに独立分析');
  
  console.log('\n3. 🎯 プロンプト最適化');
  console.log('   - AIありの場合: 既存ラベル再利用を促進');
  console.log('   - AIなしの場合: 汎用技術要素に特化');
  
  console.log('\n4. 📈 応答データ拡張');
  console.log('   - usedExistingLabels フィールドを追加');
  console.log('   - フロントエンドでの分析結果表示に活用可能');
  
  console.log('\n5. 🔍 フォールバック検出強化');
  console.log('   - AI判定がYESの場合のみフォールバック実行');
  console.log('   - より正確なAIモデル検出パターン');
}

// メイン実行
async function main() {
  await testLabelingLogic();
  explainChanges();
  
  console.log('\n✨ ラベル付けロジック改善完了');
  console.log('\n📋 確認事項:');
  console.log('□ AIモデル含有コンテンツで既存ラベル活用');
  console.log('□ 非AIコンテンツで独立ラベル生成');
  console.log('□ 事前AI判定の精度');
  console.log('□ フロントエンドでの表示確認');
}

main().catch(console.error);
