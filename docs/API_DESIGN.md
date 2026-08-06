# Aula API設計書

## 1. 概要

本書はAula（珈琲・俺 シフト調整アプリ）のREST APIを、[db.md](./db.md)に対応させて定義する。Google Calendar連携は今回の対象外とし、大学学年暦のICS取込は内部機能として残す。

- ベースパス: `/api/v1`
- API形式: REST / JSON
- 実行基盤: Cloudflare Workers + Hono
- DB: Cloudflare D1（Binding: `DB`）
- 認証: Cloudflare Access
- 日時: ISO 8601 UTC
- 日付: `YYYY-MM-DD`
- 業務タイムゾーン: `Asia/Tokyo`
- ID: UUID v4
- JSON項目: camelCase

Firebase Authentication、Firestore、Firebase Hostingは廃止する。Firestoreの動的コレクションは、D1の固定テーブルへ正規化して移行する。

### 1.1 構成

```text
Browser
  -> Cloudflare Access
  -> Cloudflare Worker
       |- /api/v1/*  Hono REST API
       |- /*          React SPA
       `- DB          Cloudflare D1
```

## 2. 認証・認可

### 2.1 認証

Cloudflare Access通過後、Workerは次のJWTを検証する。

```http
Cf-Access-Jwt-Assertion: <cloudflare-access-jwt>
```

署名、`iss`、`aud`、有効期限を検証し、JWTの`sub`を`users.access_subject`、検証済み`email`を`users.email`へ対応させる。クライアントはこれらを指定・変更できない。

| Method | Path | 権限 | 用途 |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Public | WorkerとD1の死活監視 |
| `GET` | `/api/v1/auth/session` | Authenticated | 認証主体とプロフィール状態 |
| `GET` | `/cdn-cgi/access/logout` | Authenticated | Accessセッション終了 |

`GET /api/v1/auth/session`はプロフィール未作成でも`200`を返す。

```json
{
  "data": {
    "authenticated": true,
    "identity": { "email": "member@example.com" },
    "hasProfile": false,
    "user": null
  }
}
```

### 2.2 権限

| 権限 | 条件 |
| --- | --- |
| Public | 認証不要。ヘルスチェックのみ |
| Authenticated | Access JWT検証済み。プロフィール未作成を含む |
| Member | `users`にプロフィールが存在する |
| Admin | `users.is_admin = 1` |

- Memberは自分のプロフィール、回答、確定割当を操作・参照できる。
- Adminはユーザー、会員区分、業務イベント、シフト、全回答、確定割当、学年暦を管理できる。
- 本人用APIから`isAdmin`、`email`、`accessSubject`は変更できない。
- 最後のAdmin権限を外す操作は禁止する。

## 3. 共通仕様

### 3.1 成功レスポンス

単一リソース:

```json
{ "data": { "id": "f547e2b8-459f-49a1-82ea-0191cd162218" } }
```

一覧:

```json
{
  "data": [],
  "pagination": {
    "nextCursor": null,
    "hasNext": false,
    "limit": 20
  }
}
```

一覧はカーソル方式とする。`limit`の既定値は20、最大値は100とする。

### 3.2 HTTPメソッドとステータス

| CRUD | Method | 成功時 |
| --- | --- | --- |
| Create | `POST` | `201 Created` |
| Read | `GET` | `200 OK` |
| Update（部分） | `PATCH` | `200 OK` |
| Update（全置換） | `PUT` | `200 OK` |
| Delete | `DELETE` | `204 No Content` |

- 作成APIは`Idempotency-Key`ヘッダーを受け付ける。
- `version`列があるリソースの更新では本文の`version`を必須とする。
- 現在のversionと一致しない場合は`409 VERSION_CONFLICT`を返す。

### 3.3 エラー

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容を確認してください。",
    "details": [
      { "field": "endDate", "reason": "startDate以降を指定してください。" }
    ],
    "requestId": "req_01J4J8Y9P6F7W4M2J89DZQH32B"
  }
}
```

| HTTP | コード例 | 用途 |
| --- | --- | --- |
| `400` | `INVALID_REQUEST` | JSON・クエリ不正 |
| `401` | `UNAUTHENTICATED` | 未認証 |
| `403` | `FORBIDDEN` | 権限不足 |
| `404` | `RESOURCE_NOT_FOUND` | 対象なし |
| `409` | `RESOURCE_CONFLICT` | 重複・状態・version競合 |
| `422` | `VALIDATION_ERROR` | 項目・業務ルール違反 |
| `429` | `RATE_LIMITED` | レート制限 |
| `500` | `INTERNAL_ERROR` | 想定外エラー |

