import { describe, expect, it } from "vitest";
import { loadConnectors } from "../core/registry/index.js";
import { Router } from "../core/router/index.js";
import { generateTraceId } from "../core/telemetry/trace.js";

async function buildRouter(): Promise<Router> {
  return new Router(await loadConnectors());
}

describe("Router.handleToolCall", () => {
  it("executes vaixio.health for the admin customer", async () => {
    const router = await buildRouter();
    const result = await router.handleToolCall({
      toolName: "vaixio.health",
      args: {},
      customer: "admin",
      traceId: generateTraceId(),
    });
    expect(result.ok).toBe(true);
  });

  it("rejects tools outside allowed_tools with NOT_ALLOWED (§5: 存在ごと隠す)", async () => {
    const router = await buildRouter();
    const result = await router.handleToolCall({
      toolName: "line.message.send",
      args: {},
      customer: "admin",
      traceId: generateTraceId(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_ALLOWED");
  });

  it("rejects an unknown customer with NOT_ALLOWED", async () => {
    const router = await buildRouter();
    const result = await router.handleToolCall({
      toolName: "vaixio.health",
      args: {},
      customer: "no-such-customer",
      traceId: generateTraceId(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_ALLOWED");
  });

  it("validates args against inputSchema and returns INVALID_INPUT (§8.4)", async () => {
    const router = await buildRouter();
    const result = await router.handleToolCall({
      toolName: "vaixio.trace.get",
      args: {}, // trace_id required
      customer: "admin",
      traceId: generateTraceId(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_INPUT");
  });
});
