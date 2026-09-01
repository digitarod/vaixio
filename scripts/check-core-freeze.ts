import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ALLOW_LABEL = "core-change-approved";

/**
 * §8.2 コア凍結: 通常のコネクタ追加PRで core/ に差分が出たら CI で落とす。
 * コア変更は ALLOW_LABEL のラベルが付いた PR のみ許可する。
 */
function main(): void {
  const baseRef = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "origin/main";
  let changedFiles: string[];
  try {
    const diff = execSync(`git diff --name-only ${baseRef}...HEAD`, { encoding: "utf8" });
    changedFiles = diff.split("\n").filter(Boolean);
  } catch {
    process.stdout.write(`check:core-freeze skip — ${baseRef} との差分を取得できません(ローカル実行など)\n`);
    return;
  }

  const coreChanges = changedFiles.filter((f) => f.startsWith("core/"));
  if (coreChanges.length === 0) {
    process.stdout.write("check:core-freeze OK — core/ への差分なし\n");
    return;
  }

  if (hasAllowLabel()) {
    process.stdout.write(`check:core-freeze OK — "${ALLOW_LABEL}" ラベルにより core/ 変更を許可:\n${coreChanges.join("\n")}\n`);
    return;
  }

  process.stderr.write(
    `check:core-freeze FAILED — core/ に差分があります。意図的な変更なら PR に "${ALLOW_LABEL}" ラベルを付けてください:\n${coreChanges.join("\n")}\n`,
  );
  process.exit(1);
}

function hasAllowLabel(): boolean {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return false;
  try {
    const event = JSON.parse(readFileSync(eventPath, "utf8")) as { pull_request?: { labels?: { name: string }[] } };
    return (event.pull_request?.labels ?? []).some((label) => label.name === ALLOW_LABEL);
  } catch {
    return false;
  }
}

main();