## 4. DBとAPIリソースの対応

| D1テーブル | APIリソース | API識別子 |
| --- | --- | --- |
| `cafeore_statuses` | CafeoreStatus | `statusId` |
| `users` | User | `userId` |
| `events` | Event | `eventId` |
| `event_positions` | EventPosition | `positionId` |
| `shifts` | Shift | `shiftId` |
| `slots` | Slot | `slotId` |
| `shift_responses` | ShiftResponse | `responseId` |
| `shift_response_slots` | ShiftResponseAnswer | `(responseId, slotId)` |
| `confirmed_assignments` | ConfirmedAssignment | `assignmentId` |
| `academic_calendars` | AcademicCalendar | URLの`year`で解決 |
| `calendar_imports` | CalendarImport | `importId` |
| `calendar_events` | AcademicCalendarEvent | `eventId` |
| `academic_calendar_days` | AcademicCalendarDay | `(year, date)` |

Occurrence、日付イベント中間表、イベント変更履歴は内部派生・監査データのため、独立した更新APIを公開しない。

## 5. データモデル

### 5.1 User

```json
{
  "userId": "f547e2b8-459f-49a1-82ea-0191cd162218",
  "name": "山田 太郎",
  "displayName": "山田",
  "email": "member@example.com",
  "entranceYear": 2025,
  "photoUrl": null,
  "cafeoreStatusId": "trainee-first-year",
  "isAdmin": false,
  "isGraduated": false,
  "createdAt": "2026-08-06T01:23:45Z",
  "updatedAt": "2026-08-06T01:23:45Z",
  "lastLoginAt": "2026-08-06T01:23:45Z",
  "version": 1
}
```

### 5.2 Shift

```json
{
  "shiftId": "3f51d488-eae6-46f5-86c8-f770025b09ed",
  "year": 2026,
  "semester": "spring",
  "module": "B",
  "startDate": "2026-05-11",
  "endDate": "2026-06-28",
  "requiredSessionsPerWeek": 2,
  "isVacation": false,
  "isOpen": true,
  "createdAt": "2026-04-01T00:00:00Z",
  "updatedAt": "2026-04-01T00:00:00Z",
  "version": 1
}
```

`semester`は`spring | summer | autumn`、`module`は`A | B | C | 正の整数文字列`とする。

### 5.3 Slot

```json
{
  "slotId": "0ab88bad-118f-4590-a0bb-45eaeeacdf20",
  "shiftId": "3f51d488-eae6-46f5-86c8-f770025b09ed",
  "eventId": "46bfc55f-d80d-4a15-bfd2-f31c6ddac52f",
  "positionId": "7022f78f-339d-41d5-bca8-d5817433e303",
  "dayOfWeek": 1,
  "period": 1,
  "displayOrder": 10,
  "startTime": "08:40:00",
  "endTime": "09:55:00",
  "version": 1
}
```

`dayOfWeek`は`1=月曜 ... 7=日曜`とする。

### 5.4 ShiftResponse

```json
{
  "responseId": "ac52f5e4-4cb2-4568-a133-9e7cd93bff55",
  "shiftId": "3f51d488-eae6-46f5-86c8-f770025b09ed",
  "userId": "f547e2b8-459f-49a1-82ea-0191cd162218",
  "frequency": "TWICE_WEEKLY",
  "comment": "水曜日を希望します。",
  "answers": [
    {
      "slotId": "0ab88bad-118f-4590-a0bb-45eaeeacdf20",
      "isAvailable": true
    }
  ],
  "submittedAt": "2026-04-05T01:00:00Z",
  "updatedAt": "2026-04-05T01:00:00Z",
  "version": 1
}
```

`frequency`は`ONCE_WEEKLY | TWICE_WEEKLY | EXAMINER`とする。Response本体は`shift_responses`、各枠の回答は`shift_response_slots`へ保存する。

### 5.5 ConfirmedAssignment

```json
{
  "assignmentId": "e0179cec-dad0-4fbc-9002-b7ce1c78433d",
  "slotId": "0ab88bad-118f-4590-a0bb-45eaeeacdf20",
  "userId": "f547e2b8-459f-49a1-82ea-0191cd162218",
  "confirmedBy": "admin-user-id",
  "confirmedAt": "2026-04-10T01:00:00Z"
}
```

