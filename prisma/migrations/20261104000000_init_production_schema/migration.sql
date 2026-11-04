-- CreateEnum
CREATE TYPE "Role" AS ENUM ('REP', 'MANAGER', 'COMPLIANCE_OFFICER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('Positive', 'Neutral', 'Negative');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'REP',
    "territory" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hcps" (
    "id" TEXT NOT NULL,
    "full_name" VARCHAR(160) NOT NULL,
    "specialty" VARCHAR(120) NOT NULL,
    "tier" VARCHAR(40) NOT NULL DEFAULT 'B',
    "organization" VARCHAR(180) NOT NULL,
    "territory" VARCHAR(120) NOT NULL,
    "consent_status" VARCHAR(40) NOT NULL DEFAULT 'unknown',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hcps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" BIGSERIAL NOT NULL,
    "hcp_id" VARCHAR(40) NOT NULL,
    "hcp_name" VARCHAR(160) NOT NULL,
    "interaction_type" VARCHAR(80) NOT NULL,
    "interaction_date" DATE NOT NULL,
    "interaction_time" VARCHAR(20) NOT NULL,
    "attendees" TEXT NOT NULL DEFAULT '',
    "topics_discussed" TEXT NOT NULL DEFAULT '',
    "materials_shared" JSONB NOT NULL DEFAULT '[]',
    "samples_distributed" JSONB NOT NULL DEFAULT '[]',
    "sentiment" "Sentiment" NOT NULL DEFAULT 'Neutral',
    "outcomes" TEXT NOT NULL DEFAULT '',
    "follow_up_actions" TEXT NOT NULL DEFAULT '',
    "ai_summary" TEXT NOT NULL DEFAULT '',
    "extracted_entities" JSONB NOT NULL DEFAULT '{}',
    "compliance_flags" JSONB NOT NULL DEFAULT '[]',
    "channel" VARCHAR(80) NOT NULL DEFAULT 'field_visit',
    "consent_for_voice_summary" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "interaction_id" BIGINT,
    "hcp_id" TEXT NOT NULL,
    "hcp_name" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'proposed',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(100) NOT NULL,
    "action" VARCHAR(30) NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" VARCHAR(160) NOT NULL,
    "user_role" VARCHAR(40) NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(60),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_interactions_hcp_date" ON "interactions"("hcp_id", "interaction_date" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_user" ON "audit_logs"("user_id");

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_hcp_id_fkey" FOREIGN KEY ("hcp_id") REFERENCES "hcps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "interactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_hcp_id_fkey" FOREIGN KEY ("hcp_id") REFERENCES "hcps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

