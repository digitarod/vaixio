import { access, cp, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * §8.3: 新コネクタは必ずここから始める。手作りフォルダは禁止。
 * 使い方: npm run new-connector <platform-name>
 */
async function main(): Promise<void> {
  const platform = process.argv[2];
  if (!platform || !/^[a-z][a-z0-9-]*$/.test(platform)) {
    process.stderr.write("usage: npm run new-connector <platform-name>  (例: line, instagram, stripe)\n");
    process.exit(1);
  }

  const templateDir = join(process.cwd(), "tools", "scaffold", "template");
  const targetDir = join(process.cwd(), "connectors", platform);

  if (await exists(targetDir)) {
    process.stderr.write(`connectors/${platform} は既に存在します\n`);
    process.exit(1);
  }

  await cp(templateDir, targetDir, { recursive: true });
  await renameTemplates(targetDir);
  await substitutePlatform(targetDir, platform);

  process.stdout.write(
    `connectors/${platform} を作成しました。manifest.json の tools と adapter.ts の TODO を実装してください。\n`,
  );
}

async function renameTemplates(dir: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await renameTemplates(full);
      continue;
    }
    if (entry.name.endsWith(".tpl")) {
      await rename(full, join(dir, entry.name.slice(0, -".tpl".length)));
    }
  }
}

async function substitutePlatform(dir: string, platform: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await substitutePlatform(full, platform);
      continue;
    }
    const content = await readFile(full, "utf8");
    await writeFile(full, content.split("__PLATFORM__").join(platform), "utf8");
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

main().catch((err) => {
  process.stderr.write(`scaffold failed: ${String(err)}\n`);
  process.exit(1);
});
