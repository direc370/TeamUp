---
name: saiban-multiagent
description: 赛伴项目的多 Agent 编排工作流，定义总控如何冻结接口与文件归属、并行派发后端/前端/测试审查子 Agent 并统一验收提交。当需要并行推进多个开发任务、拆分前后端与测试分工、或协调子 Agent 时使用。
agent_created: true
---

# 赛伴多 Agent 编排

本 Skill 只负责「如何组织多个 Agent 一起推进 `D:/大学/赛伴` 的开发」，不定义业务需求本身。业务范围、阶段顺序、Git 安全规则见 `saiban-development`；本 Skill 是它的编排执行层。

## 角色与职责

| 角色 | 职责 | 禁止 |
| --- | --- | --- |
| 总控（编排者） | 冻结接口与文件归属、拆任务、派发、审查实际 diff、跑全量测试、统一提交推送 | 亲自写全部代码、把 Mock 通过说成真实联调 |
| 后端 Agent | NestJS/Prisma 服务端实现、DTO、迁移文件 | 改前端文件、改共享锁文件、提交推送 |
| 前端 Agent | React/Vite 页面与交互、类型、样式 | 改后端文件、改共享锁文件、提交推送 |
| 测试/审查 Agent | 单测/构建/浏览器验收、代码审查 | 直接改业务文件、绕过验收报通过 |

## 一阶段前的总控冻结

派发任何子 Agent 前，总控必须先做三件事，并写入当轮任务说明：

1. **接口冻结**：后端先定好路由、出入参 DTO 形状；前端按该形状写类型。接口变更必须由总控统一广播，禁止一方私自改契约。
2. **文件归属**：每个文件同时只有一个写入负责人。前端、后端各占自己的目录；共享文件（`package.json`、两份 `package-lock.json`、`.env*`、`vite.config.ts`、`schema.prisma`）由总控独占协调。
3. **验收口径**：明确本轮「完成」的可观察标准（如：某接口返回 200 + 前端真实浏览器走通某路径）。

## Agent 定义文件

派发子 Agent 时，直接以 `agents/` 目录下的定义文件作为其系统提示词起点，再注入当轮的接口契约与文件归属：

- `agents/orchestrator.md` — 总控/编排者
- `agents/backend.md` — 后端 Agent（NestJS + Prisma）
- `agents/frontend.md` — 前端 Agent（React + Vite + TS）
- `agents/qa-review.md` — 测试/审查 Agent

## 并行派发模式

- 前后端解耦时用并行派发：总控同时发后端、前端子 Agent，各自独立实现，互不阻塞。
- 前后端有依赖时先派后端，接口契约冻结后再派前端，避免反复返工。
- 测试/审查 Agent 在实现完成后派发，或在实现并行时同步做静态审查。

## 子 Agent 交接约定

每个子 Agent 返回时须包含：

- 改了哪些文件（含相对路径 + 关键行号）
- 新增/变更的对外接口或组件
- 自测结果（命令 + 结论），未验证项明确标注「待验收」而非「完成」
- 已知阻塞或依赖的外部条件

## 总控收口（必须，不能交给子 Agent）

1. 用 `git -C "D:/大学/赛伴" diff` 检查每个子 Agent 的实际改动，不轻信其口头总结。
2. 跑全量校验：根 `npm run build`、`npm run test:run`，服务端 `npm --prefix server run build`、`npm --prefix server run test`。
3. 交互功能用真实浏览器走关键路径，不以「类型通过」或「Mock 返回」代替。
4. 校验全部通过后才创建单一 commit 并普通 push；失败则退回对应子 Agent 修复，不把部分完成标为完成。

## 阻塞处理

外部数据库、部署、真实环境不可用时，总控回到无依赖任务继续推进；但必须在每轮汇报里准确写出「哪些项仍是待验收」，绝不把 Mock/本地演示说成真实联调完成。

## 与 saiban-development 的关系

- `saiban-development` = 业务范围 + 开发基线 + Git 安全 + 阶段路线。
- 本 Skill = 多 Agent 的派发、冻结、收口与验收协议。
- 两者冲突时，以 `saiban-development` 的范围与安全规则为准，本 Skill 负责编排不越界。