## 6. API一覧

### 6.1 ユーザー

| CRUD | Method | 完全パス | 権限 | 用途 |
| --- | --- | --- | --- | --- |
| Create | `POST` | `/api/v1/users/me` | Authenticated | 自分のプロフィール作成 |
| Read | `GET` | `/api/v1/users/me` | Member | 自分のプロフィール取得 |
| Update | `PATCH` | `/api/v1/users/me` | Member | 自分のプロフィール更新 |
| Delete | `DELETE` | `/api/v1/users/me` | Member | 未使用プロフィールを削除 |
| Read | `GET` | `/api/v1/users` | Admin | ユーザー一覧 |
| Read | `GET` | `/api/v1/users/{userId}` | Admin | ユーザー詳細 |
| Update | `PATCH` | `/api/v1/users/{userId}` | Admin | 会員区分・権限・卒業状態更新 |
| Delete | `DELETE` | `/api/v1/users/{userId}` | Admin | 未参照ユーザーを削除 |

プロフィール作成本文:

```json
{
  "name": "山田 太郎",
  "displayName": "山田",
  "entranceYear": 2025,
  "photoUrl": null,
  "cafeoreStatusId": "trainee-first-year"
}
```

`email`と`accessSubject`はAccess JWTから設定する。関連する回答・割当・監査履歴があるユーザーのDELETEは`409 USER_IN_USE`とし、通常はAdminが`isGraduated = true`へ更新する。

`GET /api/v1/users`のクエリ:

| Query | 内容 |
| --- | --- |
| `cursor`, `limit` | ページング |
| `statusId` | 会員区分 |
| `isAdmin` | Adminか |
| `isGraduated` | 卒業済みか |
| `entranceYear` | 入学年度 |
| `q` | 氏名・表示名・メール部分一致 |

### 6.2 会員区分

| CRUD | Method | 完全パス | 権限 | 用途 |
| --- | --- | --- | --- | --- |
| Create | `POST` | `/api/v1/cafeore-statuses` | Admin | 会員区分作成 |
| Read | `GET` | `/api/v1/cafeore-statuses` | Member | 会員区分一覧 |
| Read | `GET` | `/api/v1/cafeore-statuses/{statusId}` | Member | 会員区分詳細 |
| Update | `PATCH` | `/api/v1/cafeore-statuses/{statusId}` | Admin | 会員区分更新 |
| Delete | `DELETE` | `/api/v1/cafeore-statuses/{statusId}` | Admin | 未参照区分削除 |

作成本文:

```json
{
  "name": "1年目練習生",
  "isFirstYear": true,
  "isExaminer": false,
  "isApprentice": true
}
```

### 6.3 業務イベント・担当区分

| CRUD | Method | 完全パス | 権限 | 用途 |
| --- | --- | --- | --- | --- |
| Create | `POST` | `/api/v1/events` | Admin | 業務イベント作成 |
| Read | `GET` | `/api/v1/events` | Member | 業務イベント一覧 |
| Read | `GET` | `/api/v1/events/{eventId}` | Member | 業務イベント詳細 |
| Update | `PATCH` | `/api/v1/events/{eventId}` | Admin | 業務イベント更新 |
| Delete | `DELETE` | `/api/v1/events/{eventId}` | Admin | 未参照イベント削除 |
| Create | `POST` | `/api/v1/events/{eventId}/positions` | Admin | 担当区分作成 |
| Read | `GET` | `/api/v1/events/{eventId}/positions` | Member | 担当区分一覧 |
| Read | `GET` | `/api/v1/events/{eventId}/positions/{positionId}` | Member | 担当区分詳細 |
| Update | `PATCH` | `/api/v1/events/{eventId}/positions/{positionId}` | Admin | 担当区分更新 |
| Delete | `DELETE` | `/api/v1/events/{eventId}/positions/{positionId}` | Admin | 未参照担当区分削除 |

Event作成本文:

```json
{
  "name": "通常練習",
  "startDate": "2026-04-01",
  "endDate": "2027-03-31"
}
```

### 6.4 シフト・枠

