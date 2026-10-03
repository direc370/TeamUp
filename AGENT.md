# 赛伴开发 Agent 规范

> 本文件是 `D:/大学/赛伴` 的长期开发规则。开始任何实现前，先读本文件、`docs/TASKS.md`、`docs/agent-handoff.md` 与 `docs/pm-plan-v1.2-senior-feedback.md`；代码与 Git 事实始终优先于历史记录。

## 1. 产品边界

**当前定位**：赛伴是高校竞赛团队的**组队对齐工具**。一则招募帖应优先对齐缺口角色、每周可投入时间和目标层级；入队后只提供可复制进微信的极薄里程碑。

**本轮产品主线**：

1. P0 组队对齐：发帖和申请均收集可验证的对齐信息。
2. P1 入队闭环：队长审批、满员关闭招募、我的队伍只读。
3. P2 极薄进度：每队 1–5 条里程碑，状态仅未开始/进行中/已完成，可复制微信进度。

**当前明确不做**：法律存证、信用分、贡献排名或账本展示、综测/学院证明、陌生人私聊广场、替代微信、重型任务看板、接单—提交—验收主流程、擅自购买云资源。

产品决策唯一基线是 `docs/pm-plan-v1.2-senior-feedback.md`。根目录 DOCX、`output/` 内草案及旧 P0–P7 路线仅作背景材料，不能直接驱动开发。

## 2. 工作区与安全

- 仅在 `D:/大学/赛伴` 读写；不要改动或上传 `D:/大学` 的个人学习资料和项目书。
- 不读取真实 `.env` / `.env.local` 内容，不在代码、日志、回复或 Git 中暴露密钥、令牌、数据库密码。
- 不启动数据库、执行迁移、购买云资源、部署或暴露端口到 `0.0.0.0`，除非用户在当前会话明确授权。
- 不删除用户数据；迁移或清理前先遵守 `docs/data-migration-checklist.md`。
- 不提交：`.env*`（`.env.example` 除外）、`node_modules/`、`dist/`、`output/`、`.workbuddy/memory/`、日志/缓存，以及三份个人 Markdown：`全景整合_项目构想与学业执行体系.md`、`给老师Agent的教学Prompt.md`、`计算机学习路线图.md`。

## 3. 技术与代码约定

- 前端：React + Vite + TypeScript，位于 `src/`；通过 `src/lib/repository.ts` 访问数据，不绕过数据源适配层。
- 后端：NestJS + Prisma + PostgreSQL，位于 `server/`；维持 Controller → Service → Repository 分层，DTO 负责输入校验。
- 数据模式：`local | supabase | api`。本地演示、单测或构建通过不等于真实 API、真实 PostgreSQL 或生产环境可用。
- 新 API 优先返回 `{ success, data, message, timestamp }`；错误返回 `{ success: false, error: { code, message, details } }`。变更历史接口契约前先同步前端。
- 所有身份与资源归属以认证上下文为准，禁止信任请求体中的用户 ID；输入必须校验，查询必须参数化。
- 密码使用 bcrypt cost ≥ 12；不记录敏感认证信息。

## 4. 任务、协作与 Git

- `docs/TASKS.md` 是唯一任务列表；每项必须有范围、状态、验收标准和证据。
- 每个文件同一时刻只允许一个写入者。前端默认负责 `src/`，后端默认负责 `server/`；根配置、锁文件、Prisma schema、Git 操作由总控协调。
- 多 Agent 时，先按 `.workbuddy/skills/saiban-multiagent/SKILL.md` 冻结接口、文件归属与验收口径；子 Agent 不提交、不推送。
- 修改前读取目标文件；完成后审查实际 diff。不要覆盖工作区内既有未提交改动。
- 提交前检查 `git status --short` 与暂存 diff。仅总控可创建单一、清晰的 commit；没有用户明确授权不 push。严禁 force push、改写历史或删除远端分支。

## 5. 双层验收与交接

**代码完成**仅表示：对应实现、迁移文件（如需要）、单测和构建具备证据。

**环境验证**必须单独记录，且未经实际执行不得宣称完成：真实 PostgreSQL 启动/迁移、双账号浏览器闭环、部署/HTTPS/备份恢复、法律或合规存证。禁止将 Mock、本地 provider 或类型检查称作上线、生产可用或真实联调。

每轮结束更新 `docs/agent-handoff.md` 的事实快照和 `docs/TASKS.md` 的证据；再在 `.workbuddy/memory/YYYY-MM-DD.md` 追加简短过程记录。
