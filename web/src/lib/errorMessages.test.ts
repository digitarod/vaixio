import { describe, expect, it } from "vitest";
import { translateApiError } from "./errorMessages";

describe("translateApiError", () => {
  it("translates known error codes to Japanese copy", () => {
    expect(translateApiError("INVALID_CREDENTIALS")).toBe("メールアドレスまたはパスワードが正しくありません");
    expect(translateApiError("CUSTOMER_NOT_FOUND")).toContain("お客様ID");
    expect(translateApiError("EMAIL_TAKEN")).toContain("既に登録されています");
  });

  it("passes through messages the backend already localized (e.g. validation errors)", () => {
    expect(translateApiError("パスワードは10文字以上にしてください")).toBe("パスワードは10文字以上にしてください");
  });
});
