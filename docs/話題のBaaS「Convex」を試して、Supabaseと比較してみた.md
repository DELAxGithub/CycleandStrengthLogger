---
title: "話題のBaaS「Convex」を試して、Supabaseと比較してみた"
source: "https://zenn.dev/chot/articles/582c381a80d0d1"
author:
  - "[[Zenn]]"
published: 2025-06-18
created: 2025-09-18
description:
tags:
  - "clippings"
---
[chot Inc. tech blog](https://zenn.dev/p/chot) [Publicationへの投稿](https://zenn.dev/faq#what-is-publication)

56

14[tech](https://zenn.dev/tech-or-idea)

## はじめに

皆さんは、個人開発や簡単なプロトタイプのWebアプリを作るとき、バックエンドはどうしていますでしょうか。

私の場合、ここ数年は「とりあえずSupabaseで」というのがお決まりの一手でした。PostgreSQLが使えて、認証やリアルタイム機能もサクッと実装でき、無料枠も十分です。

ですが最近、SNSやVibe Codingの文脈で「 [Convex](https://www.convex.dev/) 」というBaaSの名前を見かけるようになりました。「開発体験が革命的」や「リアルタイム実装が驚くほど簡単」など、気になる評判ばかり。

今回は実際にConvexを軽く触ってみて、Supabaseと何が違うのか、特に「開発ワークフロー」と「コードの簡潔さ」に焦点を当てて比較してみることにしました。

技術選定の一環として、あるいは新しいツールに興味がある方の参考になれば幸いです。

## アーキテクチャ思想の比較：SQL中心か、TypeScript-nativeか

検証に入る前に、両サービスの根底にある思想の違いについて触れておきます。この違いが、開発体験の差に直結するためです。

- **Supabase**: Supabaseの思想は「 **PostgreSQLの能力を最大限に引き出す** 」ことにあります。開発者は使い慣れたSQLを用いて、テーブル定義から複雑なクエリ、行単位のセキュリティ（RLS）による厳格な権限管理まで、データベースの機能をフルに活用できます。これは、データベース中心の設計において大きな強みとなります。
- **Convex**: 一方、Convexの思想は「 **TypeScriptによるエンドツーエンドの開発体験** 」を追求することにあります。データベースのスキーマ、サーバーサイドのAPI（クエリ/ミューテーション）、そしてフロントエンドのコードまで、すべてをTypeScriptで記述します。これにより、型安全性をプロジェクト全体で一貫して保証し、リアルタイム機能をアーキテクチャの標準機能として提供します。

## 検証1：セットアップとスキーマ定義

データベースに `tasks` テーブルを定義するまでの初期設定を比較します。

### Supabase： SQLによる明示的な定義

Supabaseでは、ダッシュボード上のSQLエディタを用いて、標準的なSQLでテーブルを定義します。

**`supabase/schema.sql`**

```sql
-- \`tasks\`テーブルのスキーマ定義
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
);

-- \`tasks\`テーブルの変更をリアルタイム機能で有効化
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
```

これは非常に標準的で、多くの開発者にとって馴染み深いアプローチです。

#### 型定義

Supabase CLIを使い、以下のコマンドで型定義ファイルを手動生成します。スキーマ変更時には再実行が必要です。

```bash
supabase gen types typescript --project-id <your-project-id> > src/types/supabase.ts
```

### Convex： TypeScriptによる宣言的な定義とライブリロード

Convexでは、コマンドラインでプロジェクトを初期化した後、 `npx convex dev` を実行します。 **このコマンドは、ViteやNext.jsの開発サーバーのように、 `convex/` ディレクトリ内のファイルの変更を常に監視します。**

開発者は `convex/schema.ts` ファイルを編集して **保存するだけ** で、変更が即座に開発用バックエンドに反映されます。

**`convex/schema.ts`**

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // "tasks"テーブルのスキーマをオブジェクトとして定義
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
  }),
});
```

SQLやGUIを介さず、スキーマをコードとして管理できる上に、 **ファイルを保存するだけで自動的にバックエンドが更新される** ライブリロード体験は、Convexの大きな特徴です。

#### 型定義

Convexの型定義は完全に自動化されています。

開発者が `schema.ts` やサーバー関数（例: `convex/tasks.ts` ）を保存すると、 `npx convex dev` プロセスがそれを検知し、即座に `convex/_generated/api.ts` というファイルを自動で更新します。

このファイルには、全てのAPI（クエリとミューテーション）の型情報が完璧に反映されています。そのため、開発者はフロントエンドで以下のようにAPIを呼び出すだけで、何もせずとも完全なエンドツーエンドの型安全性を享受できます。

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api"; // 自動生成されたAPI

// 'tasks'の型も、'api.tasks.get'の返り値の型も、全て推論される
const tasks = useQuery(api.tasks.get);
```

