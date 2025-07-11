// server.mjs - ローカル開発用の簡易サーバー
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

// JSON パースのミドルウェア
app.use(express.json());

// 静的ファイルを提供
app.use(express.static(path.join(__dirname, 'public')));

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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