| CRUD | Method | 完全パス | 権限 | 用途 |
| --- | --- | --- | --- | --- |
| Create | `POST` | `/api/v1/shifts` | Admin | シフト作成 |
| Read | `GET` | `/api/v1/shifts` | Member | シフト一覧 |
| Read | `GET` | `/api/v1/shifts/{shiftId}` | Member | シフト詳細 |
| Update | `PATCH` | `/api/v1/shifts/{shiftId}` | Admin | シフト・受付状態更新 |
| Delete | `DELETE` | `/api/v1/shifts/{shiftId}` | Admin | 未使用シフト削除 |
| Create | `POST` | `/api/v1/shifts/{shiftId}/slots` | Admin | 枠作成 |
| Read | `GET` | `/api/v1/shifts/{shiftId}/slots` | Member | 枠一覧 |
| Read | `GET` | `/api/v1/shifts/{shiftId}/slots/{slotId}` | Member | 枠詳細 |
| Update | `PATCH` | `/api/v1/shifts/{shiftId}/slots/{slotId}` | Admin | 枠更新 |
| Delete | `DELETE` | `/api/v1/shifts/{shiftId}/slots/{slotId}` | Admin | 未参照枠削除 |

Shift作成本文:

```json
{
  "year": 2026,
  "semester": "spring",
  "module": "B",
  "startDate": "2026-05-11",
  "endDate": "2026-06-28",
  "requiredSessionsPerWeek": 2,
  "isVacation": false
}
```

Slot作成本文:

```json
{
  "eventId": "46bfc55f-d80d-4a15-bfd2-f31c6ddac52f",
  "positionId": "7022f78f-339d-41d5-bca8-d5817433e303",
  "dayOfWeek": 1,
  "period": 1,
  "displayOrder": 10,
  "startTime": "08:40:00",
  "endTime": "09:55:00"
}
```

`GET /api/v1/shifts`は`year`、`semester`、`module`、`isOpen`で絞り込める。Memberには受付中、本人が回答済み、または本人に確定割当があるシフトを返す。

### 6.5 シフト回答

| CRUD | Method | 完全パス | 権限 | 用途 |
| --- | --- | --- | --- | --- |
| Create | `POST` | `/api/v1/shifts/{shiftId}/responses` | Member | 自分の回答を作成 |
| Read | `GET` | `/api/v1/shifts/{shiftId}/responses/me` | Member | 自分の回答を取得 |
| Update | `PUT` | `/api/v1/shifts/{shiftId}/responses/me` | Member | 自分の回答を全置換 |
| Delete | `DELETE` | `/api/v1/shifts/{shiftId}/responses/me` | Member | 自分の回答を削除 |
| Read | `GET` | `/api/v1/shifts/{shiftId}/responses` | Admin | 全回答一覧 |
| Read | `GET` | `/api/v1/shifts/{shiftId}/responses/{responseId}` | Admin | 回答詳細 |
| Update | `PUT` | `/api/v1/shifts/{shiftId}/responses/{responseId}` | Admin | 回答を全置換 |
| Delete | `DELETE` | `/api/v1/shifts/{shiftId}/responses/{responseId}` | Admin | 回答削除 |

作成・置換本文:

```json
{
  "frequency": "TWICE_WEEKLY",
  "comment": "水曜日を希望します。",
  "answers": [
    { "slotId": "0ab88bad-118f-4590-a0bb-45eaeeacdf20", "isAvailable": true },
    { "slotId": "4cfb5f11-905c-4e1e-bb9b-a0e6f112a7a3", "isAvailable": false }
  ],
  "version": 1
}
```

Create時の`version`は省略する。Updateでは必須とする。

- 本文のSlotはすべてURLのShiftに属する必要がある。
- `answers`には対象Shiftの全Slotを重複なく含める。
- Memberの作成・更新・削除は`shifts.is_open = 1`の場合だけ許可する。
- 1 Shift・1 UserにつきResponseは1件とする。
- 既存回答がある状態でPOSTした場合は`409 RESPONSE_ALREADY_EXISTS`を返す。
- 回答が1件以上あるShiftではSlot構成を変更できない。変更が必要な場合は回答を明示的に削除してから行う。

### 6.6 確定割当

