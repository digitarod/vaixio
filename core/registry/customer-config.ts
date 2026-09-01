import { readFile } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";
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
  return config;
}

export function clearCustomerConfigCache(): void {
  cache.clear();
}
