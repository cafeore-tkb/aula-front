# Docker開発環境セットアップガイド

このドキュメントでは、Dockerを使った開発環境の構築方法を説明します。

## 前提条件

- Docker がインストールされていること
- Docker Compose がインストールされていること

## セットアップ手順

### 1. 開発環境の起動

```bash
docker-compose up -d
```

このコマンドで:
- Node.js 20 Alpine イメージを使用したコンテナが起動
- 全ての必要な依存関係がインストール
- 開発サーバーがポート 5173 で起動

### 2. 開発サーバーへのアクセス

ブラウザで以下のURLにアクセス:
```
http://localhost:5173
```

## よく使うコマンド

### コンテナを起動
```bash
docker-compose up -d
```

### コンテナを停止
```bash
docker-compose down
```

### ログを確認
```bash
docker-compose logs -f dev
```

### コンテナ内でコマンドを実行
```bash
docker-compose exec dev pnpm <command>
```

例:
```bash
# テストを実行
docker-compose exec dev pnpm test

# ビルドを実行
docker-compose exec dev pnpm build

# 型チェック
docker-compose exec dev pnpm typecheck
```

### コンテナにシェルアクセス
```bash
docker-compose exec dev sh
```

## 開発フロー

### ホットリロード
コードを編集すると、自動的にブラウザがリロードされます（Viteのホットモジュールリロード機能）。

### ファイルシステムの同期
`docker-compose.yml` の `volumes` セクションにより、ホスト側の変更がコンテナ内に即座に反映されます。

```yaml
volumes:
  - .:/app          # プロジェクト全体をマウント
  - /app/node_modules  # node_modules は別途マウント
```

## トラブルシューティング

### ポート 5173 が既に使用されている
環境変数でポートを変更できます:

```bash
PORT=3000 docker-compose up -d
```

または、`docker-compose.yml` を編集:
```yaml
ports:
  - '3000:5173'
```

### node_modules がキャッシュされている
```bash
docker-compose down
docker system prune -a
docker-compose up -d
```

### 依存関係を更新した場合
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 環境変数

`.env` ファイルをプロジェクトルートに作成することで、環境変数を設定できます。

例:
```env
PORT=5173
NODE_ENV=development
```

## プロダクションビルド

```bash
docker-compose exec dev pnpm build
```

## 参考

- [Vite ドキュメント](https://vitejs.dev/)
- [React Router ドキュメント](https://reactrouter.com/)
- [Docker ドキュメント](https://docs.docker.com/)
