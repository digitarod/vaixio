import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Express } from "express";
import express from "express";

const webDist = join(process.cwd(), "web", "dist");

/**
 * ビルド済みのダッシュボードSPA(web/)を配信する。単一VPS・単一プロセス構成を保つため
 * 別のフロントエンド用プロセスは立てない。web/dist が無い(未ビルド/開発環境)場合は
 * 何もマウントしない — ローカルでは `cd web && npm run dev` の別ポートを使えばよい。
 */
export function mountDashboardWeb(app: Express): void {
  if (!existsSync(webDist)) return;

  app.use(express.static(webDist));
  app.get(/^\/(?!mcp|v1|oauth|dashboard-api).*/, (_req, res) => {
    res.sendFile(join(webDist, "index.html"));
  });
}
