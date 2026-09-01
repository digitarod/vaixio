import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConnectors } from "../core/registry/index.js";
import { Router } from "../core/router/index.js";

const docsDir = join(process.cwd(), "docs");

/**
 * §4.2: registry から docs/ を自動生成する。docs/ は手書き禁止。
 * `npm run docs:gen` で再生成する（受け入れ基準: コネクタ追加は再起動だけで反映）。
 */
async function main(): Promise<void> {
  const connectors = await loadConnectors();
  const router = new Router(connectors);
  const catalog = router.listAll();

  await mkdir(docsDir, { recursive: true });

  const lines: string[] = [
    "# Musubi ツールカタログ",
    "",
    "このファイルは自動生成です。手書きで編集しないでください（`npm run docs:gen` で再生成されます）。",
    "",
  ];

  const byPlatform = new Map<string, typeof catalog>();
  for (const entry of catalog) {
    const list = byPlatform.get(entry.platform) ?? [];
    list.push(entry);
    byPlatform.set(entry.platform, list);
  }

  for (const [platform, entries] of [...byPlatform.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`## ${platform}`, "");
    for (const entry of entries) {
      lines.push(`### \`${entry.definition.name}\``);
      lines.push("");
      lines.push(entry.definition.description);
      lines.push("");
      lines.push(`- destructive: ${entry.definition.destructive}`);
      lines.push("- inputSchema:");
      lines.push("```json");
      lines.push(JSON.stringify(entry.definition.inputSchema, null, 2));
      lines.push("```");
      lines.push("");
    }
  }

  await writeFile(join(docsDir, "tool-catalog.md"), `${lines.join("\n")}\n`, "utf8");

  const customerNames = await listCustomers();
  await writeFile(
    join(docsDir, "customers.md"),
    `# 顧客一覧\n\nこのファイルは自動生成です。\n\n${customerNames.map((c) => `- ${c}`).join("\n")}\n`,
    "utf8",
  );

  process.stdout.write(`docs/tool-catalog.md, docs/customers.md を生成しました（tools: ${catalog.length}件）\n`);
}

async function listCustomers(): Promise<string[]> {
  try {
    return await readdir(join(process.cwd(), "customers"));
  } catch {
    return [];
  }
}

main().catch((err) => {
  process.stderr.write(`docs:gen failed: ${String(err)}\n`);
  process.exit(1);
});
