# Supabase → 自有 PostgreSQL 迁移检查表

本文是**检查表**，不执行迁移、不连接远端、不导出真实用户数据。

目标库形态参考 `server/prisma/schema.prisma` 与本地示例 `server/docker-compose.postgres.yml`（Postgres 16，`127.0.0.1:5432`）。

## 迁移前

- [ ] 书面确认源项目（Supabase URL/项目名）与目标库（自有 PG，非付费云试用账户除非已有合规采购）。
- [ ] 冻结写入窗口或打开只读维护公告。
- [ ] 导出前备份：`pg_dump`（自定义格式）+ 对象存储清单（若有头像等，当前代码几乎无存储桶逻辑）。
- [ ] 备份校验：另机 `pg_restore --list`，记录行数：`profiles` / `projects` / `applications` / `saved_projects`。
- [ ] 保存回滚包：dump 文件哈希、备份时间、执行人。

## 表映射

| Supabase / 前端类型 (`src/lib/database.types.ts`) | 自有 PG (`schema.prisma` @@map) | 注意 |
| --- | --- | --- |
| `auth.users` | `profiles.id`（UUID，无密码列） | 身份仍可能在外部 IdP；不可把 anon key 当服务端密钥。 |
| `projects` | `projects` | 字段：`owner_id`→`ownerId`，`weekly_commitment`，`needed_members`，`skills` 数组，`status` 枚举。 |
| `applications` | `applications` | 唯一键 `(project_id, applicant_id)`；状态 pending/approved/rejected/withdrawn。 |
| `saved_projects` | `saved_projects` | 复合主键 `(user_id, project_id)`。 |

未在 Prisma 中的 Supabase 系统表（`auth.*`、`storage.*`）**不要**直接 restore 到应用 schema。

## 数据一致性

- [ ] `projects.owner_id` 均能在 `profiles.id` 找到，否则先补 profile 再插项目。
- [ ] `applications.applicant_id` / `saved_projects.user_id` 同样需要 profile。
- [ ] 枚举值大小写与 Prisma enum 一致。
- [ ] `timestamptz` 时区：统一 UTC 存储。

## 应用切换（不在本次执行）

- [ ] `DATABASE_URL` 指向自有 PG（`server/.env`，已列入 gitignore）。
- [ ] 前端 `VITE_DATA_PROVIDER=api` 且 `VITE_API_BASE_URL` 为本机/境内 API，而不是继续直连 Supabase。
- [ ] JWT：`AUTH_JWT_SECRET` 与签发方一致；**不要**假设 Supabase access_token 可被 Nest HS256 直接验证。
- [ ] RLS：自有 PG 无 RLS 时，**必须**由 API 强制 userId，禁止把表暴露给前端。

## 回滚

- [ ] 保留切流前的 DNS/环境变量快照。
- [ ] 回滚顺序：停写新库 → 恢复旧连接串 → 用备份点验证行数 → 再开放写入。
- [ ] 禁止在未校验备份的情况下 `DROP SCHEMA`。
- [ ] 回滚后审计：抽查 3 个项目的 owner、申请状态、收藏是否回到切流前。

## 本次任务约束

- 不执行 `pg_dump` / `pg_restore` / migrate。
- 不创建付费云数据库。
- 不删除任何个人资料或用户行。
