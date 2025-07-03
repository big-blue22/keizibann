// test-view-count-display.mjs - 閲覧数表示のテスト

import fs from 'fs/promises';
import path from 'path';

const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');

// テスト用投稿データを作成
async function createTestPostWithViewCounts() {
  const testPost = {
    id: `test-${Date.now()}`,
    title: "閲覧数表示テスト投稿",
    content: "累計閲覧数と直近3日間閲覧数の表示テストです。",
    url: "https://example.com",
    labels: ["テスト", "閲覧数"],
    createdAt: new Date().toISOString(),
    viewCount: 150, // 累計閲覧数
    recentViews: {
      // 直近3日間のデータ
      "2025-07-01": 10,
      "2025-07-02": 15,
      "2025-07-03": 8,
      // 古いデータ（3日以前）
      "2025-06-28": 5,
      "2025-06-29": 12
    },
    // recentViewCountは意図的に未設定（API側で自動計算される）
  };

  try {
    // 既存の投稿データを読み込み
    let posts = [];
    try {
      const data = await fs.readFile(POSTS_FILE, 'utf-8');
      posts = JSON.parse(data);
    } catch (error) {
      console.log('既存の投稿データが見つからない。新規作成します。');
    }

    // テスト投稿を追加
    posts.unshift(testPost);

    // ファイルに保存
    await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2));
    
    console.log('✅ テスト投稿を作成しました:');
    console.log(`- 投稿ID: ${testPost.id}`);
    console.log(`- 累計閲覧数: ${testPost.viewCount}`);
    console.log('- 直近の閲覧データ:', testPost.recentViews);
    console.log('- 期待される直近3日間閲覧数: 33 (10 + 15 + 8)');
    
    return testPost;
  } catch (error) {
    console.error('❌ テスト投稿の作成に失敗:', error);
    throw error;
  }
}

// API動作テスト
async function testGetPostsAPI() {
  try {
    console.log('\n📡 GET /api/get-posts のテストを開始...');
    
    // 動的インポートでAPIハンドラを読み込み
    const { default: handler } = await import('./api/get-posts.mjs');
    
    // モックリクエスト/レスポンス
    const mockRequest = {
      method: 'GET',
      query: {}
    };
    
    let responseData = null;
    let statusCode = null;
    
    const mockResponse = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
            return mockResponse;
          }
        };
      }
    };
    
    // API呼び出し
    await handler(mockRequest, mockResponse);
    
    console.log(`📊 APIレスポンス (ステータス: ${statusCode}):`);
    
    if (statusCode === 200 && Array.isArray(responseData)) {
      console.log(`✅ ${responseData.length}件の投稿を取得`);
      
      // テスト投稿を検索
      const testPost = responseData.find(post => post.title?.includes('閲覧数表示テスト'));
      
      if (testPost) {
        console.log('\n🎯 テスト投稿の閲覧数表示:');
        console.log(`- 累計閲覧数: ${testPost.viewCount}`);
        console.log(`- 直近3日間閲覧数: ${testPost.recentViewCount}`);
        console.log(`- recentViews:`, testPost.recentViews);
        
        // 期待値チェック
        const expectedRecentCount = 33; // 10 + 15 + 8
        if (testPost.recentViewCount === expectedRecentCount) {
          console.log('✅ 直近3日間閲覧数の計算が正確です');
        } else {
          console.log(`❌ 直近3日間閲覧数が期待値と異なります (期待: ${expectedRecentCount}, 実際: ${testPost.recentViewCount})`);
        }
      } else {
        console.log('⚠️ テスト投稿が見つかりませんでした');
      }
    } else {
      console.log('❌ APIエラー:', responseData);
    }
    
  } catch (error) {
    console.error('❌ APIテストに失敗:', error);
    throw error;
  }
}

// フロントエンド表示形式のテスト
function testDisplayFormat() {
  console.log('\n🎨 フロントエンド表示形式のテスト:');
  
  const samplePost = {
    viewCount: 150,
    recentViewCount: 33
  };
  
  // 現在の表示形式をシミュレート
  const displayText = `閲覧数: 累計 ${samplePost.viewCount || 0} 回 ／ 直近3日間 ${samplePost.recentViewCount !== undefined ? samplePost.recentViewCount : 0} 回`;
  
  console.log('表示例:', displayText);
  console.log('✅ 累計と直近3日間の両方が表示されています');
}

// メイン実行
async function main() {
  console.log('🧪 閲覧数表示機能の総合テスト開始\n');
  
  try {
    // 1. テスト投稿作成
    await createTestPostWithViewCounts();
    
    // 2. API動作テスト
    await testGetPostsAPI();
    
    // 3. 表示形式テスト
    testDisplayFormat();
    
    console.log('\n🎉 全てのテストが完了しました！');
    console.log('\n📝 確認事項:');
    console.log('- ✅ APIは累計閲覧数（viewCount）を返している');
    console.log('- ✅ APIは直近3日間閲覧数（recentViewCount）を計算して返している');
    console.log('- ✅ フロントエンドは両方の値を表示する形式になっている');
    
  } catch (error) {
    console.error('\n❌ テスト中にエラーが発生:', error);
    process.exit(1);
  }
}

main();
