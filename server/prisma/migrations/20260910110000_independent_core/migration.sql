-- Independent PostgreSQL core tables. Do not reference supabase.auth.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE "project_status" AS ENUM ('draft', 'open', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "application_status" AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "profiles" (
    "id" UUID NOT NULL,
    "display_name" TEXT NOT NULL DEFAULT '',
    "school" TEXT NOT NULL DEFAULT '',
    "major" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_display_name_length" CHECK (char_length(display_name) <= 40),
    CONSTRAINT "profiles_bio_length" CHECK (char_length(bio) <= 300)
);

CREATE TABLE IF NOT EXISTS "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "weekly_commitment" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '待完善地点',
    "needed_members" SMALLINT NOT NULL DEFAULT 1,
    "skills" TEXT[] NOT NULL DEFAULT '{}',
    "status" "project_status" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "projects_title_length" CHECK (char_length(title) BETWEEN 4 AND 50),
    CONSTRAINT "projects_description_length" CHECK (char_length(description) BETWEEN 10 AND 300),
    CONSTRAINT "projects_needed_members_range" CHECK (needed_members BETWEEN 1 AND 20),
    CONSTRAINT "projects_skills_count" CHECK (cardinality(skills) BETWEEN 1 AND 5),
    CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "applicant_id" UUID NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "status" "application_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "applications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "applications_message_length" CHECK (char_length(message) <= 500),
    CONSTRAINT "applications_unique_applicant" UNIQUE ("project_id", "applicant_id"),
    CONSTRAINT "applications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "saved_projects" (
    "user_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_projects_pkey" PRIMARY KEY ("user_id", "project_id"),
    CONSTRAINT "saved_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "saved_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "projects_status_created_at_idx" ON "projects"("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "projects_owner_id_idx" ON "projects"("owner_id");
CREATE INDEX IF NOT EXISTS "applications_project_id_idx" ON "applications"("project_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "applications_applicant_id_idx" ON "applications"("applicant_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "saved_projects_user_id_idx" ON "saved_projects"("user_id", "created_at" DESC);
