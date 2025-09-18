
アプリケーション技術仕様書：Cycle & Strength Logger (Flutter & Firebase版)
1. 概要
 * アプリ名: Cycle & Strength Logger
 * 目的: サイクリストのサイクリングと筋力トレーニングの記録をサポートし、成長の可視化を通じて目標達成を支援する。
 * 対象プラットフォーム: iOS, Android (単一コードベースでFlutterが両OS向けにビルド)
2. 開発方針・技術スタック
| カテゴリ | 技術選定 | 理由 |
|---|---|---|
| フロントエンド | Flutter | Google製のUIツールキット。単一のコードでiOS/Android両方の高性能で美しいネイティブアプリをビルド可能。開発速度と表現力を両立できる。 |
| バックエンド (BaaS) | Firebase | Googleのモバイルアプリ開発プラットフォーム。サーバー構築不要で、認証・データベース・ストレージなどの機能を迅速に実装できる。 |
| データベース | Cloud Firestore | FirebaseのNoSQLデータベース。リアルタイムでのデータ同期と強力なオフライン機能を標準でサポート。ユーザーのワークアウトデータを柔軟に格納できる。 |
| ユーザー認証 | Firebase Authentication | Google, Apple, メールなど多様なログイン方法を安全かつ容易に実装できる。 |
| 状態管理 (Flutter) | Riverpod | Flutterアプリ内のデータ状態を効率的かつ安全に管理するためのライブラリ。シンプルで宣言的な記述が可能で、テストもしやすい。 |
| グラフ描画 | fl_chart | Flutterで美麗なグラフを実装するための人気ライブラリ。トレーニングデータの可視化に利用する。 |
3. 機能要件
以前の仕様書から変更はありませんが、Firebaseの機能を前提とした実装方法を追記します。
| ID | 機能名 | 実装詳細 |
|---|---|---|
| F-01-01 | ユーザー認証 | Firebase Authentication を利用。<br>・Sign in with Google<br>・Sign in with Apple<br>の2つのソーシャルログインを実装する。 |
| F-02-02 | アクティビティ履歴 | Cloud Firestore からユーザーのワークアウトデータをリアルタイムでストリーム取得し、ListView.builder で効率的に表示する。 |
| F-03-02 | ワークアウト記録 | ユーザーが入力したデータを Cloud Firestore のworkouts サブコレクションにドキュメントとして新規作成する。 |
| F-04-03 | グラフ表示 | Firestoreから取得したデータを加工し、fl_chart ライブラリを用いてグラフを描画する。 |
4. データベース設計案 (Cloud Firestore)
FirestoreのNoSQLモデルを活かし、以下のような階層構造でデータを保存します。
users (collection)
└── {userId} (document)
    ├── userName: "Taro Yamada"
    ├── email: "taro@example.com"
    │
    └── workouts (sub-collection)
        ├── {workoutId_1} (document)
        │   ├── type: "cycling"
        │   ├── date: Timestamp
        │   ├── duration: 5400 (seconds)
        │   ├── distance: 45.2 (km)
        │   ├── avgPower: 150 (watts)
        │   └── memo: "追い風で気持ちよかった"
        │
        └── {workoutId_2} (document)
            ├── type: "strength"
            ├── date: Timestamp
            └── exercises: [
                    {
                        name: "スクワット",
                        sets: [
                            { weight: 60, reps: 10 },
                            { weight: 60, reps: 10 }
                        ]
                    },
                    {
                        name: "デッドリフト",
                        sets: [
                            { weight: 80, reps: 8 }
                        ]
                    }
                ]

5. 非機能要件
| ID | 要件名 | 詳細 |
|---|---|---|
| NF-01 | パフォーマンス | Flutterのレンダリングエンジンを活かし、60fpsのスムーズなUI操作を実現する。 |
| NF-02 | UI/UXデザイン | Material Design 3 をベースとし、直感的で分かりやすいインターフェースを構築する。 |
| NF-03 | オフライン対応 | Cloud Firestoreのオフラインキャッシュ機能を有効にする。これにより、ユーザーはインターネット接続がない場所でもワークアウトを記録でき、接続が回復次第、データは自動でクラウドに同期される。 |
| NF-04 | データ同期 | ユーザーが複数のデバイス（iPhoneとiPadなど）でログインした場合でも、Firestoreのリアルタイム同期機能によりデータは常に最新の状態に保たれる。 |
6. 開発マイルストーン（推奨手順）
 * Phase 1: 環境構築と認証
   * Flutter開発環境をセットアップ。
   * Firebaseプロジェクトを作成し、Flutterアプリと連携。
   * Firebase Authenticationによるログイン・ログアウト機能を実装。
 * Phase 2: CRUD機能の実装
   * ワークアウト記録用の入力フォーム画面をUIとして作成。
   * Firestoreへのデータ保存（Create）、読み取り（Read）、更新（Update）、削除（Delete）のロジックを実装。
 * Phase 3: データ可視化
   * ダッシュボード画面と分析画面をUIとして作成。
   * Firestoreから取得したデータをfl_chartを使ってグラフとして表示する機能を実装。
 * Phase 4: テストとリリース
   * iOSシミュレータおよびAndroidエミュレータでの動作確認。
   * 実機テスト（TestFlight, Google Play Internal Testing）。
   * App Store ConnectおよびGoogle Play Consoleへの申請準備とリリース。
この仕様書は、Flutter/Firebaseでの開発経験があるエンジニアが見れば、すぐに開発に着手できるレベルの具体性を持たせたものです。ノーコードに比べて自由度と拡張性が格段に高いため、将来的な機能追加にも柔軟に対応できます。
