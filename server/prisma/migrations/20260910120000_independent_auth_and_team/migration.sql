-- Independent PostgreSQL. Do not reference supabase.auth.uid().
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE "membership_role" AS ENUM ('owner', 'member');
CREATE TYPE "task_status" AS ENUM ('todo', 'claimed', 'submitted', 'accepted', 'cancelled');

CREATE TABLE "auth_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "profile_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_credentials_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auth_credentials_email_key" UNIQUE ("email"),
    CONSTRAINT "auth_credentials_profile_id_key" UNIQUE ("profile_id"),
    CONSTRAINT "auth_credentials_email_format" CHECK (char_length(email::text) >= 3 AND position('@' in email::text) > 1),
    CONSTRAINT "auth_credentials_password_hash_not_empty" CHECK (char_length(password_hash) >= 20),
    CONSTRAINT "auth_credentials_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auth_sessions_refresh_hash_not_empty" CHECK (char_length(refresh_hash) >= 32),
    CONSTRAINT "auth_sessions_expires_after_created" CHECK ("expires_at" > "created_at"),
    CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "auth_sessions_refresh_hash_idx" ON "auth_sessions"("refresh_hash");
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

CREATE TABLE "memberships" (
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "membership_role" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "memberships_pkey" PRIMARY KEY ("project_id", "user_id"),
    CONSTRAINT "memberships_project_id_user_id_key" UNIQUE ("project_id", "user_id"),
    CONSTRAINT "memberships_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "memberships_one_owner_per_project" ON "memberships"("project_id") WHERE "role" = 'owner';

CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "task_status" NOT NULL DEFAULT 'todo',
    "assignee_id" UUID,
    "due_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tasks_title_not_empty" CHECK (char_length(btrim(title)) >= 1),
    CONSTRAINT "tasks_assignee_required_when_claimed" CHECK (
      ("status" IN ('todo', 'cancelled') AND "assignee_id" IS NULL)
      OR ("status" IN ('claimed', 'submitted', 'accepted') AND "assignee_id" IS NOT NULL)
    ),
    CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "task_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "task_events_type_not_empty" CHECK (char_length(btrim(type)) >= 1),
    CONSTRAINT "task_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "task_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "task_events_task_id_idx" ON "task_events"("task_id");
CREATE INDEX "task_events_actor_id_idx" ON "task_events"("actor_id");
