import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

/**
 * ダッシュボードの人間ログイン用パスワードハッシュ。
 * argon2/bcryptはネイティブビルドが必要で、本番の node:20-slim イメージにも
 * ビルドツールが無いため使えない。Node標準の crypto.scrypt（追加依存なし）を使う。
 * 形式: "scrypt:<saltHex>:<hashHex>"
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, saltHex, hashHex] = parts;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derivedKey = (await scryptAsync(password, salt, expected.length)) as Buffer;

  return expected.length === derivedKey.length && timingSafeEqual(expected, derivedKey);
}