## 検証2：DBマイグレーションのワークフロー比較

アプリケーションを運用していく上で、スキーマの変更、いわゆる「データベースマイグレーション」は避けて通れないプロセスです。ここでは、フィールド（カラム）を追加する際の開発ワークフローを比較します。

### Supabase： 差分からマイグレーションファイルを「生成」する

Supabaseは、より伝統的で堅牢なマイグレーションワークフローを `Supabase CLI` を通じて提供します。ローカルのデータベースに対する変更の **差分（diff） **を検知し、SQLのマイグレーションファイルを** 自動で生成** するアプローチです。

**ワークフロー:**

1. **ローカル開発環境を起動します。**
	```bash
	supabase start
	```
2. **ローカルDBのスキーマを直接変更します。**
	```sql
	ALTER TABLE tasks ADD COLUMN priority TEXT;
	```
3. **差分からマイグレーションファイルを生成します。**
	```bash
	supabase db diff --file add_priority_to_tasks
	```
4. **リモートDBに変更を適用します。**
	```bash
	supabase db push
	```

### Convex： ファイルを「保存するだけ」のライブマイグレーション

Convexの開発体験は、フロントエンドのホットリロードに酷似しています。

**ワークフロー:**

1. **`npx convex dev` を実行したまま** 、 `convex/schema.ts` ファイルを編集します。
	```typescript
	// convex/schema.ts
	// ...
	export default defineSchema({
	  tasks: defineTable({
	    text: v.string(),
	    isCompleted: v.boolean(),
	    priority: v.optional(v.string()), // 項目を追加して保存
	  }),
	});
	```
2. **ファイルを保存します。**

これだけです。 `convex dev` プロセスが変更を検知し、自動で開発用バックエンドにプッシュしてくれます。CI/CDパイプラインや手動で本番環境にデプロイする際は `npx convex deploy` コマンドを使用しますが、開発中のイテレーションは驚くほど高速です。

Supabaseの差分ベースのワークフローは、変更履歴がSQLファイルとして明確に残り、再現性やロールバックの容易さという点で優れています。しかし、開発中の試行錯誤においては、Convexのライブリロードの手軽さに軍配が上がると言えるでしょう。

## 検証3：リアルタイム実装のコード比較

Reactコンポーネントにおけるリアルタイム機能の実装コードを比較します。

### Supabase： 手続き的アプローチによるリアルタイム購読

`useEffect` フック内でリアルタイム更新の購読を手続き的に記述するのが一般的なパターンです。

**`src/components/TodoAppSupabase.tsx`**

このアプローチは柔軟性が高い一方で、リアルタイム機能を実装するコンポーネントが増えるほど、同様の定型的なコードが増加する傾向にあります。

### Convex： 宣言的アプローチによるリアクティビティ

`useQuery` フックでデータを「宣言」するだけで、リアルタイムのデータ購読とUIの自動更新が完了します。

**`src/components/TodoAppConvex.tsx`**

```tsx
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function TodoAppConvex() {
  const tasks = useQuery(api.tasks.get);
  const addTask = useMutation(api.tasks.addTask);
  // ... (以下、フォームのロジックとJSX)
}
```

`useEffect` が不要なため、コンポーネントはUIロジックに集中でき、非常に見通しが良いコードになります。

## 考察：リアクティブアーキテクチャが支えるConvexのシンプルさ

Convexのリアクティブな仕組みは、開発者を手動での状態管理から解放し、コードを劇的に簡潔にします。 `useQuery` フックは「 **データの購読宣言** 」であり、サーバーがデータ変更を検知して自動的に更新をプッシュします。開発者は手動での状態同期ロジックから解放されます。

## ユースケースと選定基準

今回の検証から、両プラットフォームにはそれぞれ明確な強みがあることがわかりました。

### Supabaseが適するケース

- SQLを活用した複雑な機能が必要
- 厳格なマイグレーション管理が求められる
- オープンソースやセルフホスティングを優先

### Convexが適するケース

- ライブリロードによる高速開発を重視する
- リアルタイムがアプリの中心要素
- TypeScriptによる一貫した型安全性

**2025年6月20日追記**

- Convexでも2025年2月からセルフホスティングが可能になったとご指摘をいただきました。詳しくは [こちらの記事](https://news.convex.dev/self-hosting/) をご参照ください

## まとめ

Convexのリアクティブでシンプルな開発体験と、Supabaseの堅牢で柔軟なSQLエコシステムは、それぞれの強みを持っています。プロジェクトの特性やチームのニーズに応じて、最適な選択を行いましょう。

56

14

56

14