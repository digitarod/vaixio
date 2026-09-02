import type { AuditResponse, ConnectionsResponse, MeResponse } from "./types";

/**
 * dashboard-api は同一オリジンで配信される想定（開発時は vite.config.ts のプロキシ経由）。
 * セッションは httpOnly Cookie のみで管理するため、すべての fetch に
 * credentials: "include" を必ず付与する。localStorage 等は一切使わない。
 */
const BASE = "/dashboard-api";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }

  if (!res.ok) {
    const code =
      body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : "UNKNOWN_ERROR";
    throw new ApiError(res.status, code);
  }

  return body as T;
}

export function fetchMe(): Promise<MeResponse> {
  return request<MeResponse>("/me");
}

export function login(email: string, password: string): Promise<{ email: string }> {
  return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function register(
  customerSlug: string,
  email: string,
  password: string,
): Promise<{ email: string }> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ customer_slug: customerSlug, email, password }),
  });
}

export function logout(): Promise<void> {
  return request("/auth/logout", { method: "POST" });
}

export function fetchConnections(): Promise<ConnectionsResponse> {
  return request<ConnectionsResponse>("/connections");
}

export function fetchAuditEvents(): Promise<AuditResponse> {
  return request<AuditResponse>("/audit");
}
