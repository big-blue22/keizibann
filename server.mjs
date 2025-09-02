// server.mjs - ローカル開発用の簡易サーバー
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import getPostsHandler from './api/get-posts.mjs';
import previewHandler from './api/preview.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

// JSON パースのミドルウェア
app.use(express.json());

// 静的ファイルを提供
app.use(express.static(path.join(__dirname, 'public')));

// API ルート - 実際のAPIハンドラーを使用
app.get('/api/get-posts', getPostsHandler);
app.get('/api/preview', previewHandler);

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
