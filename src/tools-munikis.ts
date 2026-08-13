/**
 * 道具の登録：munikis__get_context（1 本だけ）
 *
 * 元の shia2n-mcp の tools-munikis.ts には 3 本（get_context・cron_selftest・
 * backup_now）が入っているが、この置き場に持ってくるのは get_context だけ。
 * 残り 2 本は自動で動くものと控えの置き場に紐づいており、
 * どちらも shia2n-mcp 側に残すと決まっているため。
 *
 * recent_runs は shia2n-mcp 側が書いた実行記録を、同じ置き場から読んで返す。
 * こちらは書かない（自動で動くものを持っていないため）。
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchMunikisContext } from "./munikis-client.js";
import { readAllRuns } from "./cron-log.js";
import type { Env } from "./index.js";

export function registerMunikisTools(server: McpServer, env: Env): void {
  server.tool(
    "munikis__get_context",
    "Claude 起動時の状態取得を 1 回にまとめる。指定チャット種別の直近 Sessions 申し送り + オープン Decisions + 進行中 Tasks + MUNIKIS_VISION URL を返す。fetched_at と source を含むため MCP キャッシュと Notion 実状態の乖離を検知可能。SOT は Notion のまま（本ツールは Notion API を裏で読む thin ラッパ）。",
    {
      chat_type: z
        .string()
        .min(1)
        .describe(
          "Sessions のチャット種別フィルタ（例: '会員管理くん' / 'shia2n-mcp' / '統括ハブ' / 'シアニン担当' / '経理系' / '案件系' など Sessions DB のチャット種別プロパティ値と一致する文字列）"
        ),
      n_sessions: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe("返却する直近セッション数（1-10・デフォルト 3）"),
    },
    async ({ chat_type, n_sessions }) => {
      const [result, recent_runs] = await Promise.all([
        fetchMunikisContext(env.NOTION_TOKEN, {
          chat_type,
          n_sessions: n_sessions ?? 3,
        }),
        readAllRuns(env),
      ]);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ...result, recent_runs }, null, 2),
          },
        ],
      };
    }
  );
}
