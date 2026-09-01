import { describe, expect, it } from "vitest";
import { loadConnectors } from "../core/registry/index.js";

/**
 * §7 共通コントラクト: 全コネクタ同一スイート（ports準拠・manifest妥当性）。
 * connectors/ が空でも常に実行され、コネクタ追加時に自動でカバーされる。
 */
describe("connector contract", () => {
  it("loads without throwing and every connector satisfies the Connector port", async () => {
    const connectors = await loadConnectors();

    for (const { platform, manifest, instance } of connectors) {
      expect(manifest.platform).toBe(platform);
      expect(typeof instance.invoke).toBe("function");
      expect(typeof instance.healthCheck).toBe("function");

      for (const tool of manifest.tools) {
        expect(tool.name.startsWith(`${platform}.`)).toBe(true);
        expect(tool.inputSchema).toMatchObject({ type: "object" });
      }

      const health = await instance.healthCheck();
      expect(health.platform).toBe(platform);
      expect(typeof health.healthy).toBe("boolean");
    }
  });
});
