import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AuditEvent } from "../../api/types";
import { AuditTable } from "./AuditTable";

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: 1,
    toolName: "instagram.post.create",
    argsDigest: "abc123",
    result: "ok",
    dryRun: false,
    latencyMs: "120",
    occurredAt: "2026-09-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("AuditTable", () => {
  it("renders a friendly empty state when there are no events", () => {
    render(<AuditTable events={[]} />);
    expect(screen.getByText("まだ実行履歴がありません")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders one row per event with the tool name", () => {
    const events = [makeEvent({ id: 1, toolName: "instagram.post.create" }), makeEvent({ id: 2, toolName: "instagram.post.list" })];
    render(<AuditTable events={events} />);

    expect(screen.getByText("instagram.post.create")).toBeInTheDocument();
    expect(screen.getByText("instagram.post.list")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 rows
  });

  it("color-codes an ok result as success", () => {
    render(<AuditTable events={[makeEvent({ result: "ok" })]} />);
    const badge = screen.getByText("成功");
    expect(badge.className).toMatch(/emerald/);
  });

  it("color-codes an error result as an error", () => {
    render(<AuditTable events={[makeEvent({ result: "error" })]} />);
    const badge = screen.getByText("エラー");
    expect(badge.className).toMatch(/red/);
  });

  it("shows a dry-run badge only for dry-run events", () => {
    render(<AuditTable events={[makeEvent({ dryRun: true })]} />);
    expect(screen.getByText("dry run")).toBeInTheDocument();
  });

  it("does not show a dry-run badge for non-dry-run events", () => {
    render(<AuditTable events={[makeEvent({ dryRun: false })]} />);
    expect(screen.queryByText("dry run")).not.toBeInTheDocument();
  });
});
