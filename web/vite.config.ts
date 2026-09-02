/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// バックエンド(Express)は npm run dev（リポジトリルート）で localhost:3000 に立つ。
// 開発時はここから /dashboard-api と /oauth をそのまま転送する。
const BACKEND_ORIGIN = "http://localhost:3000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/dashboard-api": { target: BACKEND_ORIGIN, changeOrigin: true },
      "/oauth": { target: BACKEND_ORIGIN, changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