| CRUD | Method | 完全パス | 権限 | 用途 |
| --- | --- | --- | --- | --- |
| Create | `POST` | `/api/v1/shifts/{shiftId}/confirmed-assignments` | Admin | 1割当作成 |
| Read | `GET` | `/api/v1/shifts/{shiftId}/confirmed-assignments` | Admin | Shift全体の割当一覧 |
| Read | `GET` | `/api/v1/shifts/{shiftId}/confirmed-assignments/{assignmentId}` | Admin | 割当詳細 |
| Read | `GET` | `/api/v1/shifts/{shiftId}/confirmed-assignments/me` | Member | 自分の割当一覧 |
| Update | `PUT` | `/api/v1/shifts/{shiftId}/confirmed-assignments` | Admin | Shift全体の割当を置換 |
| Delete | `DELETE` | `/api/v1/shifts/{shiftId}/confirmed-assignments/{assignmentId}` | Admin | 1割当削除 |
| Delete | `DELETE` | `/api/v1/shifts/{shiftId}/confirmed-assignments` | Admin | Shift全体の割当削除 |

1件作成本文:

```json
{
  "slotId": "0ab88bad-118f-4590-a0bb-45eaeeacdf20",
  "userId": "f547e2b8-459f-49a1-82ea-0191cd162218"
}
```

全置換本文:

```json
{
  "assignments": [
    {
      "slotId": "0ab88bad-118f-4590-a0bb-45eaeeacdf20",
      "userId": "f547e2b8-459f-49a1-82ea-0191cd162218"
    }
  ]
}
```

- URLのShiftに属するSlotだけを指定できる。
- 原則として対象Slotへ`isAvailable = true`と回答したユーザーだけを割当できる。
- 同じSlotへ同じUserを重複割当できない。
- 練習生1名以上、試験官2名以上を標準成立条件とし、全置換時に検証する。
- 全置換と全削除はD1上で原子的に処理する。

### 6.7 学年暦・ICS

| CRUD | Method | 完全パス | 権限 | 用途 |
| --- | --- | --- | --- | --- |
| Create | `POST` | `/api/v1/admin/academic-calendars/{year}/imports` | Admin | 年度ICSを初回取込 |
| Read | `GET` | `/api/v1/admin/academic-calendars/{year}/imports` | Admin | 取込履歴 |
| Read | `GET` | `/api/v1/admin/academic-calendars/{year}/imports/{importId}` | Admin | 取込結果・エラー |
| Read | `GET` | `/api/v1/academic-calendars/{year}/events` | Member | 公開イベント一覧 |
| Read | `GET` | `/api/v1/academic-calendars/{year}/days` | Member | 日別授業判定 |
| Create | `POST` | `/api/v1/admin/academic-calendars/{year}/events` | Admin | 手動イベントをDRAFT作成 |
| Read | `GET` | `/api/v1/admin/academic-calendars/{year}/events` | Admin | DRAFT・削除済みを含む一覧 |
| Read | `GET` | `/api/v1/admin/academic-calendars/{year}/events/{eventId}` | Admin | 詳細・変更履歴 |
| Update | `PATCH` | `/api/v1/admin/academic-calendars/{year}/events/{eventId}` | Admin | 編集・公開・非公開・復元 |
| Delete | `DELETE` | `/api/v1/admin/academic-calendars/{year}/events/{eventId}` | Admin | 論理削除 |
| Update | `PATCH` | `/api/v1/admin/academic-calendars/{year}/days/{date}` | Admin | 日別授業状態を補正 |

ICS取込:

```http
POST /api/v1/admin/academic-calendars/2026/imports
Content-Type: multipart/form-data

file=<2026-tsukuba.ics>
```

- 取込成功は`201 Created`とする。
- 同一年度へCOMPLETED取込がある場合は`409 CALENDAR_ALREADY_IMPORTED`を返す。
- ICS構文・日付矛盾は`422 INVALID_ICAL`を返す。
- ICS本文は処理終了時に破棄し、イベントと日別判定だけをD1へ保存する。

手動イベント作成例:

```json
{
  "summary": "臨時休講",
  "description": null,
  "location": null,
  "eventType": "CLASS_CANCELLATION",
  "instructionEffect": "CLOSE",
  "isAllDay": true,
  "startDate": "2026-06-15",
  "endDateExclusive": "2026-06-16",
  "rrule": null,
  "rdates": [],
  "exdates": []
}
```

更新例:

```json
{
  "publicationStatus": "PUBLISHED",
  "version": 1
}
```

公開・編集・削除時はOccurrence、日付関連、影響日の`academic_calendar_days`を再生成し、`calendar_event_revisions`へ履歴を追加する。一般向けイベントAPIは`PUBLISHED`かつ`deletedAt = null`だけを返す。

