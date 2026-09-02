import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

function mockFetchOnce(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("LoginForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders email and password fields", () => {
    render(<LoginForm onSuccess={vi.fn()} />);
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  it("submits the right endpoint with the right body and calls onSuccess", async () => {
    const fetchMock = mockFetchOnce(200, { email: "user@example.com" });
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText("メールアドレス"), "user@example.com");
    await user.type(screen.getByLabelText("パスワード"), "correct-password");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("user@example.com"));

    expect(fetchMock).toHaveBeenCalledWith(
      "/dashboard-api/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ email: "user@example.com", password: "correct-password" }),
      }),
    );
  });

  it("shows a friendly Japanese message for INVALID_CREDENTIALS instead of the raw code", async () => {
    mockFetchOnce(401, { error: "INVALID_CREDENTIALS" });
    const user = userEvent.setup();

    render(<LoginForm onSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText("メールアドレス"), "user@example.com");
    await user.type(screen.getByLabelText("パスワード"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("メールアドレスまたはパスワードが正しくありません");
    expect(screen.queryByText("INVALID_CREDENTIALS")).not.toBeInTheDocument();
  });
});
