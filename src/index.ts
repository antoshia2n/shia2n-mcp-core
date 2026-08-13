/**
 * shia2n-mcp-core エントリーポイント v0.1.0（版の実物は version.ts の APP_VERSION を見る）
 *
 * v0.1.0：新設（2026-08-13）
 *   判断記録：https://www.notion.so/3ab9c6c1c439814cb456e292bbfc19e8
 *   タスク：https://www.notion.so/3ab9c6c1c439811cb545d59204ea1b5d
 *
 *   shia2n-mcp から「起動時の状態取得」と「タスク管理」の 6 本だけを
 *   独立した 1 本として切り出したもの。
 *   どのチャットも大きい 1 本を切れるようにするのが目的で、
 *   起動に要る道具がそちらに入っている限り切れないため、ここが第 1 弾になる。
 *
 *   元の shia2n-mcp 側の 6 本はそのまま残す（切替の間の二重運用）。
 *   安定を見てから、別のタスクで向こうを削る。
 *
 *   自動で動くもの（cron）はこちらに持ってこない。実行記録を書くのは
 *   引き続き shia2n-mcp 側で、こちらは同じ置き場を読むだけ。
 */
import { APP_VERSION } from "./version.js";
import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import { AuthHandler } from "./auth-handler.js";
import { registerMunikisTools } from "./tools-munikis.js";
import { registerTaskmasterTools } from "./tools-taskmaster.js";
import { handleDiag } from "./diag.js";

export interface Env {
  // 入口
  MCP_SERVER_SECRET: string;
  MCP_DEFAULT_USER_ID: string;
  // 合言葉と実行記録の置き場（shia2n-mcp と同じものを共用する）
  OAUTH_KV: KVNamespace;
  // munikis__get_context が読む Notion
  NOTION_TOKEN: string;
  // taskmaster__* が読み書きする Firestore
  FIREBASE_SA_EMAIL: string;
  FIREBASE_SA_PRIVATE_KEY: string;
  NAOKI_UID: string;
}

function createMcpServer(env: Env): McpServer {
  const server = new McpServer({ name: "shia2n-mcp-core", version: APP_VERSION });
  registerMunikisTools(server, env);
  registerTaskmasterTools(server, env);
  return server;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const mcpApiHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const server = createMcpServer(env);
    return createMcpHandler(server, { route: "/mcp" })(request, env, ctx);
  },
};

const oauthProvider = new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: mcpApiHandler,
  defaultHandler: AuthHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
  resolveExternalToken: async ({ token, env: rawEnv }) => {
    const env = rawEnv as Env;
    if (!env.MCP_SERVER_SECRET) return null;
    if (!timingSafeEqual(token, env.MCP_SERVER_SECRET)) return null;
    return {
      userId: env.MCP_DEFAULT_USER_ID,
      props: { userId: env.MCP_DEFAULT_USER_ID },
    };
  },
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
        },
      });
    }

    // 点検の口（合言葉は不要・設定の値そのものは返さない）
    if (url.pathname === "/diag" && request.method === "GET") {
      return handleDiag(env);
    }

    return oauthProvider.fetch(request, env, ctx);
  },
};
