// test-view-count-api.mjs
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000'; // 開発サーバーのURL

async function testViewCountAPI() {
  try {
    console.log('=== 直近3日間の閲覧数カウントAPIテスト ===\n');
    
    // 1. 現在の投稿データを取得
    console.log('1. 現在の投稿データを取得...');
    const postsResponse = await fetch(`${BASE_URL}/api/get-posts`);
    if (!postsResponse.ok) {
      throw new Error(`投稿データの取得に失敗: ${postsResponse.status}`);
    }
    const posts = await postsResponse.json();
    
    if (posts.length === 0) {
      console.log('投稿データがありません。テストを終了します。');
      return;
    }
    
    const testPost = posts[0];
    console.log(`テスト対象投稿: ${testPost.id}`);
    console.log(`現在の総閲覧数: ${testPost.viewCount || 0}`);
    console.log(`現在の直近3日間の合計: ${testPost.recentViewCount || 0}`);
    console.log(`現在の日別閲覧数:`, testPost.recentViews || {});
    
    // 2. 閲覧数をインクリメント
    console.log('\n2. 閲覧数をインクリメント...');
    const incrementResponse = await fetch(`${BASE_URL}/api/increment-view-count`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postId: testPost.id }),
    });
    
    if (!incrementResponse.ok) {
      const errorData = await incrementResponse.json().catch(() => ({}));
      throw new Error(`閲覧数インクリメントに失敗: ${incrementResponse.status} - ${errorData.message || 'Unknown error'}`);
    }
    
    const incrementResult = await incrementResponse.json();
    const updatedPost = incrementResult.post;
    
    console.log('インクリメント後の結果:');
    console.log(`  総閲覧数: ${updatedPost.viewCount}`);
    console.log(`  直近3日間の合計: ${updatedPost.recentViewCount}`);
    console.log(`  日別閲覧数:`, updatedPost.recentViews);
    
    // 3. 再度投稿データを取得して確認
    console.log('\n3. 更新後の投稿データを再取得...');
    const postsResponse2 = await fetch(`${BASE_URL}/api/get-posts`);
    const posts2 = await postsResponse2.json();
    const refreshedPost = posts2.find(p => p.id === testPost.id);
    
    console.log('再取得後のデータ:');
    console.log(`  総閲覧数: ${refreshedPost.viewCount}`);
    console.log(`  直近3日間の合計: ${refreshedPost.recentViewCount}`);
    console.log(`  日別閲覧数:`, refreshedPost.recentViews);
    
    // 4. 検証
    console.log('\n=== 検証結果 ===');
    
    // 総閲覧数が1増加しているか
    const viewCountIncreased = refreshedPost.viewCount === (testPost.viewCount || 0) + 1;
    console.log(`総閲覧数が1増加している: ${viewCountIncreased ? '✅ 正常' : '❌ 問題あり'}`);
    
    // 直近3日間の合計が正しく計算されているか
    const calculatedRecentCount = Object.values(refreshedPost.recentViews || {}).reduce((sum, count) => sum + count, 0);
    const recentCountCorrect = calculatedRecentCount === refreshedPost.recentViewCount;
    console.log(`直近3日間の合計が正しく計算されている: ${recentCountCorrect ? '✅ 正常' : '❌ 問題あり'}`);
    
    // 今日の日付が含まれているか
    const today = new Date().toISOString().split('T')[0];
    const hasTodayData = refreshedPost.recentViews && refreshedPost.recentViews[today] !== undefined;
    console.log(`今日の日付(${today})のデータが含まれている: ${hasTodayData ? '✅ 正常' : '❌ 問題あり'}`);
    
    // 3日以上前のデータが削除されているか
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoffDate = threeDaysAgo.toISOString().split('T')[0];
    const hasOldData = Object.keys(refreshedPost.recentViews || {}).some(date => date < cutoffDate);
    console.log(`3日以上前のデータ(${cutoffDate}以前)が削除されている: ${!hasOldData ? '✅ 正常' : '❌ 問題あり'}`);
    
    // 5. 重複アクセス制限のテスト
    console.log('\n4. 重複アクセス制限のテスト...');
    const duplicateResponse = await fetch(`${BASE_URL}/api/increment-view-count`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postId: testPost.id }),
    });
    
    if (duplicateResponse.status === 429) {
      console.log('✅ 重複アクセス制限が正常に動作しています');
    } else {
      console.log('❌ 重複アクセス制限が期待通りに動作していません');
      console.log(`  期待: 429 (Too Many Requests)`);
      console.log(`  実際: ${duplicateResponse.status}`);
    }
    
    console.log('\n=== テスト完了 ===');
    
  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error);
    console.log('\n開発サーバーが起動しているか確認してください:');
    console.log('npm run dev または node index.js');
  }
}

testViewCountAPI(); 