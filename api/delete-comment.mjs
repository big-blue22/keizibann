import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // 管理者認証
  const token = request.headers.authorization?.split(' ')[1];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return response.status(401).json({ message: '認証が必要です。' });
  }

  try {
    const { postId, commentId } = request.body;
    if (!postId || !commentId) {
      return response.status(400).json({ message: '必須項目が不足しています。' });
    }

    // コメントリストから指定されたコメントを削除
    // Vercel KVのLREMは指定された値と一致する要素を削除します。
    // ここではコメントIDでフィルタリングするために、一度全てのコメントを取得し、
    // 削除対象を除外した新しいリストで上書きします。
    const commentsKey = `comments:${postId}`;
    let comments = await kv.lrange(commentsKey, 0, -1);

    // JSON文字列として保存されているため、パースしてフィルタリング
    const parsedComments = comments.map(c => JSON.parse(c));
    const updatedComments = parsedComments.filter(c => c.id !== commentId);

    // 元のリストを削除し、新しいリストで上書き
    await kv.del(commentsKey);
    if (updatedComments.length > 0) {
      // lpushは複数の引数を取れるので、逆順にして一括で追加
      await kv.lpush(commentsKey, ...updatedComments.map(c => JSON.stringify(c)).reverse());
    }

    return response.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return response.status(500).json({ message: 'コメントの削除中にエラーが発生しました。' });
  }
}
