import type { ToolDefinition, ToolInvocationResult } from "../domain/schemas.js";
import type { ConnectorContext } from "../ports/connector.js";

/**
 * router が扱う統一形。connector 由来 / diagnostics 由来を問わず同じ形で呼び出す。
 */
export interface CatalogEntry {
  platform: string;
  definition: ToolDefinition;
  invoke: (args: unknown, ctx: ConnectorContext) => Promise<ToolInvocationResult>;
}

export function buildCatalogIndex(entries: CatalogEntry[]): Map<string, CatalogEntry> {
  const index = new Map<string, CatalogEntry>();
  for (const entry of entries) {
    index.set(entry.definition.name, entry);
  }
  return index;
}
