# 簡単デプロイ手順

## 方法1: GitHub経由（推奨）

### 1. GitHubにプッシュ
```bash
git add .
git commit -m "Vercel KV対応版"
git push origin main
```

### 2. Vercelでインポート
1. https://vercel.com/new にアクセス
2. GitHubリポジトリを選択
3. 「Deploy」をクリック

## 方法2: Vercel CLI経由

### 1. Vercel CLIインストール
```bash
npm i -g vercel
```

### 2. ログインとデプロイ
```bash
vercel login
vercel
```

## KVデータベース作成後の確認

デプロイ後、以下の手順でKVを設定：

1. Vercelダッシュボード → プロジェクト選択
2. 「Storage」タブ → 「Create Database」
3. 「KV」選択 → データベース名入力 → 「Create」
4. 環境変数が自動追加されることを確認
5. 「Deployments」で再デプロイ実行

完了後、アプリケーションでデータが永続化されます！
