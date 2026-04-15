# Aula Frontend

珈琲・俺のシフト調整アプリ（React Router v7 + Firebase）のフロントエンドです。

## Tech Stack

- React 19 / React Router v7
- TypeScript
- Firebase (Auth / Firestore / Hosting)
- SCSS + CSS Modules
- pnpm

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

`.env` を作成して Firebase の設定値を入れてください。

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Development

```bash
pnpm dev
```

`http://localhost:5173` で起動します。

## Build

```bash
pnpm build
```

## Test

```bash
pnpm test
```

## Deploy

主なコマンド:

```bash
pnpm deploy
pnpm deploy:hosting
```

### 前提条件

1. Firebase CLI をインストール

```bash
npm install -g firebase-tools
```

2. Firebase プロジェクトを用意（現行: `aula-eb466`）
3. Firebase にログイン

```bash
firebase login
```

### 環境変数

- ローカル開発: `.env`
- 本番ビルド: `.env.production`

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### デプロイ手順

1. ビルド

```bash
pnpm build
```

2. デプロイ

```bash
pnpm deploy
```

または Hosting のみ:

```bash
pnpm deploy:hosting
# もしくは
firebase deploy --only hosting
```

3. 公開URLで動作確認（例: `https://aula-eb466.web.app`）

### 重要設定

- `firebase.json`
	- `hosting.public` は `build/client`
	- `hosting.rewrites` は `** -> /index.html`（SPAルーティング対応）
- `react-router.config.ts`
	- `ssr: false`（Firebase Hosting では SPA モード運用）

### トラブルシューティング

- ビルド失敗時

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
rm -rf .react-router build
```

- デプロイ後に 404 が出る
	- `firebase.json` の `rewrites` 設定を確認

- 環境変数が効かない
	- 変数名が `VITE_` プレフィックスか確認
	- `.env` / `.env.production` を見直して再ビルド

## Styling Policy

- 画面・コンポーネントのスタイルは `*.module.scss` を利用
- グローバル定義は `app/styles/app.scss`（トークン/リセット中心）
- 文字列ベースのユーティリティ `className` は使用しない
