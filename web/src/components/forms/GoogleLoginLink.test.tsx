import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GoogleLoginLink } from "./GoogleLoginLink";

describe("GoogleLoginLink", () => {
  it("links to the plain start endpoint when no customerSlug is given (login use case)", () => {
    render(<GoogleLoginLink />);
    const link = screen.getByRole("link", { name: /Googleでログイン/ });
    expect(link).toHaveAttribute("href", "/dashboard-api/auth/google/start");
  });

  it("includes an encoded customer_slug query param when given (registration use case)", () => {
    render(<GoogleLoginLink customerSlug="acme corp" />);
    const link = screen.getByRole("link", { name: /Googleでログイン/ });
    expect(link).toHaveAttribute("href", "/dashboard-api/auth/google/start?customer_slug=acme%20corp");
  });
});
