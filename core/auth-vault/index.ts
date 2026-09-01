const VAULT_REF_PATTERN = /^vault:\/\/([^/]+)\/(.+)$/;

/**
 * 資格情報の一元管理（最小実装）。
 * `vault://<customer>/<key>` を環境変数 `VAULT__<CUSTOMER>__<KEY>` に解決する。
 * 平文を config.yaml やコードに直書きしない、という規約(§5)を構造で強制する入口。
 * 本番運用では実 Vault/Secrets Manager 実装に差し替える想定（この関数のみが依存点）。
 */
export function resolveCredential(ref: string): string {
  const match = VAULT_REF_PATTERN.exec(ref);
  if (!match) {
    throw new Error(`invalid vault reference: ${ref} (expected vault://<customer>/<key>)`);
  }
  const [, customer, key] = match;
  const envName = `VAULT__${toEnvSegment(customer)}__${toEnvSegment(key)}`;
  const value = process.env[envName];
  if (!value) {
    throw new Error(`vault reference ${ref} is not resolvable: missing env ${envName}`);
  }
  return value;
}

export function verifyBearerToken(customer: string, presentedToken: string | undefined): boolean {
  if (!presentedToken) return false;
  let expected: string;
  try {
    expected = resolveCredential(`vault://${customer}/mcp_token`);
  } catch {
    return false;
  }
  return timingSafeEqual(presentedToken, expected);
}

function toEnvSegment(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
