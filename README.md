# Aula Frontend

珈琲・俺のシフト調整アプリです。React Router v7 のSPAから、Cloudflare Workers上のREST APIを利用します。

## 構成

- React 19 / React Router v7
- TypeScript
- Cloudflare Access認証
- REST API（既定: `/api/v1`）
- SCSS + CSS Modules
- pnpm

Firebase Authentication、Firestore、Firebase Hostingには依存しません。API仕様は[docs/API_DESIGN.md](docs/API_DESIGN.md)、DB仕様は[docs/db.md](docs/db.md)を参照してください。

## セットアップ

```bash
pnpm install
cp .env.example .env
pnpm dev
```

同一オリジンでAPIを配信する場合、`VITE_API_BASE_URL`は既定値の`/api/v1`を使用します。開発中に別オリジンのAPIへ接続する場合だけ、`.env`で完全なAPI URLを指定してください。

```env
VITE_API_BASE_URL=http://localhost:8787/api/v1
```

ローカルでCloudflare Accessを利用できない場合は、次を指定すると開発用の管理者プロフィールで画面を確認できます。この設定はViteの開発モードでのみ有効で、本番ビルドでは無効です。

```env
VITE_DEV_MODE=true
```

認証はCloudflare AccessのセッションCookieを使用するため、ブラウザからAPIへCookieを送信できるオリジン・CORS設定が必要です。本番ではSPAとAPIの同一オリジン配信を推奨します。

## コマンド

```bash
pnpm dev        # 開発サーバー
pnpm typecheck  # 型検査
pnpm test       # テスト
pnpm build      # 本番ビルド
pnpm ci:check   # Biome検査、型検査、テスト、ビルド
```

`pnpm deploy`は現在フロントエンドの本番ビルドまでを実行します。Cloudflare Workerへの配信は、API実装側のWorker設定とデプロイ手順に従ってください。

## 主な画面とAPI

- ログイン・プロフィール: `/auth/session`, `/users/me`
- シフト回答: `/shifts`, `/shifts/{shiftId}/slots`, `/responses/me`
- メンバー管理: `/users`, `/cafeore-statuses`
- 募集・確定割当管理: `/shifts`, `/responses`, `/confirmed-assignments`
- 業務・枠設定: `/events`, `/positions`, `/slots`

Google Calendar連携とクライアント側iCalendar出力は現在の対象外です。
