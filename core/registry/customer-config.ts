import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";
import { upsertCustomer } from "../db/repositories/customers.js";
import { CustomerConfig } from "../domain/schemas.js";

const customersDir = join(process.cwd(), "customers");

const cache = new Map<string, CustomerConfig>();

/**
 * §5: customers/<name>/config.yaml が「顧客専用MCPサーバー」の実体。
 * 存在しない顧客名は undefined を返す（存在ごと隠す方針は router 側の allowed_tools フィルタで担保）。
 */
export async function loadCustomerConfig(customer: string): Promise<CustomerConfig | undefined> {
  if (cache.has(customer)) return cache.get(customer);

  const path = join(customersDir, customer, "config.yaml");
  let raw: unknown;
  try {
    raw = yaml.load(await readFile(path, "utf8"));
  } catch {
    return undefined;
  }

  const config = CustomerConfig.parse(raw);
  cache.set(customer, config);
  await projectToDb(config);
  return config;
}

/**
 * YAMLを真実の源のまま維持し、Postgresの customers テーブルはダッシュボード用の
 * ベストエフォート射影として更新するだけ（§A）。DB未設定/DB障害でMCP/RESTを壊さない。
 */
async function projectToDb(config: CustomerConfig): Promise<void> {
  try {
    await upsertCustomer(config.customer);
  } catch {
    // DB未接続・未設定でも既存のMCP/REST機能は継続する
  }
}

export function clearCustomerConfigCache(): void {
  cache.clear();
}

/**
 * サーバー起動時に customers/ 配下を全件先読みしてDBへ射影する。
 * これが無いと「一度もMCP/RESTで呼ばれたことのない顧客」がDB上に存在せず、
 * ダッシュボードでの新規登録(customer_slugの存在チェック)が通らないという
 * 鶏卵問題が起きる（実機確認済み）。DB未接続でも起動自体は失敗させない。
 */
export async function preloadAllCustomerConfigs(): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(customersDir);
  } catch {
    return;
  }
  await Promise.all(entries.map((name) => loadCustomerConfig(name)));
}
