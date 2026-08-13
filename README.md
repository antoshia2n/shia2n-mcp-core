# shia2n-mcp-core

起動時の状態取得とタスク管理だけを持つ、独立した MCP の口。

判断記録：https://www.notion.so/3ab9c6c1c439814cb456e292bbfc19e8
タスク：https://www.notion.so/3ab9c6c1c439811cb545d59204ea1b5d

## 持っている道具（6 本・これ以外は入れない）

- munikis__get_context
- taskmaster__list_tasks
- taskmaster__add_task
- taskmaster__update_task
- taskmaster__create_project
- taskmaster__delete_project

## 持っていないもの

- 自動で動くもの（cron）。すべて shia2n-mcp 側に残る
- データの控え・復元の道具
- 上記 6 本以外のアプリの道具

## 口

- `/mcp` … MCP の本体（合言葉が要る）
- `/diag` … 点検（合言葉は不要。設定の有無だけを返し、値そのものは返さない）
