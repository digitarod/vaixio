# VAIXIO ツールカタログ

このファイルは自動生成です。手書きで編集しないでください（`npm run docs:gen` で再生成されます）。

## facebook_page

### `facebook_page.post.create`

顧客がOAuthで連携済みのFacebookページのタイムラインにテキスト投稿(任意で画像1枚またはリンク)を作成する

- destructive: true
- inputSchema:
```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "投稿本文",
      "minLength": 1,
      "maxLength": 5000
    },
    "image_url": {
      "type": "string",
      "format": "uri",
      "description": "添付する画像1枚の公開アクセス可能なURL(任意)"
    },
    "link": {
      "type": "string",
      "format": "uri",
      "description": "添付するリンクURL(任意。image_urlと同時指定はしない想定)"
    },
    "dry_run": {
      "type": "boolean",
      "description": "destructive:true のため router が必須化する（confirm_policy: dry_run_first）。true の場合はFacebookへ投稿せずプレビューのみ返す"
    }
  },
  "required": [
    "message"
  ],
  "additionalProperties": false
}
```

## google_business_profile

### `google_business_profile.location.list`

顧客がOAuthで連携済みのGoogleビジネスプロフィール上のビジネス拠点(location)一覧を取得する。review系ツールに必要なaccountId/locationIdの特定に使う

- destructive: false
- inputSchema:
```json
{
  "type": "object",
  "properties": {},
  "required": [],
  "additionalProperties": false
}
```

### `google_business_profile.review.list`

指定したビジネス拠点に投稿された口コミ(レビュー)一覧を取得する

- destructive: false
- inputSchema:
```json
{
  "type": "object",
  "properties": {
    "accountId": {
      "type": "string",
      "description": "google_business_profile.location.list で取得したaccountId"
    },
    "locationId": {
      "type": "string",
      "description": "google_business_profile.location.list で取得したlocationId"
    },
    "pageSize": {
      "type": "integer",
      "description": "取得件数の上限(省略時は20、最大50)",
      "minimum": 1,
      "maximum": 50
    }
  },
  "required": [
    "accountId",
    "locationId"
  ],
  "additionalProperties": false
}
```

### `google_business_profile.review.reply`

指定した口コミ(レビュー)に返信/返信内容を更新する

- destructive: true
- inputSchema:
```json
{
  "type": "object",
  "properties": {
    "accountId": {
      "type": "string",
      "description": "google_business_profile.location.list で取得したaccountId"
    },
    "locationId": {
      "type": "string",
      "description": "google_business_profile.location.list で取得したlocationId"
    },
    "reviewId": {
      "type": "string",
      "description": "google_business_profile.review.list で取得したレビューID"
    },
    "comment": {
      "type": "string",
      "description": "返信本文(最大4096文字)。既に返信済みの場合は上書き更新される",
      "maxLength": 4096
    },
    "dry_run": {
      "type": "boolean",
      "description": "destructive:true のため router が必須化する（confirm_policy: dry_run_first）。true の場合は実際に返信せずプレビューのみ返す"
    }
  },
  "required": [
    "accountId",
    "locationId",
    "reviewId",
    "comment"
  ],
  "additionalProperties": false
}
```

## instagram

### `instagram.post.create`

顧客がOAuthで連携済みのInstagramアカウントのフィードに画像/動画+キャプションを投稿する（Meta Graph API直接呼び出し）

- destructive: true
- inputSchema:
```json
{
  "type": "object",
  "properties": {
    "caption": {
      "type": "string",
      "description": "投稿キャプション。最大2200文字（最初の125文字だけが折り畳み前に表示される）",
      "maxLength": 2200
    },
    "media": {
      "type": "array",
      "description": "フィード投稿の添付メディア。1枚なら単一投稿、2枚以上でカルーセル（最大10枚）",
      "minItems": 1,
      "maxItems": 10,
      "items": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string",
            "format": "uri",
            "description": "公開アクセス可能なCDN URL（Google Drive/Dropbox/OneDriveの共有リンクは不可）"
          },
          "type": {
            "type": "string",
            "enum": [
              "image",
              "video"
            ]
          }
        },
        "required": [
          "url",
          "type"
        ],
        "additionalProperties": false
      }
    },
    "first_comment": {
      "type": "string",
      "description": "投稿直後に自動で付けるコメント（任意）"
    },
    "dry_run": {
      "type": "boolean",
      "description": "destructive:true のため router が必須化する（confirm_policy: dry_run_first）。true の場合 Instagram へは投稿せずプレビューのみ返す"
    }
  },
  "required": [
    "caption",
    "media"
  ],
  "additionalProperties": false
}
```

