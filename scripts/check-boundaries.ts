import { ESLint } from "eslint";

/**
 * §8.1: 依存方向の強制を単独で検証する CI ステップ。
 * connectors → core(ports/domain) のみ許可。connector間 import・interfaces→connector直接参照は禁止。
 * 通常の `npm run lint` にも同じルールが含まれるが、CI 上で失敗理由を明確に分離するために独立させている。
 */
async function main(): Promise<void> {
  const eslint = new ESLint({
    errorOnUnmatchedPattern: false,
    overrideConfig: {
      rules: {
        "boundaries/element-types": "error",
        "boundaries/no-private": "error",
      },
    },
  });

  const results = await eslint.lintFiles(["core/**/*.ts", "connectors/**/*.ts", "interfaces/**/*.ts"]);
  const boundaryResults = results
    .map((r) => ({ ...r, messages: r.messages.filter((m) => m.ruleId?.startsWith("boundaries/")) }))
    .filter((r) => r.messages.length > 0);

  if (boundaryResults.length === 0) {
    process.stdout.write("check:boundaries OK — 依存方向違反なし\n");
    return;
  }

  const formatter = await eslint.loadFormatter("stylish");
  process.stdout.write(await formatter.format(boundaryResults, { cwd: process.cwd(), rulesMeta: {} }));
  process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`check:boundaries failed: ${String(err)}\n`);
  process.exit(1);
});
