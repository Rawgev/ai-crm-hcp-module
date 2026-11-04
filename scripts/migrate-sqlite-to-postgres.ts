/**
 * Data Migration Script: SQLite to PostgreSQL
 * 
 * Safely extracts legacy HCPs and Interactions from SQLite (test.db)
 * and loads them into PostgreSQL using Prisma ORM.
 */

import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, Sentiment } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateData() {
  console.log("🚀 Starting data migration from SQLite to PostgreSQL...");

  const candidatePaths = [
    resolve(__dirname, "../_original_backup/test.db"),
    resolve(__dirname, "../test.db"),
    resolve(__dirname, "../backend/test.db"),
  ];

  const dbPath = candidatePaths.find((p) => existsSync(p));
  if (!dbPath) {
    console.error("❌ Could not locate existing test.db SQLite file.");
    process.exit(1);
  }

  console.log(`📁 Found SQLite database at: ${dbPath}`);
  const sqlite = new DatabaseSync(dbPath);

  // 1. Migrate HCPs
  const hcps = sqlite.prepare("SELECT * FROM hcps").all() as any[];
  console.log(`📋 Found ${hcps.length} HCP records in SQLite.`);

  for (const hcp of hcps) {
    await prisma.hCP.upsert({
      where: { id: hcp.id },
      update: {
        fullName: hcp.full_name,
        specialty: hcp.specialty,
        tier: hcp.tier,
        organization: hcp.organization,
        territory: hcp.territory,
        consentStatus: hcp.consent_status,
      },
      create: {
        id: hcp.id,
        fullName: hcp.full_name,
        specialty: hcp.specialty,
        tier: hcp.tier,
        organization: hcp.organization,
        territory: hcp.territory,
        consentStatus: hcp.consent_status,
      },
    });
    console.log(`  ✓ Migrated HCP: ${hcp.id} - ${hcp.full_name}`);
  }

  // 2. Migrate Interactions
  const interactions = sqlite.prepare("SELECT * FROM interactions").all() as any[];
  console.log(`📋 Found ${interactions.length} Interaction records in SQLite.`);

  for (const item of interactions) {
    let materialsShared = [];
    try {
      materialsShared = JSON.parse(item.materials_shared || "[]");
    } catch {
      materialsShared = [];
    }

    let samplesDistributed = [];
    try {
      samplesDistributed = JSON.parse(item.samples_distributed || "[]");
    } catch {
      samplesDistributed = [];
    }

    let extractedEntities = {};
    try {
      extractedEntities = JSON.parse(item.extracted_entities || "{}");
    } catch {
      extractedEntities = {};
    }

    let complianceFlags = [];
    try {
      complianceFlags = JSON.parse(item.compliance_flags || "[]");
    } catch {
      complianceFlags = [];
    }

    const sentiment = ["Positive", "Neutral", "Negative"].includes(item.sentiment)
      ? (item.sentiment as Sentiment)
      : Sentiment.Neutral;

    const interactionDate = new Date(item.interaction_date);
    const interactionTime = (item.interaction_time || "12:00:00").slice(0, 8);

    await prisma.interaction.upsert({
      where: { id: BigInt(item.id) },
      update: {
        hcpId: item.hcp_id,
        hcpName: item.hcp_name,
        interactionType: item.interaction_type,
        interactionDate,
        interactionTime,
        attendees: item.attendees || "",
        topicsDiscussed: item.topics_discussed || "",
        materialsShared,
        samplesDistributed,
        sentiment,
        outcomes: item.outcomes || "",
        followUpActions: item.follow_up_actions || "",
        aiSummary: item.ai_summary || "",
        extractedEntities,
        complianceFlags,
        channel: item.channel || "field_visit",
        consentForVoiceSummary: Boolean(item.consent_for_voice_summary),
      },
      create: {
        id: BigInt(item.id),
        hcpId: item.hcp_id,
        hcpName: item.hcp_name,
        interactionType: item.interaction_type,
        interactionDate,
        interactionTime,
        attendees: item.attendees || "",
        topicsDiscussed: item.topics_discussed || "",
        materialsShared,
        samplesDistributed,
        sentiment,
        outcomes: item.outcomes || "",
        followUpActions: item.follow_up_actions || "",
        aiSummary: item.ai_summary || "",
        extractedEntities,
        complianceFlags,
        channel: item.channel || "field_visit",
        consentForVoiceSummary: Boolean(item.consent_for_voice_summary),
      },
    });
    console.log(`  ✓ Migrated Interaction #${item.id} (${item.hcp_name})`);
  }

  console.log("🎉 Migration completed successfully!");
}

migrateData()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

