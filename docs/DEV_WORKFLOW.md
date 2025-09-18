# Development Workflow

Cycle & Strength Logger は Next.js + Convex + Ultracite を前提にした構成です。以下の
ステップでローカル開発とガードレールを整備してください。

## 1. 依存関係のインストール

```bash
npm install
```

## 2. Convex の初期設定

1. Convex CLI にサインインしていない場合は `npx convex login` を実行する。
2. プロジェクト直下で `npx convex dev --configure new` を実行すると、
   `convex/_generated/` ディレクトリが自動生成され、`NEXT_PUBLIC_CONVEX_URL`
   などの環境変数が `.env.local` に追記されます。
3. 開発サーバーを常駐させる場合は `npx convex dev` を別ターミナルで実行。

> **メモ**: このリポジトリでは `_generated` フォルダを暫定的に手書きしています。
> Convex CLI を実行した時点で自動生成の内容へ置き換わります。

## 3. Next.js の開発サーバー

```bash
npm run dev
```

## 4. コード品質チェック

Ultracite (Biome ベース) を採用しています。保存時の整形だけでなく、PR 前に以下の
コマンドを実行して下さい。

```bash
npm run format   # 自動修正込み
npm run lint     # チェックのみ (内部的には ultracite lint)
```

## 5. 推奨ワークフロー

1. Convex の `listRecent` / `create*` Mutation を更新したら `npm run lint` を走らせる。
2. Next.js 側で `useQuery` / `useMutation` を追加したら型エラーと Ultracite を確認。
3. Tailwind クラスは辞書順で並べる (Ultracite の `useSortedClasses` ルールに従う)。

## 6. 環境変数

- `NEXT_PUBLIC_CONVEX_URL`: Convex dev deployment の URL。
- `CONVEX_DEPLOYMENT`: `convex dev` が自動で `.env.local` に書き込みます。
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google OAuth 用の資格情報。
- `APPLE_CLIENT_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY`: Apple Sign in 用の資格情報。

> Google / Apple の資格情報が未設定の場合、Convex Auth は自動的に匿名プロバイダーに
> フォールバックします。OAuth を有効にするには上記の環境変数を設定した上で
> `npx convex dev` を再起動してください。

## 7. 今後の ToDo メモ

- Convex Auth を有効化し、`users.completeOnboarding` Mutation を呼び出す UI を追加。
- `workouts.listRecent` を `app/page.tsx` のタイムラインへ接続。
- 週次集計クエリを作成し、チャート描画 (Recharts など) を差し込む。
- `app/workouts/new/page.tsx` のフォームに実際のバリデーションと submit ハンドラを実装。
