import { afterEach, describe, expect, it, vi } from "vitest";
import * as scheduledPostsRepo from "../../core/db/repositories/scheduled-posts.js";
import type { Router } from "../../core/router/index.js";
import { startScheduledPostsJob } from "./scheduled-posts-job.js";

function fakeRouter(handleToolCall: Router["handleToolCall"]): Router {
  return { handleToolCall } as unknown as Router;
}

describe("scheduled-posts-job", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("does nothing (and does not throw) when the DB is unreachable", async () => {
    vi.spyOn(scheduledPostsRepo, "findDuePosts").mockRejectedValue(new Error("DATABASE_URL が未設定です"));
    const handleToolCall = vi.fn();

    const timer = startScheduledPostsJob(fakeRouter(handleToolCall));
    await flushMicrotasks();

    expect(handleToolCall).not.toHaveBeenCalled();
    clearInterval(timer);
  });

  it("publishes a due post via the router and marks it published on success", async () => {
    vi.spyOn(scheduledPostsRepo, "findDuePosts").mockResolvedValue([
      { id: "sp-1", customerSlug: "sample-salon", toolName: "line.message.send", args: { to: "U1", message: "hi" } },
    ]);
    const markPublished = vi.spyOn(scheduledPostsRepo, "markScheduledPostPublished").mockResolvedValue(undefined);
    const markFailed = vi.spyOn(scheduledPostsRepo, "markScheduledPostFailed").mockResolvedValue(undefined);
    const handleToolCall = vi.fn().mockResolvedValue({ ok: true, data: { delivered: true } });

    const timer = startScheduledPostsJob(fakeRouter(handleToolCall));
    await flushMicrotasks();

    expect(handleToolCall).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: "line.message.send", customer: "sample-salon", forceDryRun: false }),
    );
    expect(markPublished).toHaveBeenCalledWith("sp-1");
    expect(markFailed).not.toHaveBeenCalled();
    clearInterval(timer);
  });

  it("marks a due post failed when the router returns an error result", async () => {
    vi.spyOn(scheduledPostsRepo, "findDuePosts").mockResolvedValue([
      { id: "sp-2", customerSlug: "sample-salon", toolName: "instagram.post.create", args: {} },
    ]);
    const markFailed = vi.spyOn(scheduledPostsRepo, "markScheduledPostFailed").mockResolvedValue(undefined);
    const handleToolCall = vi
      .fn()
      .mockResolvedValue({ ok: false, error: { code: "AUTH_EXPIRED", message: "no token", retriable: false, hint: "" } });

    const timer = startScheduledPostsJob(fakeRouter(handleToolCall));
    await flushMicrotasks();

    expect(markFailed).toHaveBeenCalledWith("sp-2", "no token");
    clearInterval(timer);
  });

  it("marks a due post failed when the router throws", async () => {
    vi.spyOn(scheduledPostsRepo, "findDuePosts").mockResolvedValue([
      { id: "sp-3", customerSlug: "sample-salon", toolName: "instagram.post.create", args: {} },
    ]);
    const markFailed = vi.spyOn(scheduledPostsRepo, "markScheduledPostFailed").mockResolvedValue(undefined);
    const handleToolCall = vi.fn().mockRejectedValue(new Error("boom"));

    const timer = startScheduledPostsJob(fakeRouter(handleToolCall));
    await flushMicrotasks();

    expect(markFailed).toHaveBeenCalledWith("sp-3", "boom");
    clearInterval(timer);
  });
});

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}
