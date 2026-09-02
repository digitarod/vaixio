import { describe, expect, it } from "vitest";
import { formatDateJa, formatExpiry, isExpired, isExpiringSoon } from "./format";

describe("formatDateJa", () => {
  it("formats an ISO date into the Japanese long form", () => {
    expect(formatDateJa("2026-10-31T00:00:00.000Z")).toBe("2026年10月31日");
  });
});

describe("isExpired / isExpiringSoon", () => {
  const now = new Date("2026-09-02T00:00:00.000Z");

  it("treats null as never expired / never expiring soon", () => {
    expect(isExpired(null, now)).toBe(false);
    expect(isExpiringSoon(null, 7, now)).toBe(false);
  });

  it("flags a date in the past as expired", () => {
    expect(isExpired("2026-09-01T00:00:00.000Z", now)).toBe(true);
  });

  it("flags a date within the warning window as expiring soon", () => {
    expect(isExpiringSoon("2026-09-05T00:00:00.000Z", 7, now)).toBe(true);
  });

  it("does not flag a date well outside the warning window", () => {
    expect(isExpiringSoon("2026-12-01T00:00:00.000Z", 7, now)).toBe(false);
  });
});

describe("formatExpiry", () => {
  it("shows a no-expiry message for null", () => {
    expect(formatExpiry(null)).toBe("有効期限の設定なし");
  });

  it("shows an 'expired' message for a past date", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(formatExpiry(past)).toContain("期限切れ");
  });

  it("shows a 'valid until' message for a future date", () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatExpiry(future)).toContain("まで有効");
  });
});
