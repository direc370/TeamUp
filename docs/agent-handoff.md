# 赛伴 Agent 交接包（2026-09-10）

下一任 Agent 请先读完本文再改代码。本文不是上线证明。

## 0. 硬约束

- 唯一工作区：`D:/大学/赛伴`。仓库：`https://github.com/direc370/TeamUp.git`。
- 不要删除用户个人资料。不要读取真实 `.env` 内容，不要把密钥写进回复或 Git。
- 不要擅自购买云资源、不要把 compose 端口改成 `0.0.0.0`。
- 不要把三份未跟踪个人稿提交进 Git：
  - `全景整合_项目构想与学业执行体系.md`
  - `给老师Agent的教学Prompt.md`
  - `计算机学习路线图.md`
- `.docx` / `.pdf` / `output/` 已在 `.gitignore`。执行 Agent 不要各自 `git push`；由总控统一提交。
- Windows 上 Prisma CLI：`node ./node_modules/prisma/build/index.js`（在 `server/`），不要依赖 PATH 上的 `prisma`。
- 不要并发 `npm ci`。锁文件里 `bcryptjs@3.0.3` 曾手补。

## 1. 当前 Git 事实

| 项 | 值 |
| --- | --- |
| HEAD | `b206eed` `feat: add independent auth, memberships, and task events` |
| 远程 HEAD | 与 `b206eed` 一致（`git ls-remote origin HEAD`） |
| 工作区代码 | 与 HEAD 干净 |
| 未跟踪 | 仅上述三份个人 Markdown |
| `origin/main [gone]` | 本地跟踪引用异常，以 ls-remote 为准，不要 `reset --hard` |

GitHub Pages：`https://direc370.github.io/TeamUp/` 仍可能走 Supabase / 演示 provider。普通 push 会触发 Pages。不要改演示默认 provider 除非产品明确要求。

## 2. 产品一句话

赛伴 = 高校竞赛协作过程工具（发现组队 → 入队 → 任务 → 过程可见）。

定位不是法律存证、不是微信替代、不是综测打分器。

产品下版（已写、未实现）主题：**把工作台从只读做成可操作，让入队后 72h 内能完成一次接单→提交→验收。**

产品方案 Word（本地，未入 Git）：

- `D:/大学/赛伴/赛伴产品迭代升级方案_PM_V1.docx`
- 会话产物：`C:/Users/Dell/WorkBuddy/2026-09-07-22-01-45/output/saiban-pm-iteration-20260910/stage3/output.docx`

开发计划书（本地）：`D:/大学/赛伴/赛伴文件梳理与开发计划书.docx`

未验收清单：`docs/unverified-acceptance.md`  
迁移检查表：`docs/data-migration-checklist.md`  
旧 P0 契约：`output/saiban-plan-20260910/p0-agent-contract.txt`（gitignore，本机才有）

## 3. 技术栈与运行

| 层 | 事实 |
| --- | --- |
| 前端 | React 18 + Vite + TS，目录 `src/` |
| 后端 | NestJS + Prisma，目录 `server/` |
| 数据模式 | `VITE_DATA_PROVIDER=local\|supabase\|api` |
| api 模式 | 自有登录；会话键 `saiban:api-session`；不要再用 Supabase session |
| JWT | access 15min HS256 `iss=saiban aud=saiban-api`；refresh 可撤销；bcryptjs cost 12 |
| 登录限流 | 同 IP + email 每分钟 5 次 |
| 登录响应形状 | `{ accessToken, refreshToken, user: { id, email } }` |

环境模板（只读这些 example，勿 cat 真实 env）：

- 根 `.env.example`：`VITE_DATA_PROVIDER`、`VITE_API_BASE_URL`（必须绝对 http(s)，禁用户名密码/query/fragment）
- `server/.env.example`：`PORT`、`CORS_ORIGINS`、`DATABASE_URL`、`AUTH_JWT_SECRET`（≥32 字符）

前端请求：`src/lib/api.ts` — path 禁止 scheme、`//`、`..`。无 token 不加 Authorization。非 2xx 抛错，网络失败不得静默当成功。

