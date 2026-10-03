---
name: saiban-development
description: This skill should be used when continuing development, fixing bugs, planning a slice, testing, reviewing changes, or handing off the Saiban project in D:/大学/赛伴. It enforces the current product boundary of team-alignment first and ultra-light milestones only.
agent_created: true
---

# 赛伴持续开发

## 先读取并确认事实

1. 读取 `AGENT.md`、`docs/TASKS.md`、`docs/agent-handoff.md`、`docs/pm-plan-v1.2-senior-feedback.md`；需要迁移时再读 `docs/data-migration-checklist.md`。
2. 检查 `git status --short`、当前 HEAD、相关源码和测试；代码及 Git 现状优先于文档中的历史快照。
3. 不读取真实 `.env` 或 `.env.local`；仅可读取 `.env.example`。
4. 在开始实现前把本轮工作拆为 2–5 个可验收任务，并只推进一个最小闭环。

## 固定产品边界

将赛伴实现为高校竞赛的**组队对齐工具**：一帖组队应清楚表达缺口角色、每周投入和目标层级；进度仅提供每队 1–5 条、可复制到微信的轻量里程碑。

按 `docs/TASKS.md` 的顺序推进：P0 组队对齐 → P1 我的队伍只读 → P2 极薄里程碑。不得用旧 P0–P7 或 DOCX 背景材料扩展范围。

禁止实现或宣传：法律存证、信用/贡献排行、综测证明、替代微信、陌生人私聊广场、重型看板、提交—验收用户主流程、擅自购买云资源。

## 实现规则

- 前端只在 `src/` 中实现，并通过 `src/lib/repository.ts` 访问数据；把可测的纯逻辑放进 `src/logic.ts` 并补测。
- 后端只在 `server/` 中实现，保持 Controller → Service → Repository 分层；所有输入使用 DTO 校验，资源归属从认证上下文取得。
- 新 API 优先使用 `{ success, data, message, timestamp }`；错误使用 `{ success: false, error: { code, message, details } }`。改历史 API 前先冻结并同步前端契约。
- 使用参数化查询；不在日志中输出密码、令牌或连接串；密码保持 bcrypt cost ≥ 12。
- 修改前先读取文件。不要覆盖已有未提交改动，不要无关重构或升级依赖。

## 验证规则

每次涉及代码改动至少运行相关校验；完整切片优先运行：

```bash
npm --prefix "D:/大学/赛伴" run test:run
npm --prefix "D:/大学/赛伴" run build
npm --prefix "D:/大学/赛伴" run api:test
npm --prefix "D:/大学/赛伴" run api:build
```

交互功能还应在真实浏览器执行关键路径。若未运行浏览器、真实 PostgreSQL 或双账号测试，明确写为“待环境验证”。绝不将 Mock、local provider、构建成功或迁移文件存在写成上线、生产可用或真实联调。

不要在没有用户当次明确授权时启动 Docker PostgreSQL、运行迁移、部署、购买资源或公开端口。

## 多 Agent 规则

多 Agent 协作时，加载 `saiban-multiagent`。总控先冻结 API 契约、文件归属和验收口径；一个文件同时仅一个写入负责人。子 Agent 不提交、不推送；总控审查实际 diff、执行全量测试和必要浏览器验收后才可提交。

## Git 与交接

- 不提交 `.env*`（`.env.example` 除外）、`node_modules/`、`dist/`、`output/`、`.workbuddy/memory/`、日志缓存或三份个人 Markdown。
- 提交前检查 `git -C "D:/大学/赛伴" status --short` 与暂存 diff；没有明确授权不要 push，永不 force push。
- 结束时更新 `docs/TASKS.md` 的状态/证据、`docs/agent-handoff.md` 的当前快照，再追加 `.workbuddy/memory/YYYY-MM-DD.md`。
- 跨会话继续时读取 `references/start-prompt.md`，但仍先核验代码与 Git 事实。
