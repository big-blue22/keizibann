// api/get-posts.mjs

import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  // GETリクエスト以外は受け付けない
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Only GET requests are allowed' });
  }

  try {
    // データベースからすべての投稿を「文字列のリスト」として取得
    const postsAsStrings = await kv.lrange('posts', 0, -1);

    // 各投稿を安全に解析（パース）して、オブジェクトの配列に変換する
    const parsedPosts = postsAsStrings.map(postString => {
      try {
        // 文字列をJavaScriptオブジェクトに変換してみる
        return JSON.parse(postString);
      } catch (e) {
        // もしJSON.parseでエラーが出たら（データが壊れていたら）
        // サーバーのコンソールにエラー内容と問題のデータを記録
        console.error('破損した投稿データをスキップしました:', postString, e);
        // この壊れたデータは結果に含めず、nullを返す
        return null;
      }
    }).filter(post => post !== null); // nullになった要素をリストから完全に除去する

    // 正常に解析できた投稿だけをクライアントに返す
    return response.status(200).json(parsedPosts);

  } catch (error) {
    // データベース接続など、その他の致命的なエラーが発生した場合
    console.error('投稿の取得中にエラーが発生しました:', error);
    return response.status(500).json({ message: 'サーバー側で問題が発生しました。' });
  }
}
