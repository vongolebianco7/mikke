# Mikke Universal Watch — Design Spec

Date: 2026-09-28

## Goal
Mikkeを「買い物セール監視」から、商品・航空券・ホテルなどの条件を継続監視する汎用Watchアプリへ拡張する。

## Product principle
ユーザーは『何を探すか』ではなく『どんな条件になったら知りたいか』を自然文で登録する。
Mikkeは条件を構造化し、データソースを定期確認し、意味のある変化だけ通知する。

## Initial scope
Phase 1:
- Shopping Watch
  - Rakuten Ichiba API
  - Yahoo! Shopping API
- Shared Watch engine
- Watch history / diff
- Trigger evaluation
- Notification event generation

Phase 2:
- Flight Watch
- Hotel Watch

Phase 3:
- Tickets / cars / additional commerce connectors based on demand

## Constraints
- 無料運営を優先。従量課金APIを必須にしない。
- 公式API・許可されたデータソースを優先。
- スクレイピングは利用規約・robots・アクセス負荷を個別確認し、必要箇所だけ限定利用。
- 外部サービスへの多重アクセスを避ける。
- iPhoneを主利用環境とする。
- ユーザー確認待ちで日常的に止まらない設計にする。

## Core architecture

### Watch
共通Watchモデル:
- id
- type: shopping | flight | hotel | ticket | car | generic
- title
- raw_query
- normalized_conditions (JSON)
- required_conditions
- preferred_conditions
- status
- check_interval
- created_at / updated_at

### Connector interface
各カテゴリは共通インターフェースを実装する。

- validate(watch)
- search(watch)
- normalize(raw_result)
- evaluate(result, watch)
- fingerprint(result)

これによりUI・履歴・通知はカテゴリ共通化し、データ取得だけを差し替える。

### Observation
各チェック結果を保存:
- watch_id
- source
- item_fingerprint
- observed_at
- price / availability / attributes
- raw_snapshot_hash

### Event
前回観測との差分からイベントを生成:
- condition_match
- price_drop
- new_low
- restock
- new_result
- meaningful_change

通知はEventから生成し、細かな変動は抑制する。

## UX
### Today
重要な変化だけ表示。
- 買い時 / 条件成立
- 新着
- 惜しい
- 変化なしは原則表示しない

### Create Watch
自然文入力 → 構造化条件確認 → Watch開始。
初期版は生成AI APIを必須にせず、カテゴリ別ルール・辞書・正規表現を中心に構造化する。

Examples:
- 「New Balance 996、24.5cm、グレー、1万円以下」
- 「東京からホノルル、直行便、往復10万円以下」
- 「軽井沢、10/26、2万円以下、赤ちゃん連れ向き」

## MVP technology target
- Frontend: Next.js / TypeScript
- DB: Supabase PostgreSQL (free tier)
- Scheduling: GitHub Actions or Vercel Cron free allowance where possible
- Hosting: Vercel free tier
- Shopping APIs: Rakuten Ichiba API + Yahoo! Shopping API
- Notifications: in-app first; email/Web Push added after core monitoring is stable

The first vertical slice may remain dependency-free while the domain and UX are validated; framework/server migration must preserve the Watch/Event interfaces.

## Autonomous development policy
Implementation decisions that do not alter the product concept should be made autonomously.
User review is only required for irreversible external-account setup / credentials, legal or paid-service decisions, major product-concept changes, or final public release.
