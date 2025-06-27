// データ確認スクリプト
import { kv } from '@vercel/kv';

async function checkData() {
  try {
    console.log('Vercel KVデータの確認を開始します...\n');
    
    const posts = await kv.lrange('posts', 0, -1);
    console.log(`📊 データベース内の投稿数: ${posts.length}\n`);
    
    if (posts.length === 0) {
      console.log('❌ データベースにデータがありません');
      return;
    }
    
    posts.forEach((postData, index) => {
      console.log(`--- 投稿 ${index + 1} ---`);
      console.log('データ型:', typeof postData);
      
      try {
        let post;
        if (typeof postData === 'object') {
          post = postData;
          console.log('✅ オブジェクト形式');
        } else if (typeof postData === 'string') {
          post = JSON.parse(postData);
          console.log('✅ JSON文字列形式（正常）');
        } else {
          console.log('❌ 不明な形式');
          return;
        }
        
        console.log(`ID: ${post.id}`);
        console.log(`作成日: ${post.createdAt}`);
        console.log(`要約: ${post.summary.substring(0, 50)}...`);
        console.log(`閲覧数: ${post.viewCount || 0}`);
        console.log(`ラベル: ${post.labels.join(', ')}`);
      } catch (e) {
        console.log('❌ パースエラー:', e.message);
        console.log('生データ:', postData);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ データ確認中にエラーが発生:', error);
  }
}

checkData();
