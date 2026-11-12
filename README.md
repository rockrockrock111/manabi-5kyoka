# まなび直し 5教科（Web公開版 v0.3）

## 内容
- 小学校基礎と中学1〜3年の5教科、501問のオリジナル例題
- 今回は中1数学7単元に各25問、英語10単元に各20問、計375問を追加
- 既存126問のID・内容、学習記録・復習・バックアップの保存形式を維持
- 学年・教科・単元別JSON、難易度（基本・標準・入試）、単元一覧で未収録を表示
- 標準・入試問題、他学年・教科は今後の拡充対象。全範囲や全技能の網羅は未完了

[単元対応表・収録件数・追加手順](docs/curriculum.md)

## 公開方法（GitHub Pages / GitHub Actions）
1. この内容を `rockrockrock111/manabi-5kyoka` の `main` ブランチに push します。
2. GitHub の Settings → Pages → Build and deployment → Source を **GitHub Actions** に設定します。
3. Actions の **Deploy GitHub Pages** を開き、必要なら Run workflow → main を選択します。
4. デプロイ成功後の URL は `https://rockrockrock111.github.io/manabi-5kyoka/` です。環境の承認待ちが表示された場合は、権限のある管理者が承認します。

ワークフローは構文・問題データを検証し、公開対象のアプリ資産と分割問題データだけをアーティファクトにコピーします。学習記録、バックアップ、開発用ファイルは配信しません。リポジトリにも学習記録・個人情報をコミットしないでください。

## 開発・検証
依存パッケージやビルドは不要です。`python3 -m http.server 8000` で起動します。
CSS は `index.html` 内にあり、JavaScript・問題データ・manifest・アイコンは相対パスです。PWA は HTTPS または localhost で登録され、同じオリジン内の他アプリのキャッシュを削除しません。

ローカルの `/manabi-5kyoka/` 配信で、中1〜中3 × 5教科の全15組み合わせ、回答、間違いの記録、復習予定更新、基礎単元への移動、再読み込み後の記録保持、幅320pxの表示、PWAオフライン再読み込みを確認しています。公開環境での確認はデプロイ成功後に別途必要です。

**注意**: 公開リポジトリのファイルは誰でも閲覧できます。問題データのみアップロードし、子どもの名前・成績・個人情報・バックアップJSONは絶対にアップロードしないでください。

## 重要な制約
- **端末間の自動同期は未実装**。学習記録はブラウザのlocalStorageに保存。バックアップJSONを使って手動で移行できます。
- **全教科書範囲を網羅していません**。中1数学・英語の基本を中心に拡張中の実用ベータ版です。問題数と質の拡充が必要です。
- 診断は学力の目安で、偏差値や正式な学力検査の代わりにはなりません。
- サイトのURL公開作業はユーザーのGitHubアカウントで行ってください。ここでは公開済みURLは作成していません。
- オフライン利用はPWAとして読み込み済み資産をキャッシュした場合のみ。記録はブラウザデータ削除で失われる可能性があります。

## 将来の同期対応
保護者・子ども端末の同期には Firebase / Supabase などの認証・データベースが必要です。未成年者の学習記録のため、公開DBや匿名の読み書き権限は使用せず、親子アカウント・アクセス制御・削除機能を設計してください。

## テスト
```sh
node --check app.js
node --check question-bank.js
node --check sw.js
python3 -m unittest discover -s tests -v
python3 scripts/prepare_site.py
# Playwrightを用意した環境で（CIでは1.56.1に固定）
node tests/browser.cjs
# 既存のChromiumを使う場合
CHROMIUM_PATH=/usr/bin/chromium node tests/browser.cjs
```
ブラウザテストは自分で一時HTTPサーバーを起動し、`/manabi-5kyoka/` 配下を検証します。テスト用学習記録は架空で、公開ファイルには含みません。

PRと作業ブランチでは `Validate question bank` のみ実行し、公開サイトは更新しません。Pagesデプロイは `main` 限定です。`questions.json` は旧クライアント移行用で、新規問題は `data/questions/` に追加します。

## ローカル確認
PythonがあるPCでこのフォルダを開き `python -m http.server 8000` を実行し、PCのブラウザで `http://localhost:8000/` にアクセス。
