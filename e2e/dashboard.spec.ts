import { expect, test } from "@playwright/test";

/**
 * 実ブラウザでの結合テスト。CIではPostgresサービスコンテナが毎回まっさらな状態で
 * 起動するため、「サーバー起動時の顧客設定ファイル先読み(preloadAllCustomerConfigs)
 * だけで、事前に一度もMCP/RESTを叩かれていない顧客が登録できるか」を実質的に検証できる。
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

test.describe("顧客セルフサービスダッシュボード", () => {
  test("customers/admin/config.yaml の顧客は、一度もMCP/RESTを呼ばれていなくても新規登録できる", async ({ page }) => {
    const email = uniqueEmail("admin-e2e");

    await page.goto("/register");
    await page.getByLabel("お客様ID").fill("admin");
    await page.getByLabel("メールアドレス").fill(email);
    await page.getByLabel("パスワード", { exact: true }).fill("hunter2hunter2");
    await page.getByLabel("パスワード（確認）").fill("hunter2hunter2");
    await page.getByRole("button", { name: "アカウントを作成" }).click();

    await expect(page).toHaveURL(/\/connections/);
  });

  test("存在しないお客様IDでは明確なエラーメッセージが出る", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("お客様ID").fill("no-such-customer-slug");
    await page.getByLabel("メールアドレス").fill(uniqueEmail("unknown"));
    await page.getByLabel("パスワード", { exact: true }).fill("hunter2hunter2");
    await page.getByLabel("パスワード（確認）").fill("hunter2hunter2");
    await page.getByRole("button", { name: "アカウントを作成" }).click();

    await expect(page.getByText("そのお客様IDはまだ登録されていません")).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test("登録直後にログイン状態で連携ページと監査履歴ページを見られる", async ({ page }) => {
    const email = uniqueEmail("flow-e2e");

    await page.goto("/register");
    await page.getByLabel("お客様ID").fill("admin");
    await page.getByLabel("メールアドレス").fill(email);
    await page.getByLabel("パスワード", { exact: true }).fill("hunter2hunter2");
    await page.getByLabel("パスワード（確認）").fill("hunter2hunter2");
    await page.getByRole("button", { name: "アカウントを作成" }).click();
    await expect(page).toHaveURL(/\/connections/);

    await expect(page.getByText("Instagramを連携する")).toBeVisible();

    await page.goto("/audit");
    await expect(page).toHaveURL(/\/audit/);
  });

  test("ログアウト後は保護ページにアクセスするとログイン画面に戻される", async ({ page }) => {
    const email = uniqueEmail("logout-e2e");

    await page.goto("/register");
    await page.getByLabel("お客様ID").fill("admin");
    await page.getByLabel("メールアドレス").fill(email);
    await page.getByLabel("パスワード", { exact: true }).fill("hunter2hunter2");
    await page.getByLabel("パスワード（確認）").fill("hunter2hunter2");
    await page.getByRole("button", { name: "アカウントを作成" }).click();
    await expect(page).toHaveURL(/\/connections/);

    await page.getByRole("button", { name: "ログアウト" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/connections");
    await expect(page).toHaveURL(/\/login/);
  });

  test("登録済みメールアドレスで正しいパスワードでログインできる", async ({ page }) => {
    const email = uniqueEmail("login-e2e");

    await page.goto("/register");
    await page.getByLabel("お客様ID").fill("admin");
    await page.getByLabel("メールアドレス").fill(email);
    await page.getByLabel("パスワード", { exact: true }).fill("hunter2hunter2");
    await page.getByLabel("パスワード（確認）").fill("hunter2hunter2");
    await page.getByRole("button", { name: "アカウントを作成" }).click();
    await page.getByRole("button", { name: "ログアウト" }).click();

    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill(email);
    await page.getByLabel("パスワード").fill("hunter2hunter2");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/connections/);
  });
});
