import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["core/**/*.test.ts", "connectors/**/*.test.ts", "interfaces/**/*.test.ts", "test/**/*.test.ts"],
    exclude: ["node_modules/**", "dist/**"],
  },
});
