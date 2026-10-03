继续开发本地项目 `D:/大学/赛伴`。

1. 先读 `AGENT.md`、`docs/TASKS.md`、`docs/agent-handoff.md`、`docs/pm-plan-v1.2-senior-feedback.md`，再核验 `git status --short`、HEAD、相关代码和测试。历史文档不能替代真实代码与 Git 状态。
2. 当前唯一产品方向是：组队前对齐缺口角色、每周投入、目标层级；入队后最多 1–5 条轻量里程碑并可复制到微信。按 P0 组队对齐 → P1 我的队伍只读 → P2 极薄里程碑推进。
3. 不做法律存证、信用/贡献排行、综测证明、替代微信、陌生人私聊、重型任务看板或提交—验收主流程；不把 Mock 或本地数据说成真实效果。
4. 先将本轮拆为可验收任务，再做最小闭环。前端通过 `src/lib/repository.ts`，后端保持 NestJS Controller → Service → Repository 和 DTO 校验。不要覆盖已有未提交改动。
5. 代码改动后运行对应测试与构建：根目录 `npm run test:run`、`npm run build`；服务端 `npm run api:test`、`npm run api:build`。交互功能需要浏览器验证；未跑真实 PostgreSQL、双账号或部署时，明确写“待环境验证”。
6. 不读真实 `.env`，不自动启动 Docker、运行迁移、部署、购买资源或 push。提交与推送遵循 `AGENT.md`；多 Agent 时加载 `saiban-multiagent`，子 Agent 不提交推送。
7. 每轮结束更新 `docs/TASKS.md`、`docs/agent-handoff.md` 与当天 `.workbuddy/memory/YYYY-MM-DD.md`；报告范围、实际改动、测试证据、待环境验证、Git 状态和下一步。
