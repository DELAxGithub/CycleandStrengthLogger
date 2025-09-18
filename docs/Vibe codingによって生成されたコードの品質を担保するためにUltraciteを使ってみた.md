---
title: "Vibe codingによって生成されたコードの品質を担保するためにUltraciteを使ってみた"
source: "https://zenn.dev/bita/articles/df3e289155005d"
author:
  - "[[Zenn]]"
published: 2025-08-08
created: 2025-09-18
description:
tags:
  - "clippings"
---
[![](https://storage.googleapis.com/zenn-user-upload/avatar/20d12cff94.jpeg)](https://zenn.dev/ri_0114)[シン](https://zenn.dev/ri_0114)

2025/08/08に公開

34

4[

![](https://storage.googleapis.com/zenn-user-upload/topics/f11c7465e5.png)

Cursor

](https://zenn.dev/topics/cursor)[

![](https://storage.googleapis.com/zenn-user-upload/topics/bf0d437ae5.png)

Claude Code

](https://zenn.dev/topics/claudecode)[

![](https://zenn.dev/images/topic.png)

Vibe Coding

](https://zenn.dev/topics/vibecoding)[

![](https://static.zenn.studio/images/drawing/tech-icon.svg)

tech

](https://zenn.dev/tech-or-idea)

# 背景

Cursor + Claude codeでVibe codingすると、AIにプロンプトを投げてから5分も待てばほぼプロンプトの要件を満たしているコードが生成されます。  
しかし生成されたコードを眺めてみると、

- 1ファイル300行以上
- ロジックが複雑
- アンチパターンを含んでいる  
	などの問題が見受けられました。  
	これらの問題を含んだコードは可読性が低く、微調整や修正を人の手で行う際に問題となる可能性があります。

故に、Vibe codingに一定のルールをつけられるツールをずっと探していました。  
自分の要望としては

- 複雑の設定不要
- 実行スピードが速い
- ずっと更新されてるもの

そんな中、XでUltraciteを知り、これが求めていたツールかもしれないと思いました。

# 本文の目的

- `Ultracite`の紹介
- `Ultracite`を使ってみて、Vibe codingの「動けばOK」という問題が解決されたかどうかを検証する

# Ultraciteとは

AI Readyの[Biome](https://biomejs.dev/)をベースにしたlintツールです。  
最近では知名度がどんどん上がっているReactのUIライブラリ`shadcn/ui`の作者にも[使われてます。](https://x.com/shadcn/status/1937342910519038142)  
\*Biomeはrustベースのlintツールです。

## Ultraciteの特徴

- Biomeベースなので実行スピードが速い
- zero configで設定可能
- MCPサポート
- VS Code、Cursor、Windsurf とClaude codeなどに対応していて、同じルールが適用されてる
- 自由にlintルールを変えることができる
- 成長が速い  
	![](https://storage.googleapis.com/zenn-user-upload/91019fc1343b-20250731.png)  
	*[npmtrends](https://npmtrends.com/ultracite)のデータ*

## Ultraciteを導入して試していきましょう

### 実行環境

- [Node.js](https://nodejs.org/) v22.16.0
- [pnpm](https://pnpm.io/) v10.14.0
- [Next.js](https://nextjs.org/) v15.4.5
- [shadcn/ui](https://ui.shadcn.com/)
- [@biomejs/biome](https://biomejs.dev/) v2.1.2
- [Ultracite](https://www.ultracite.ai/) v5.1.2

### Biomeの拡張機能をインストールする

以下のURLにてBiomeの拡張機能をインストールする。<iframe id="zenn-embedded__4157cc6b8665" src="https://embed.zenn.studio/card#zenn-embedded__4157cc6b8665" data-content="https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dbiomejs.biome" frameborder="0" scrolling="no" loading="lazy" height="122"></iframe>

\*インストールしない場合、ファイル保存時の自動formatが効かなくなります。この機能を必要としない方はインストールしなくても良いです。

### プロジェクト初期化

新規Next.jsプロジェクトを作ります。  
\*現時点ではReactとの相性が良いです、他のフレームワークとの相性は[こちら](https://biomejs.dev/ja/internals/language-support/)で確認できます。

```
pnpm create next-app@latest
# ESlintはNOにしてください、他の選択肢は任意で大丈夫です。
✔ What is your project named? … try-ultracite
✔ Would you like to use TypeScript? … No / Yes
✔ Would you like to use ESLint? … No / Yes #ここは必ずNOにしてください
✔ Would you like to use Tailwind CSS? … No / Yes
✔ Would you like your code inside a \`src/\` directory? … No / Yes
✔ Would you like to use App Router? (recommended) … No / Yes
✔ Would you like to use Turbopack for \`next dev\`? … No / Yes
✔ Would you like to customize the import alias (\`@/*\` by default)? … No / Yes
```

UIを統一するため、shadcn/uiをインストールします。  
ここは任意のUIライブラリも使用可能です、また、インストールしなくても大丈夫です。

```
pnpm dlx shadcn@latest init
✔ Preflight checks.
✔ Verifying framework. Found Next.js.
✔ Validating Tailwind CSS config. Found v4.
✔ Validating import alias.
✔ Which color would you like to use as the base color? › Neutral
✔ Writing components.json.
✔ Checking registry.
✔ Updating CSS variables in src/app/globals.css
✔ Installing dependencies.
✔ Created 1 file:
  - src/lib/utils.ts

Success! Project initialization completed.
You may now add components.
```

### Ultraciteの初期化

rootフォルダで`npx ultracite@latest init`を実行する。  
package managerを自動検知できるため、pnpm dlxなどの使用は不要です。

```
●  Detected lockfile, using pnpm add
│
◆  Which editors do you want to configure (recommended)?
│  ◼ VSCode / Cursor / Windsurf # スペースキーで選択可能です、半角スペース以外反応しないのでご注意ください。
│  ◻ Zed
#　以下の設定は自分の好みで行なってください、今回はCursorとClaude codeにします。
◇  Which editor rules do you want to enable (optional)?
│  Cursor, Claude Code
│
◇  Would you like any of the following (optional)?
│  none # huskyを設定できますが、今回はなしで
│
```

選択完了後に、以下のメッセージが自動的に出てきます。

```
◇  Dependencies installed
│
◇  tsconfig.json updated
│
◇  Biome configuration created
│
◇  settings.json created
│
◇  GitHub Copilot rules created
│
◇  Cursor rules created
│
◇  Claude Code rules created
│
◇  Pre-commit hook created
│
◇  lint-staged updated
│
◆  Successfully initialized Ultracite configuration!
```

### Ultracite mcpの設定

以下のjsonをmcp設定ファイルに追加する（mcp設定ファイルわからない場合、ご使用しているIDEの公式ドキュメントを参考にしてください）

```
{
  "mcpServers": {
    "ultracite": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://www.ultracite.ai/api/mcp/mcp"
      ]
    }
  }
}
```

claude codeの場合はプロジェクトのフォルダで以下のbashを実行してください

```
claude mcp add ultracite -s project -- npx -y mcp-remote https://www.ultracite.ai/api/mcp/mcp
```

### scriptsの設定

package.jsonに以下のコードを追加する。（既存ある場合は上書きしてください）

```
"scripts": {
    "lint": "ultracite lint",　
    "format": "ultracite format"
}
```

`lint`はコードのチェックだけ行います。  
`format`はコードのチェックと同時にコードのチェックツールのルールに沿って、自動修正も行います。

### shadcn/uiを対象外にする

shadcn/uiのコンポーネントをlint対象外にする

biome.jsonc

```
{
  "$schema": "https://biomejs.dev/schemas/2.1.2/schema.json",
  "extends": ["ultracite"],
  "files": {
    "includes": ["**", "!**/src/components/ui/**/*.tsx"]
  }
}
```

はい、これで設定完了です！

### 使い方

- 構文チェックツールとして使いたい時
	- 拡張機能をインストールしている場合、保存時にformatを実行してくれます。
	- 全ファイルをlintやformatしたい場合、  
		`npx ultracite lint`または`npx ultracite format`を実行してください。
- Vibe codingする時  
	AI rulesは初期化の時に設定されたと思います。  
	ですが、念の為Vibe codingを始める際に以下のようなことを伝えると良いと思います。
	- `use Ultracite rule from mcp server`
	- `mcpからUltraciteのルールを取得し、ルールに従ってコードを書いてください`

これで、AIが常にベストプラクティスに沿ってコードを書いてくれます！

### ルール取得できるかどうかを検証するため、Claude codeに簡単なPromptを渡します

プロンプト

```
use Ultracite rule from mcp

create a todo app\
  - use motion/react to create animation\
  - todo card can be dropped\
  - use shadcn/ui
```

上記のプロンプトをAIに渡したら無事にUltraciteからルールを取得できました。

```
# AIレスポンスの一部抜粋
> get ultracite rule
  ⎿  - Don't use \`accessKey\` attribute on any HTML element.                             
     - Don't set \`aria-hidden="true"\` on focusable elements.
     - Don't add ARIA roles, states, and properties to elements that don't support them.
     … +268 lines (ctrl+r to expand)
```

完成後は自動的にlintとformatしてくれます

```
⏺ Bash(pnpm lint)
  ⎿  Error: npm warn Unknown env config "verify-deps-before-run". This will stop working in the next major version of npm.
     npm warn Unknown env config "_jsr-registry". This will stop working in the next major version of npm.
     .claude/settings.local.json format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

       × Formatter would have printed the following content:
       
         10 10 │     },
         11 11 │     "enableAllProjectMcpServers": true,
         12    │ - ··"enabledMcpjsonServers":·[
         13    │ - ····"ultracite"
     … +244 lines (ctrl+r to see all)

⏺ I need to format the code to fix the linting issues:

⏺ Bash(pnpm format)
  ⎿  > try-ultracite@0.1.0 format /Users/rishinnan/Downloads/myproj/todo/try-ultracite
     > ultracite format
     … +3 lines (ctrl+r to expand)

⏺ Now let's run the lint check again:

⏺ Bash(pnpm lint)
  ⎿  > try-ultracite@0.1.0 lint /Users/rishinnan/Downloads/myproj/todo/try-ultracite
     > ultracite lint
     … +3 lines (ctrl+r to expand)
```

\*コードはルールに従って書いてくれましたが、量が多いため、記事には載せないようにします、興味ある方はぜひ自分で試してみてください。

## 最後に

実際に検証してみた結果、Ultraciteを使うことでVibe codingの出力品質が大幅に改善されました。AIが生成するコードも一貫したルールに従うようになり、後からの読み解きが格段に楽になります。  
また、vibe codingしなくてもUltraciteはlintツールとしても使えるので、今後、個人プロジェクトではUltraciteを採用したいと思います。  
興味のある方は、公式ドキュメントを参考に、ぜひ使ってみてください。  
最後まで読んでいただきありがとうございました！