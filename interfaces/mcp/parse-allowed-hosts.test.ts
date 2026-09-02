import { describe, expect, it } from "vitest";
import { parseAllowedHosts } from "./parse-allowed-hosts.js";

describe("parseAllowedHosts", () => {
  it("returns undefined when the env var is undefined", () => {
    expect(parseAllowedHosts(undefined)).toBeUndefined();
  });

  it("returns undefined for an empty string (実際にローカルで全リクエスト403の原因になった)", () => {
    expect(parseAllowedHosts("")).toBeUndefined();
  });

  it("returns undefined for a whitespace-only string", () => {
    expect(parseAllowedHosts("   ")).toBeUndefined();
  });

  it("parses a single host", () => {
    expect(parseAllowedHosts("mcp.example.com")).toEqual(["mcp.example.com"]);
  });

  it("parses comma-separated hosts and trims whitespace", () => {
    expect(parseAllowedHosts(" mcp.example.com , admin.example.com ")).toEqual([
      "mcp.example.com",
      "admin.example.com",
    ]);
  });

  it("drops empty entries from trailing commas", () => {
    expect(parseAllowedHosts("mcp.example.com,")).toEqual(["mcp.example.com"]);
  });
});
