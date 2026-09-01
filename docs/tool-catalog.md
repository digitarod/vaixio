# Musubi ツールカタログ

このファイルは自動生成です。手書きで編集しないでください（`npm run docs:gen` で再生成されます）。

## instagram

### `instagram.post.create`

Zernio (https://zernio.com) 経由でInstagramのフィードに画像/動画+キャプションを投稿する

- destructive: true
- inputSchema:
```json
{
  "type": "object",
  "properties": {
    "account_id": {
      "type": "string",
      "description": "Zernioダッシュボードで連携済みのInstagramビジネス/クリエイターアカウントのID"
    },
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
            "description": "公開アクセス可能なCDN URL（Google Drive/Dropbox/OneDriveの共有リンクは不可。画像8MB以内推奨）"
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
      "description": "destructive:true のため router が必須化する（confirm_policy: dry_run_first）。true の場合 Zernio へは送信せずリクエスト内容のプレビューのみ返す"
    }
  },
  "required": [
    "account_id",
    "caption",
    "media"
  ],
  "additionalProperties": false
}
```

## musubi

### `musubi.health`

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

### `musubi.errors.recent`

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

### `musubi.trace.get`

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

### `musubi.replay`

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

### `musubi.connector.smoke`

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

