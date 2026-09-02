import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { OAuthTokenRecord } from "../domain/schemas.js";

const storePath = join(process.cwd(), "data", "oauth-tokens.enc.json");

/**
 * OAuthで顧客が自己連携したアクセストークンの永続化層（§「Graph APIをお客様から取得しない」仕組み）。
 * customers/<name>/config.yaml の credentials(=デプロイ時に手作業で設定する静的な秘密)とは異なり、
 * ここは実行時にOAuthコールバックが書き込む動的な秘密を扱う。VPS単一インスタンス前提の
 * 簡易実装（暗号化JSONファイル1本）。書き込みは楽観的にファイル全体を読み直してマージする。
 */
type StoreShape = Record<string, OAuthTokenRecord>;

function keyOf(customer: string, platform: string): string {
  return `${customer}:${platform}`;
}

function getEncryptionKey(): Buffer {
  const raw = process.env.VAULT_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "VAULT_ENCRYPTION_KEY が未設定です。`openssl rand -base64 32` などで32byteの鍵を生成して設定してください",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("VAULT_ENCRYPTION_KEY は base64 エンコードされた32byteの鍵である必要があります");
  }
  return key;
}

async function readStore(): Promise<StoreShape> {
  let raw: string;
  try {
    raw = await readFile(storePath, "utf8");
  } catch {
    return {};
  }
  const { iv, authTag, ciphertext } = JSON.parse(raw) as { iv: string; authTag: string; ciphertext: string };
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as StoreShape;
}

async function writeStore(store: StoreShape): Promise<void> {
  await mkdir(dirname(storePath), { recursive: true });
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(store), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  await writeFile(
    storePath,
    JSON.stringify({
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    }),
    "utf8",
  );
}

export async function saveOAuthToken(record: OAuthTokenRecord): Promise<void> {
  const store = await readStore();
  store[keyOf(record.customer, record.platform)] = OAuthTokenRecord.parse(record);
  await writeStore(store);
}

export async function getOAuthToken(customer: string, platform: string): Promise<OAuthTokenRecord | undefined> {
  const store = await readStore();
  return store[keyOf(customer, platform)];
}

export async function deleteOAuthToken(customer: string, platform: string): Promise<void> {
  const store = await readStore();
  delete store[keyOf(customer, platform)];
  await writeStore(store);
}

/** 自動リフレッシュジョブなどが全件走査するための一覧取得。 */
export async function listOAuthTokens(): Promise<OAuthTokenRecord[]> {
  const store = await readStore();
  return Object.values(store);
}
