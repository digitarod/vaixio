import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthContext";
import { ProtectedRoute } from "./ProtectedRoute";

function mockMeResponse(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    }),
  );
}

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/connections"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>ログイン画面</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/connections" element={<p>保護された連携ページ</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a loading state while /me is in flight", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    renderProtected();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("redirects to /login when /me returns 401 (unauthenticated)", async () => {
    mockMeResponse(401, { error: "unauthorized" });
    renderProtected();

    expect(await screen.findByText("ログイン画面")).toBeInTheDocument();
    expect(screen.queryByText("保護された連携ページ")).not.toBeInTheDocument();
  });

  it("renders the protected content when /me succeeds", async () => {
    mockMeResponse(200, { email: "user@example.com", customerSlug: "acme-corp" });
    renderProtected();

    expect(await screen.findByText("保護された連携ページ")).toBeInTheDocument();
  });
});
