import { findDuePosts, markScheduledPostFailed, markScheduledPostPublished } from "../../core/db/repositories/scheduled-posts.js";
import type { Router } from "../../core/router/index.js";
import { generateTraceId } from "../../core/telemetry/trace.js";
import { log } from "../../core/telemetry/logger.js";

const CHECK_INTERVAL_MS = 30 * 1000;

/**
 * vaixio.post.schedule で登録された予約投稿を、実行時刻になったらRouter経由で実行するジョブ。
 * DATABASE_URL未設定/DB障害でもプロセス自体は落とさない(既存のInstagramトークン更新ジョブと同じ方針)。
 */
export function startScheduledPostsJob(router: Router): NodeJS.Timeout {
  const run = (): void => {
    publishDuePosts(router).catch((err) => {
      void log({
        trace_id: "job_scheduled_posts",
        tool: "vaixio.post.schedule",
        phase: "job_failed",
        error_code: "UNKNOWN",
        message: err instanceof Error ? err.message : String(err),
      });
    });
  };
  run();
  return setInterval(run, CHECK_INTERVAL_MS);
}

async function publishDuePosts(router: Router): Promise<void> {
  let due: Awaited<ReturnType<typeof findDuePosts>>;
  try {
    due = await findDuePosts(new Date());
  } catch {
    // DATABASE_URL未設定/DB未接続の環境では予約投稿機能自体を使っていないとみなし、静かにスキップする
    return;
  }

  for (const post of due) {
    const traceId = generateTraceId();
    try {
      const result = await router.handleToolCall({
        toolName: post.toolName,
        args: post.args,
        customer: post.customerSlug,
        traceId,
        forceDryRun: false,
      });

      if (result.ok) {
        await markScheduledPostPublished(post.id);
        await log({ trace_id: traceId, customer: post.customerSlug, tool: post.toolName, phase: "scheduled_post_published", error_code: null });
      } else {
        await markScheduledPostFailed(post.id, result.error.message);
        await log({
          trace_id: traceId,
          customer: post.customerSlug,
          tool: post.toolName,
          phase: "scheduled_post_failed",
          error_code: result.error.code,
          message: result.error.message,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markScheduledPostFailed(post.id, message).catch(() => undefined);
      await log({
        trace_id: traceId,
        customer: post.customerSlug,
        tool: post.toolName,
        phase: "scheduled_post_failed",
        error_code: "UNKNOWN",
        message,
      });
    }
  }
}
