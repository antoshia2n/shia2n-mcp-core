/**
 * 点検の口（GET /diag）
 *
 * 合言葉なしで開ける。そのため、設定の「あり／なし」と長さだけを返し、
 * 値そのものは絶対に返さない。
 *
 * 元の shia2n-mcp の点検の口と揃えてある点：
 *   - 版番号は version.ts の 1 か所だけを読む
 *   - 実行記録（last_runs）を同じ置き場から読んで出す
 *
 * 2026-08-12 の学び（shia2n-mcp v0.50.0）を先に入れてある：
 *   「あり／なし」だけだと、貼り付けのときに一部が欠けた値も「あり」に見える。
 *   長さと前後の空白の有無まで出しておくと、値が悪いのか決まりが悪いのかを
 *   画面から切り分けられる。
 */
import { APP_VERSION } from "./version.js";
import { readAllRuns } from "./cron-log.js";
import type { Env } from "./index.js";

function shapeOf(raw: string | undefined): {
  設定: string;
  文字数: number | null;
  前後の空白: boolean | null;
} {
  if (!raw) return { 設定: "未設定", 文字数: null, 前後の空白: null };
  return {
    設定: "設定あり",
    文字数: raw.length,
    前後の空白: raw !== raw.trim(),
  };
}

export async function handleDiag(env: Env): Promise<Response> {
  let runs: unknown = null;
  let runsError: string | null = null;

  try {
    runs = await readAllRuns(env);
  } catch (error) {
    runsError = error instanceof Error ? error.message : String(error);
  }

  return Response.json(
    {
      name: "shia2n-mcp-core",
      version: APP_VERSION,
      checked_at: new Date().toISOString(),
      道具: [
        "munikis__get_context",
        "taskmaster__list_tasks",
        "taskmaster__add_task",
        "taskmaster__update_task",
        "taskmaster__create_project",
        "taskmaster__delete_project",
      ],
      設定: {
        MCP_SERVER_SECRET: shapeOf(env.MCP_SERVER_SECRET),
        MCP_DEFAULT_USER_ID: shapeOf(env.MCP_DEFAULT_USER_ID),
        NOTION_TOKEN: shapeOf(env.NOTION_TOKEN),
        FIREBASE_SA_EMAIL: shapeOf(env.FIREBASE_SA_EMAIL),
        FIREBASE_SA_PRIVATE_KEY: shapeOf(env.FIREBASE_SA_PRIVATE_KEY),
        NAOKI_UID: shapeOf(env.NAOKI_UID),
      },
      置き場: {
        OAUTH_KV: env.OAUTH_KV ? "設定あり" : "未設定",
      },
      // 実行記録を書いているのは shia2n-mcp 側。ここは同じ置き場を読むだけ。
      // 中身が空なら、置き場の結び付けが違っている可能性が高い。
      last_runs: runs,
      last_runs_error: runsError,
    },
    {
      headers: { "Access-Control-Allow-Origin": "*" },
    }
  );
}
