# 赛伴 Agent 交接（当前基线）

> 最后重审：2026-09-19。本文是短期事实快照，不是上线证明。长期规则见根目录 `AGENT.md`；唯一任务列表见 `docs/TASKS.md`。

## 先读什么

1. `AGENT.md`：产品边界、安全、协作和验收规则。
2. `docs/TASKS.md`：唯一待办和验收证据位置。
3. `docs/pm-plan-v1.2-senior-feedback.md`：唯一产品决策依据。
4. 按需阅读 `docs/unverified-acceptance.md` 与 `docs/data-migration-checklist.md`。

## 当前产品决策

赛伴第一阶段只做**竞赛组队对接**：发布组队帖、发现筛选、结构化加入申请和队长审批。加入申请必须提供角色/贡献方向、相关经历、每周投入档位和适配理由；作品链接和补充说明选填。

工作台、任务、里程碑、我的队伍成员页、贡献/信用系统、综测工具、微信替代、陌生人社交与法律存证均暂缓，不得在第一阶段界面暴露。

## 本次重审的事实

| 项 | 事实 |
| --- | --- |
| 重审时 HEAD | `c294b59`，提交说明为 `docs: add agent handoff for V1.1 workspace slice` |
| 工作区 | 非干净；已有 Skill、交接、前后端文件及新增文件的改动。下一实现者必须先看 `git diff`，不得假设干净或覆盖。 |
| 前端现状 | `src/App.tsx` 已新增结构化申请弹窗，并从导航和主页面移除了工作台、账本入口；仍需在浏览器完成双账号验证。 |
| 数据模型 | `Application` 已加入 `roleTags`、`experience`、`availability`、`fitReason`、`links`、`note` 及未执行的 Prisma 迁移。 |
| 后端现状 | API 已用 DTO 校验结构化申请，申请箱返回申请人公开资料与申请内容；既有 Task 代码保留但不属第一阶段。 |
| 环境 | 真实 PostgreSQL、双账号浏览器闭环、国内部署、备份恢复、法律存证均未验证。 |

## 2026-10-03 发布前验证

- 前端测试 58 项、后端测试 114 项，以及前后端生产构建均通过。
- 修复了认证限流测试将五次 bcrypt 哈希串行计入 Jest 默认 5 秒时限的问题：该用例现仅模拟哈希，以测试限流本身；生产密码哈希仍保持 bcrypt cost 12。
- GitHub Pages 已配置 HTTPS 和 Supabase 公共前端变量。Pages 仅发布静态前端；真实数据库迁移、双账号浏览器联调与独立 API/数据库部署仍未完成，不能据此宣称完整生产可用。
- 提交 `c218242` 的 GitHub Pages 工作流已成功完成构建和发布；线上地址为 `https://direc370.github.io/TeamUp/`。

## 下一步

执行 `docs/TASKS.md` 的 **P0｜组队对齐闭环**，先冻结字段/API/UI 契约，再分别实现后端与前端。不要先处理重型工作台或贡献功能。

建议的 P0 验收：发布与申请缺少必填对齐信息时被拒绝；自己申请自己的项目被拒绝；发现卡优先展示缺口/时间/目标；不显示无证据的匹配百分比；前后端相关测试和构建通过。

## 运行与安全提醒

- 工作区：`D:/大学/赛伴`；仓库：`https://github.com/direc370/TeamUp.git`。
- 不读取真实环境变量。Prisma 命令在 Windows 上使用 `node ./node_modules/prisma/build/index.js`（从 `server/` 执行）。
- 不自动启动 Docker、迁移、部署或 push。真实 DB/环境验证必须先得到用户明确授权。
- 前端校验：`npm run test:run`、`npm run build`；后端校验：`npm run api:test`、`npm run api:build`。
- 单测/构建通过只可标为“代码完成”；没有真实环境证据时必须标“待环境验证”。

## 交接输出模板

```text
本轮范围：
实际改动：
测试证据（命令 + 结论）：
代码完成：
待环境验证：
Git 状态/提交：
下一最小步骤：
```
