import { readFile, readdir, access } from "node:fs/promises";
import { join } from "node:path";
import { RawConnectorManifest, type ConnectorManifest, type ToolDefinition } from "../domain/schemas.js";
import type { Connector } from "../ports/connector.js";

const connectorsDir = join(process.cwd(), "connectors");

export interface LoadedConnector {
  platform: string;
  manifest: ConnectorManifest;
  instance: Connector;
}

/**
 * §4: registry は connectors/ を唯一の真実の源として読み、
 * MCP tools/list・REST ルート・docs の元になるカタログを組み立てる。
 * コネクタフォルダを追加すると再起動だけで反映される（受け入れ基準）。
 */
export async function loadConnectors(): Promise<LoadedConnector[]> {
  const entries = await safeReadDir(connectorsDir);
  const loaded: LoadedConnector[] = [];

  for (const entry of entries) {
    const connectorDir = join(connectorsDir, entry);
    const manifestPath = join(connectorDir, "manifest.json");
    const raw = await safeReadJson(manifestPath);
    if (raw === undefined) continue; // manifest.json が無いフォルダは無視

    const rawManifest = RawConnectorManifest.parse(raw);
    const tools: ToolDefinition[] = await Promise.all(
      rawManifest.tools.map(async (tool) => ({
        name: tool.name,
        description: tool.description,
        destructive: tool.destructive,
        inputSchema: await safeReadJson(join(connectorDir, tool.inputSchema)) as Record<string, unknown>,
      })),
    );
    const manifest: ConnectorManifest = { ...rawManifest, tools };

    const instance = await loadAdapter(connectorDir);
    loaded.push({ platform: manifest.platform, manifest, instance });
  }

  return loaded;
}

async function loadAdapter(connectorDir: string): Promise<Connector> {
  for (const filename of ["adapter.js", "adapter.ts"]) {
    const candidate = join(connectorDir, filename);
    if (await exists(candidate)) {
      // 絶対パスの文字列をそのまま渡す。pathToFileURL() 経由にすると、
      // リポジトリパスに非ASCII文字が含まれる環境で Vite(vitest) の解決に失敗するため。
      const mod = (await import(/* @vite-ignore */ candidate)) as { default: Connector };
      return mod.default;
    }
  }
  throw new Error(`connector adapter not found under ${connectorDir} (expected adapter.ts/adapter.js)`);
}

async function safeReadDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

async function safeReadJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return undefined;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
