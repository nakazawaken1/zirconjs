# 自分だけのプログラミング言語を実装しよう

## 準備するもの

PC:　Windows, Mac, Linux なんでもOK
ブラウザ: Chrome, Safari, Edge, Firefox, Brave等のモダンブラウザ
テキストエディタ: Visual Studio Code がおすすすめ。メモ帳でも可能

## 作成の流れ

大枠としては、まずUIを作成し、四則演算に対応後、FizzBuzzを実行できる処理系としていく

1. ソースがそのまま実行結果になる環境を HTML ベースの UI で作る
   1. 構成要素は ソース入力枠、実行ボタン、実行結果枠
2. 自作言語の解析処理(parse)と実行処理(run)を作成
   1. ソース入力枠に数値を入れ実行ボタンを押せば実行結果枠にその数値が表示される動きを実装
3. テストコードを入力し動作確認
4. 自動テストの仕組みを追加
   1. ソースと期待する実行結果のセットをテスト枠に入力してテストボタンを押すと順番に実行し、期待する実行結果と不一致なものがあれば色分け表示する
5. 加算に対応
   1. BNFを考える
   2. parseを拡張
   3. runを拡張
6. 乗算に対応
   1. BNFを考える
   2. parseを拡張
   3. runを拡張
   4. 演算子順位法の導入 https://tociyuki.hatenablog.jp/entry/20130318/1363582938
7. 四則演算に対応
   1. BNFを考える
   2. parseを拡張
   3. runを拡張
8. 剰余・冪乗演算に対応
   1. BNFを考える
   2. parseを拡張
   3. runを拡張
9.  符号に対応
   1. BNFを考える
   2. parseを拡張
   3. runを拡張
10. 括弧に対応
   1. BNFを考える
   2. parseを拡張
   3. runを拡張
11. 複数式に対応
   1. BNFを考える
   2. parseを拡張
   3. runを拡張
12. 出力に対応
   1. BNFを考える
   2. parseを拡張
   3. runを拡張
13. 変数に対応（代入と参照）
   1. BNFを考える
   2. parseを拡張
   3. runを拡張
14. 関数に対応（定義と呼び出し）
   1. BNFを考える
   2. parseを拡張
   3. runを拡張：スコープの実現
   4. 再帰呼び出しのテスト
   5. レキシカルスコープ対応
15. 条件分岐に対応
   1. BNFを考える
   2. parseを拡張
   3. runを拡張
   4. 真偽値を追加(true, false)
   5. 論理式を追加(>, >=, =, <>, <=, <, and, or, not)
16. 文字型に対応
   1. BNFを考える
   2. parseを拡張
   3. runを拡張
17. 繰り返しに対応
   1. BNFを考える
   2. parseを拡張
   3. runを拡張
18. 配列に対応（定義と参照）
   1. BNFを考える
   2. parseを拡張
   3. runを拡張

TODO
 - <script>タグでの実行対応
 - node での実行対応
 - javascriptへのトランスパイル
 - javaへのトランスパイル
 - import, export
 - APIサーバ実装
