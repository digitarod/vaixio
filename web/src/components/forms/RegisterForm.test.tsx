import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "./RegisterForm";

function mockFetchOnce(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, overrides: Partial<Record<string, string>> = {}) {
  const values = {
    slug: "acme-corp",
    email: "new@example.com",
    password: "longenoughpassword",
    confirm: "longenoughpassword",
    ...overrides,
  };
  await user.type(screen.getByLabelText("お客様ID"), values.slug);
  await user.type(screen.getByLabelText("メールアドレス"), values.email);
  await user.type(screen.getByLabelText("パスワード"), values.password);
  await user.type(screen.getByLabelText("パスワード（確認）"), values.confirm);
}

describe("RegisterForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders all fields", () => {
    render(<RegisterForm onSuccess={vi.fn()} />);
    expect(screen.getByLabelText("お客様ID")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード（確認）")).toBeInTheDocument();
  });

  it("blocks submission client-side when passwords do not match, without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<RegisterForm onSuccess={vi.fn()} />);
    await fillForm(user, { confirm: "somethingelse1" });
    await user.click(screen.getByRole("button", { name: "アカウントを作成" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("パスワードが一致しません");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks submission client-side when the password is shorter than 10 chars", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<RegisterForm onSuccess={vi.fn()} />);
    await fillForm(user, { password: "short1", confirm: "short1" });
    await user.click(screen.getByRole("button", { name: "アカウントを作成" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("10文字以上");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits customer_slug/email/password to the register endpoint and calls onSuccess", async () => {
    const fetchMock = mockFetchOnce(201, { email: "new@example.com" });
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(<RegisterForm onSuccess={onSuccess} />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "アカウントを作成" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("new@example.com"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/dashboard-api/auth/register",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          customer_slug: "acme-corp",
          email: "new@example.com",
          password: "longenoughpassword",
        }),
      }),
    );
  });

  it("shows a friendly message when the customer slug is unknown (404 CUSTOMER_NOT_FOUND)", async () => {
    mockFetchOnce(404, { error: "CUSTOMER_NOT_FOUND" });
    const user = userEvent.setup();

    render(<RegisterForm onSuccess={vi.fn()} />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "アカウントを作成" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "そのお客様IDはまだ登録されていません。担当者にご確認ください",
    );
  });

  it("shows a friendly message when the email is already taken (409 EMAIL_TAKEN)", async () => {
    mockFetchOnce(409, { error: "EMAIL_TAKEN" });
    const user = userEvent.setup();

    render(<RegisterForm onSuccess={vi.fn()} />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "アカウントを作成" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("既に登録されています");
  });
});
