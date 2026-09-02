import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Connection } from "../../api/types";
import { ConnectionsList } from "./ConnectionsList";

describe("ConnectionsList", () => {
  it("renders an empty state with a prominent connect link when there are no connections", () => {
    render(<ConnectionsList connections={[]} customerSlug="acme-corp" />);

    expect(screen.getByText("まだ連携済みのサービスがありません")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Instagramを連携する" });
    expect(link).toHaveAttribute("href", "/oauth/instagram/start?customer=acme-corp");
  });

  it("renders one connection as a card", () => {
    const connections: Connection[] = [
      { platform: "instagram", accountName: "musubi_official", expiresAt: "2027-01-01T00:00:00.000Z" },
    ];
    render(<ConnectionsList connections={connections} customerSlug="acme-corp" />);

    expect(screen.getByText("musubi_official")).toBeInTheDocument();
    expect(screen.getByText("Instagram")).toBeInTheDocument();
  });

  it("renders multiple connections as multiple cards, and always shows the connect link", () => {
    const connections: Connection[] = [
      { platform: "instagram", accountName: "account_a", expiresAt: "2027-01-01T00:00:00.000Z" },
      { platform: "instagram_secondary", accountName: "account_b", expiresAt: null },
    ];
    render(<ConnectionsList connections={connections} customerSlug="acme-corp" />);

    expect(screen.getByText("account_a")).toBeInTheDocument();
    expect(screen.getByText("account_b")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Instagramを連携する" })).toBeInTheDocument();
  });

  it("shows an expiring-soon warning when expiresAt is within 7 days", () => {
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const connections: Connection[] = [{ platform: "instagram", accountName: "soon_expiring", expiresAt: soon }];
    render(<ConnectionsList connections={connections} customerSlug="acme-corp" />);

    expect(screen.getByText("まもなく期限切れ")).toBeInTheDocument();
  });

  it("shows an expired warning when expiresAt is in the past", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const connections: Connection[] = [{ platform: "instagram", accountName: "already_expired", expiresAt: past }];
    render(<ConnectionsList connections={connections} customerSlug="acme-corp" />);

    expect(screen.getByText("期限切れ")).toBeInTheDocument();
  });
});