`GET .../events`と`GET .../days`は`from=YYYY-MM-DD&to=YYYY-MM-DD`を必須とする。

### 6.8 CSV出力

| Method | 完全パス | 権限 | Content-Type | 用途 |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/shifts/{shiftId}/responses.csv` | Admin | `text/csv; charset=utf-8` | 全回答をCSV出力 |

UTF-8 BOMと`Content-Disposition: attachment`を付ける。CSV数式インジェクションを防ぐため、`=`, `+`, `-`, `@`で始まるユーザー入力を無害化する。

## 7. 業務ルール

1. `year + semester + module`は一意とする。
2. 1 Shift・1 Userにつき回答は1件とする。
3. Memberの回答変更はShift受付中だけ許可する。
4. ResponseのUserは認証主体から決定し、本文のUser IDを信用しない。
5. SlotのEventとEventPositionは同じEventに属する必要がある。
6. 確定割当は原則として本人が割当可能と回答したSlotに限定する。
7. 会員区分と必要人数をサーバー側で検証する。
8. Adminが学年暦を変更した場合、影響日の授業状態を同一処理内で再計算する。
9. ICSは一度だけ取り込み、以後の変更はDB上のイベントCRUDで行う。
10. 権限判定は必ずWorkerで行い、フロントエンド表示制御に依存しない。

## 8. D1処理・削除規則

複数テーブルを更新する操作はD1のトランザクション相当処理で原子的に行う。

| 操作 | 同時に更新するテーブル |
| --- | --- |
| 回答作成・置換 | `shift_responses`, `shift_response_slots` |
| 確定割当全置換 | `confirmed_assignments` |
| ICS取込 | 学年暦6テーブルと取込状態 |
| 学年暦イベント公開・編集・削除 | Event、Occurrence、DayEvent、Day、Revision |

- SQLは`DB.prepare(...).bind(...)`でパラメータ化する。
- 参照中のUser、Shift、Event、EventPosition、SlotのDELETEは`409 RESOURCE_IN_USE`とする。
- 通常の退会はUserの`isGraduated`、回答締切はShiftの`isOpen`を更新する。
- 学年暦Eventは`deletedAt`による論理削除とする。
- 監査履歴は通常APIから削除しない。

## 9. セキュリティ・運用

- 本番はSPAとAPIを同一オリジンで配信する。
- `/api/v1/health`だけをAccess Bypass対象とする。
- Access JWTの署名、`iss`、`aud`、期限を検証する。
- `CF_Authorization` CookieをフロントエンドJavaScriptから読み取らない。
- ICSのサイズ、VEVENT数、展開数、期間を制限する。
- ICSのファイル名や内容をログへ出さない。
- すべてのレスポンスへ`X-Request-Id`を付与する。
- Admin操作と学年暦変更を監査ログへ記録する。

Worker設定:

| 名前 | 種別 | 用途 |
| --- | --- | --- |
| `DB` | D1 Binding | Aulaデータベース |
| `TEAM_DOMAIN` | Worker Var | Access team domain |
| `POLICY_AUD` | Worker Secret/Var | Access Application Audience Tag |
| `ENVIRONMENT` | Worker Var | `development`, `staging`, `production` |
| `LOCAL_AUTH_EMAIL` | Local Secret | ローカル開発専用認証 |

## 10. 実装順序

1. D1 migration、外部キー、一意制約、インデックス
2. Access JWT検証、User、CafeoreStatus API
3. Event、EventPosition API
4. Shift、Slot API
5. ShiftResponse APIとCSV出力
6. ConfirmedAssignment API
7. ICS初回取込、学年暦参照API
8. Admin学年暦イベントCRUD、日別再計算、監査履歴
9. Firebaseデータ移行とフロントエンド接続切替

## 11. 完了条件

- APIリソースとD1テーブルの識別子・制約が一致する。
- 回答の頻度、コメント、全Slotの可否を保存・復元できる。
- 確定割当をShift単位で作成・取得・全置換・削除できる。
- ICS本体を保存せず、取込データだけで日別授業状態を再現できる。
- Admin追加イベントの公開・編集・削除で影響日だけを再計算できる。
- Member/Admin認可、version競合、重複、削除制約のテストが通る。

## 12. 参考資料

- [DB設計](./db.md)