统一响应：新接口尽量 `{ success, data, message, timestamp }`；错误 `{ success: false, error: { code, message, details } }`。历史 `/api/v1` 有裸成功兼容，改契约前先对齐前端。

## 4. 代码地图（下一棒从这里改）

**后端（server 独占）**

- 认证：`server/src/auth/`（service, controller, repository, token, jwt, password hasher）
- 申请审批：applications 队长 list / approve / reject
- 项目：`memberCount`
- 任务：状态机 + TaskEvent；贡献按人+任务+type 去重
- 迁移：
  - `server/prisma/migrations/20260910110000_independent_core`
  - `server/prisma/migrations/20260910120000_independent_auth_and_team`
- PG 示例（未启动）：`server/docker-compose.postgres.yml`，仅 `127.0.0.1:5432`

**前端（src 独占）**

- `src/App.tsx`：发现流、申请箱、只读工作台、空账本
- `src/lib/repository.ts`、`auth-session.ts`、`api.ts`
- `src/components/Auth.tsx`

**总控**

- 根 `package.json` / lock / CI
- 不要让子 Agent 改对方目录

## 5. 已完成 vs 未完成（禁止说错）

**已完成（代码 + 单测，已推 `b206eed`）**

- 独立注册 / 登录 / refresh / logout
- 队长审批 → Membership；满员关招募
- 任务事件与贡献去重
- 前端 49、后端 114 项测试在当时通过；`server/dist` 曾生成
- Prisma 依赖审计仍有 3 high（Prisma / deepmerge-ts），multer override `2.3.0`。不要 `--force` 升级除非单独立项

**未完成（测试通过 ≠ 上线）**

- [ ] 本机 Docker PG 启动 + `prisma migrate`（需用户明确同意）
- [ ] 双账号浏览器：A 发帖、B 申请、A 过、成员可见、同一任务验收
- [ ] 工作台可写（创建 / 接单 / 提交 / 验收）——产品 V1.1 的 P0，代码尚未做
- [ ] 「我的队伍」页、申请动机字段、账本时间线
- [ ] 发现页去掉未验证的用户数 / 匹配度包装
- [ ] 国内 API + DB + HTTPS
- [ ] 法律存证（不要做、不要写已完成）
- [ ] OpenViking（非上线依赖，不要当阻塞）

## 6. 建议下一 Agent 的第一件实现（V1.1 P0）

目标用户：队长和刚入队的队员。痛点：入队后页面无活可干。

最小切片（一次 PR 能验收）：

1. 后端：任务创建 / 接单 / 提交 / 队长验收 API 对前端暴露且鉴权以 token `sub` 为准。
2. 前端工作台：上述四按钮；空状态引导「做一个 2 小时能完成的任务」。
3. 申请：动机 ≤80 字；禁止申请自己的项目。
4. 成员列表只读。
5. 文案：过程记录，不是法律存证。

测试矩阵：未登录 401；伪造 JWT 拒绝；B 不能审批 A 的队；非法状态跳转；贡献去重仍成立。

真实 PG 与双账号未勾选前，PR 描述必须写「未联调」。

## 7. 本地启动备忘（不要在交接时自动执行）

用户同意后再做：

```text
# server/.env 自行填写，勿提交
# docker compose -f server/docker-compose.postgres.yml up -d
# cd server && node ./node_modules/prisma/build/index.js migrate deploy
# 根目录：按 package.json 的 api:dev / 前端 Vite
# VITE_DATA_PROVIDER=api
# VITE_API_BASE_URL=http://localhost:3000/api/v1/
```

## 8. 给下一窗口的开场提示词（可复制）

```text
你在 D:/大学/赛伴 工作，仓库 TeamUp，HEAD b206eed。先读 docs/agent-handoff.md 与 docs/unverified-acceptance.md。
不要提交三份个人 Markdown，不要读真实 .env，不要买云，不要宣称已法律存证或已国内部署。
本轮只做产品 V1.1 P0：工作台可写（创建/接单/提交/验收）+ 申请动机 + 成员只读列表。
后端只改 server/，前端只改 src/，不要并发 npm ci。Windows Prisma 用 node ./node_modules/prisma/build/index.js。
测通单测即可开 PR 说明；真实 PG 与双账号浏览器仍待用户授权后再做。
```
