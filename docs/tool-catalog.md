# Musubi ツールカタログ

このファイルは自動生成です。手書きで編集しないでください（`npm run docs:gen` で再生成されます）。

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

