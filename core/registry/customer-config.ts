import { readFile } from "node:fs/promises";
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
