# Firebase Hosting デプロイガイド

このプロジェクトをFirebase Hostingにデプロイする手順です。

## 前提条件

1. Firebase CLIがインストールされていること
```bash
npm install -g firebase-tools
```

2. Firebaseプロジェクトが作成されていること（プロジェクトID: `aula-eb466`）

3. Firebaseにログインしていること
```bash
firebase login
```

## 環境変数の設定

デプロイ前に、Firebase設定の環境変数を設定する必要があります。

### ローカル開発用
プロジェクトルートに `.env` ファイルを作成：

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 本番環境用
Firebase Hostingでは、ビルド時に環境変数を埋め込む必要があります。

1. `.env.production` ファイルを作成（本番用の設定）
2. ビルド時に自動的に読み込まれます

**重要**: `.env` ファイルは `.gitignore` に含まれているため、Gitにコミットされません。

## デプロイ手順

### 1. プロジェクトのビルド

```bash
pnpm run build
```

このコマンドは以下を実行します：
- React Routerアプリケーションを静的ファイル（SPA）としてビルド
- `build/client` ディレクトリに出力

### 2. Firebase Hostingへのデプロイ

#### 全てをデプロイ
```bash
pnpm run deploy
```

#### Hostingのみをデプロイ
```bash
pnpm run deploy:hosting
```

または、直接Firebaseコマンドを実行：
```bash
firebase deploy --only hosting
```

### 3. デプロイの確認

デプロイが成功すると、以下のようなURLが表示されます：
```
Hosting URL: https://aula-eb466.web.app
```

ブラウザでURLを開いて、アプリケーションが正しく動作しているか確認してください。

## プロジェクト設定

### firebase.json

```json
{
  "hosting": {
    "public": "build/client",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

主な設定：
- `public`: ビルド済みファイルのディレクトリ（`build/client`）
- `rewrites`: すべてのリクエストを `index.html` にリダイレクト（SPAのルーティング用）

### react-router.config.ts

```typescript
export default {
  ssr: false,  // SPAモードを有効化
} satisfies Config;
```

Firebase HostingはSSRをサポートしていないため、`ssr: false` を設定してSPAモードで動作させます。

## トラブルシューティング

### ビルドエラーが発生する場合

1. 依存関係を再インストール
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

2. キャッシュをクリア
```bash
rm -rf .react-router build
```

### デプロイ後に404エラーが表示される場合

`firebase.json` の `rewrites` 設定が正しいか確認してください。すべてのルートを `index.html` にリダイレクトする必要があります。

### 環境変数が読み込まれない場合

1. `.env` ファイルが正しく作成されているか確認
2. 環境変数名が `VITE_` プレフィックスで始まっているか確認
3. ビルドを再実行

### Firebaseの初期化エラーが発生する場合

`app/lib/firebase.ts` の設定が正しいか確認してください。環境変数が正しく設定されている必要があります。

## カスタムドメインの設定

1. Firebase Consoleを開く
2. Hosting > ドメインに移動
3. 「カスタムドメインを追加」をクリック
4. 指示に従ってDNS設定を更新

## CI/CDの設定

GitHub Actionsを使用した自動デプロイの例：

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: aula-eb466
```

GitHub Secretsに環境変数を設定する必要があります。

## 参考リンク

- [Firebase Hosting ドキュメント](https://firebase.google.com/docs/hosting)
- [React Router v7 ドキュメント](https://reactrouter.com/start/framework/installation)
- [Vite 環境変数](https://vitejs.dev/guide/env-and-mode.html)
