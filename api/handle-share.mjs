// api/handle-share.mjs - Web Share Target API のサーバーサイドハンドラー

export default async function handler(req, res) {
  // POST リクエストのみを受け付ける
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Content-Type を確認
    const contentType = req.headers['content-type'] || '';
    let title = '';
    let text = '';
    let url = '';
    let filesCount = 0;
    
    if (contentType.includes('multipart/form-data')) {
      // multipart/form-data の場合、Vercel では req.body にパースされたデータが入る
      title = req.body.title || '';
      text = req.body.text || '';
      url = req.body.url || '';
      
      // ファイルの情報を取得
      if (req.body.shared_files) {
        filesCount = Array.isArray(req.body.shared_files) ? req.body.shared_files.length : 1;
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // URL エンコードされたフォームデータの場合
      title = req.body.title || '';
      text = req.body.text || '';
      url = req.body.url || '';
      
      if (req.body.shared_files) {
        filesCount = Array.isArray(req.body.shared_files) ? req.body.shared_files.length : 1;
      }
    } else {
      // その他の場合は JSON として処理
      const data = req.body;
      title = data.title || '';
      text = data.text || '';
      url = data.url || '';
      
      if (data.shared_files) {
        filesCount = Array.isArray(data.shared_files) ? data.shared_files.length : 1;
      }
    }
    
    console.log('Web Share Target data received:', {
      title,
      text,
      url,
      filesCount,
      contentType
    });

    // 共有データをクエリパラメータとして URL に埋め込む
    const shareParams = new URLSearchParams();
    if (title) shareParams.set('shared_title', title);
    if (text) shareParams.set('shared_text', text);
    if (url) shareParams.set('shared_url', url);
    if (filesCount > 0) shareParams.set('shared_files_count', filesCount.toString());

    // 共有データがある場合はフラグを設定
    if (title || text || url || filesCount > 0) {
      shareParams.set('shared', 'true');
    }

    // メインページにリダイレクト（共有データをクエリパラメータで渡す）
    const redirectUrl = shareParams.toString() ? `/?${shareParams.toString()}` : '/';
    
    console.log('Redirecting to:', redirectUrl);
    
    // 303 See Other でリダイレクト（POST から GET へのリダイレクトに適している）
    res.status(303).setHeader('Location', redirectUrl);
    res.end();

  } catch (error) {
    console.error('Error handling Web Share Target:', error);
    
    // エラーが発生した場合でもメインページにリダイレクト
    res.status(303).setHeader('Location', '/');
    res.end();
  }
}