## line

### `line.message.send`

指定ユーザー/グループ/ルームにLINEメッセージ(テキスト)をpushで送信する

- destructive: true
- inputSchema:
```json
{
  "type": "object",
  "properties": {
    "to": {
      "type": "string",
      "description": "送信先のLINE userId / groupId / roomId"
    },
    "message": {
      "type": "string",
      "description": "送信するテキストメッセージ",
      "maxLength": 5000
    },
    "dry_run": {
      "type": "boolean",
      "description": "destructive:true のため router が必須化する（confirm_policy: dry_run_first）。true の場合 LINE へは送信せずプレビューのみ返す"
    }
  },
  "required": [
    "to",
    "message"
  ],
  "additionalProperties": false
}
```

### `line.profile.get`

指定ユーザーのLINEプロフィール(表示名・アイコン等)を取得する

- destructive: false
- inputSchema:
```json
{
  "type": "object",
  "properties": {
    "userId": {
      "type": "string",
      "description": "プロフィールを取得する対象のLINE userId"
    }
  },
  "required": [
    "userId"
  ],
  "additionalProperties": false
}
```

## vaixio

### `vaixio.health`

全コネクタの healthCheck を一括実行し、ハブ自身の稼働状態も含めて返す

- destructive: false
- inputSchema:
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

### `vaixio.errors.recent`

直近エラー一覧を error_code 別集計つきで返す

- destructive: false
- inputSchema:
```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "number",
      "description": "取得件数(既定20)"
    }
  },
  "required": []
}
```

### `vaixio.trace.get`

trace_id を指定して該当リクエストの全ログを取得する

- destructive: false
- inputSchema:
```json
{
  "type": "object",
  "properties": {
    "trace_id": {
      "type": "string"
    }
  },
  "required": [
    "trace_id"
  ]
}
```

### `vaixio.replay`

フライトレコーダの記録を dry-run で再実行する

- destructive: false
- inputSchema:
```json
{
  "type": "object",
  "properties": {
    "trace_id": {
      "type": "string"
    }
  },
  "required": [
    "trace_id"
  ]
}
```

### `vaixio.connector.smoke`

指定コネクタの実API疎通テストを実行する

- destructive: false
- inputSchema:
```json
{
  "type": "object",
  "properties": {
    "platform": {
      "type": "string"
    }
  },
  "required": [
    "platform"
  ]
}
```

### `vaixio.post.schedule`

指定したツール呼び出しを未来の時刻に予約する。実行時刻になったら自動でRouter経由で実行される

- destructive: true
- inputSchema:
```json
{
  "type": "object",
  "properties": {
    "tool_name": {
      "type": "string",
      "description": "予約実行したいツール名(例: instagram.post.create)"
    },
    "args": {
      "type": "object",
      "description": "そのツールに渡す引数"
    },
    "scheduled_at": {
      "type": "string",
      "description": "実行時刻(ISO8601、未来の日時)"
    },
    "dry_run": {
      "type": "boolean",
      "description": "destructive:true のため必須。trueなら登録せずプレビューのみ返す"
    }
  },
  "required": [
    "tool_name",
    "args",
    "scheduled_at"
  ]
}
```

### `vaixio.post.schedule.list`

自分(呼び出し元顧客)の予約投稿一覧を、予約時刻の昇順で返す

- destructive: false
- inputSchema:
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

### `vaixio.post.schedule.cancel`

自分(呼び出し元顧客)の予約投稿のうち、まだ実行前(pending)のものを取り消す

- destructive: false
- inputSchema:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "vaixio.post.schedule.list で取得したid"
    }
  },
  "required": [
    "id"
  ]
}
```

