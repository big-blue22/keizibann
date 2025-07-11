// server.mjs - ローカル開発用の簡易サーバー
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

// Multer configuration for handling multipart form data
const upload = multer();

// JSON パースのミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // URL エンコードされたフォームデータ用

// 静的ファイルを提供
app.use(express.static(path.join(__dirname, 'public')));

// Web Share Target API のハンドラー
app.post('/api/handle-share', upload.any(), (req, res) => {
  try {
    const title = req.body.title || '';
    const text = req.body.text || '';
    const url = req.body.url || '';
    const shared_files = req.files || [];
    
    console.log('Web Share Target data received:', {
      title,
      text,
      url,
      files: shared_files.length,
      contentType: req.get('content-type')
    });

    // 共有データをクエリパラメータとして URL に埋め込む
    const shareParams = new URLSearchParams();
    if (title) shareParams.set('shared_title', title);
    if (text) shareParams.set('shared_text', text);
    if (url) shareParams.set('shared_url', url);
    
    // ファイルの情報があれば追加
    if (shared_files.length > 0) {
      shareParams.set('shared_files_count', shared_files.length.toString());
    }

    // 共有データがある場合はフラグを設定
    if (title || text || url || shared_files.length > 0) {
      shareParams.set('shared', 'true');
    }

    // メインページにリダイレクト（共有データをクエリパラメータで渡す）
    const redirectUrl = shareParams.toString() ? `/?${shareParams.toString()}` : '/';
    
    console.log('Redirecting to:', redirectUrl);
    
    // 303 See Other でリダイレクト（POST から GET へのリダイレクトに適している）
    res.redirect(303, redirectUrl);

  } catch (error) {
    console.error('Error handling Web Share Target:', error);
    
    // エラーが発生した場合でもメインページにリダイレクト
    res.redirect(303, '/');
  }
});

// API ルート
app.get('/api/get-posts', async (req, res) => {
  try {
    // モックデータを返す
    const mockPosts = [
      {
        id: 'mock-1',
        url: 'https://example.com/ai-trends',
        content: 'AI技術の最新トレンドについて詳しく解説している記事です。',
        labels: ['AI', 'トレンド', '技術'],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1日前
        recentViews: { 
          [new Date().toISOString().split('T')[0]]: 10,
          [new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split('T')[0]]: 5 
        },
        recentViewCount: 15,
        commentCount: 3
      },
      {
        id: 'mock-2',
        url: 'https://example.com/react-tips',
        content: 'React開発で役立つ実践的なテクニック集です。',
        labels: ['React', 'JavaScript', 'フロントエンド'],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3日前
        recentViews: { 
          [new Date().toISOString().split('T')[0]]: 8,
          [new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split('T')[0]]: 12 
        },
        recentViewCount: 20,
        commentCount: 1
      },
      {
        id: 'mock-3',
        url: 'https://example.com/database-design',
        content: 'データベース設計の基本原則と実装のベストプラクティス。',
        labels: ['データベース', '設計', 'バックエンド'],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7日前
        recentViews: { 
          [new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString().split('T')[0]]: 3 
        },
        recentViewCount: 3,
        commentCount: 0
      }
    ];
    
    res.json(mockPosts);
  } catch (error) {
    console.error('Error in get-posts API:', error);
    res.status(500).json({ 
      message: '投稿の取得中にエラーが発生しました',
      error: error.message
    });
  }
});

// その他のAPIルートはダミーレスポンス
app.post('/api/increment-view-count', (req, res) => {
  res.json({ success: true });
});

app.get('/api/get-comments', (req, res) => {
  res.json([]);
});

// SPAサポート: すべてのルートでindex.htmlを返す
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
