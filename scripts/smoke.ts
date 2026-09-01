import { spawnSync } from "node:child_process";

/**
 * §7 Smoke 層。`npm run smoke -- line` のように単体指名実行する。
 */
function main(): void {
  const platform = process.argv[2];
  if (!platform) {
    process.stderr.write("usage: npm run smoke -- <platform>\n");
    process.exit(1);
  }

  const result = spawnSync(
    "npx",
    ["vitest", "run", `connectors/${platform}/smoke.test.ts`],
    { stdio: "inherit", env: { ...process.env, RUN_SMOKE: "1" } },
  );
  process.exit(result.status ?? 1);
}

main();
