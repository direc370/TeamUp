---
name: saiban-development
description: 赛伴竞赛组队、协作与贡献度存证平台的项目专用开发工作流。当用户要求继续开发、修复 Bug、实现下一阶段、整理进度、测试、提交或推送 D:/大学/赛伴 时使用。
agent_created: true
---

# 赛伴持续开发

## 固定范围

- 仅在 `D:/大学/赛伴` 中读写项目文件。
- 保持产品主线：组队前匹配、组队后协作、赛后贡献存证。
- 面向编程初学者，在交付结果之外简要说明本轮关键代码和验收方法。
- 不修改或上传 `D:/大学` 中的其他资料和项目书。

## 每轮工作流

1. 读取 `package.json`、相关源码、Git 状态和最近进度记录，先确认真实现状。
2. 把需求拆成 2–5 个可验收任务，使用任务工具记录；一次推进一个阶段。
3. 优先完成最短可运行闭环，避免超出需求的重构和过早抽象。
4. 修改现有文件前先读取；所有新文件均放在 `D:/大学/赛伴`。
5. 至少执行：
   - `npm --prefix "D:/大学/赛伴" run build`
   - 涉及用户交互时，启动 Vite 并用真实浏览器检查关键流程。
6. 测试失败时先定位根因，不跳过检查，不把部分完成标为完成。
7. 更新 `.workbuddy/memory/YYYY-MM-DD.md`，只记录简短进度和重要决策。
8. 提交前检查 `git status` 和暂存内容，确保没有敏感或无关文件。
9. 生成单一、明确的提交；远端已配置且用户已授权自动推送时执行普通 `git push`。
10. 禁止自动强推、改写历史、删除远端分支或覆盖他人改动；出现冲突或远端新提交时停止并说明。

## Git 安全规则

永不提交：

- `node_modules/`
- `dist/`
- `.env`、`.env.*`（允许 `.env.example`）
- `.workbuddy/memory/`
- 本机日志、缓存、编辑器配置
- 密钥、访问令牌、数据库密码
- DOCX 项目书和 `D:/大学` 下其他文件

提交前运行：

```bash
git -C "D:/大学/赛伴" status --short
git -C "D:/大学/赛伴" diff --cached
```

构建或测试没有通过时，不提交“已完成”结果。自动推送授权仅覆盖普通 push，不覆盖 force push、发布、部署、PR 或仓库设置修改。

## 当前阶段顺序

以2026-09-10计划书为准，旧Supabase实施步骤不再作为待办重复执行。

- 已有：React组队MVP、Supabase认证与四表RLS、收藏/申请/撤回/再次申请、Pages演示；NestJS/Prisma基础与三数据源适配。
- P0：可复现启动、环境校验、依赖审计和回归基线。
- 代码已推进：独立认证/会话、审批与成员、任务事件与贡献去重、Prisma独立迁移文件。
- 未验收：真实PostgreSQL migrate、双账号浏览器、国内部署、法律存证。
- P1：独立PostgreSQL迁移、隔离数据库、备份恢复验证。
- P2：独立注册登录与会话撤销、用户档案、前端认证解耦。
- P3：真实API多账号联调、旧数据过渡与回滚。
- P4：队长审批、成员关系、满员及并发保护。
- P5：国内小范围试用部署、安全、备份、移动端验收。
- P6：协作任务；实施前核对V4.0项目书中的五态规则。
- P7：追加式事件与可追溯贡献报告，不宣称法律存证。

API模式仍从Supabase取得会话令牌；HS256验签器不是独立认证。Prisma生成和构建通过不等于迁移或真实数据库验收。当前裸成功响应在未来变更统一响应时须前后端同步迁移。

## 可复现开发基线

- Node.js 22（本轮机器22.22.2），优先npm ci按锁文件安装；不要无故升级latest依赖。
- 根目录执行npm ci，服务端执行npm --prefix server ci。两份package-lock.json均须保留。
- 本地前端：npm run dev -- --host 127.0.0.1；地址通常为http://127.0.0.1:5173/TeamUp/，以终端实际输出为准。
- 根.env.local配置VITE_DATA_PROVIDER=local可明确使用本地演示；不覆盖已有配置。supabase需要URL与anon key；api需要绝对VITE_API_BASE_URL且认证仍为过渡实现。VITE变量全部公开，不能存服务端秘密。
- 服务端.env.example复制为server/.env后需自行填写数据库与随机JWT秘密；占位JWT会被拒绝。CORS_ORIGINS填纯origin（例如http://localhost:5173），不能带/TeamUp/或末尾斜杠；若用127.0.0.1访问需另加该origin。
- 根执行npm run api:dev启动后端；npm run api:start正常启动。启动会连接数据库；没有已准备的数据库不能声称API可用，不能照搬Supabase依赖auth对象的SQL。
- 前端测试构建：npm run test:run、npm run build；后端：npm run api:test、npm run api:build。后端build会生成Prisma Client，不会创建表。
- npm audit及npm --prefix server audit分别检查；记录告警，不用--force。单测中的测试密钥、模拟数据库地址不能用于部署。
- server对@nestjs/platform-express的multer使用2.3.0定向override以避免2.2.0审计告警；升级Nest时核对上游依赖及审计，再决定是否移除override，不直接删除。
- 2026-09-10审计：前端0；后端仍3项high（prisma→@prisma/config→deepmerge-ts），--omit=dev核验亦报告3项，不能声称生产依赖零告警。需后续验证兼容补丁或隔离Prisma工具链，不使用--force。
- 当前API客户端路径校验较严格，包含空格或URL值的查询字符串可能被拒绝；现有端点不使用此类查询，后续分页/搜索应拆分路径与query验证并补兼容测试。

## 多Agent协作

总控先冻结接口和文件归属，再并行派后端、前端、测试。每文件同时只有一个写入负责人；共享配置和锁文件由总控协调。测试Agent不直接修改业务文件；独立Agent不提交推送，由总控检查实际diff、跑全量测试后统一提交。遇外部阻塞继续无依赖任务，但准确标明待验收。output/中的文档及验收记录不上传，三份学习与产品Markdown不自动加入Git。

## 新会话启动

需要跨会话继续时，读取 `references/start-prompt.md` 作为启动上下文；先核实代码和 Git 状态，不仅依赖提示词中的历史描述。
