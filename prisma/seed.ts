import { PrismaClient, Role, Sentiment } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Seed HCPs
  const hcps = [
    {
      id: "hcp_1001",
      fullName: "Dr. Priya Menon",
      specialty: "Endocrinology",
      tier: "A",
      organization: "MetroCare Diabetes Center",
      territory: "South Zone",
      consentStatus: "marketing_opt_in",
    },
    {
      id: "hcp_1002",
      fullName: "Dr. Arjun Shah",
      specialty: "Cardiology",
      tier: "B",
      organization: "Northline Hospital",
      territory: "West Zone",
      consentStatus: "limited",
    },
  ];

  for (const hcp of hcps) {
    await prisma.hCP.upsert({
      where: { id: hcp.id },
      update: hcp,
      create: hcp,
    });
    console.log(`  ✓ Seeded HCP: ${hcp.fullName}`);
  }

  // 2. Seed Default User (Field Rep)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("password123", salt);

  const defaultUser = await prisma.user.upsert({
    where: { email: "rep@crm.example.com" },
    update: {},
    create: {
      email: "rep@crm.example.com",
      name: "Alex Vance",
      passwordHash,
      role: Role.REP,
      territory: "South Zone",
    },
  });
  console.log(`  ✓ Seeded default user: ${defaultUser.email}`);

  // 3. Seed Sample Interaction if none exist
  const count = await prisma.interaction.count();
  if (count === 0) {
    await prisma.interaction.create({
      data: {
        hcpId: "hcp_1001",
        hcpName: "Dr. Priya Menon",
        interactionType: "Meeting",
        interactionDate: new Date(),
        interactionTime: "10:30",
        attendees: "Alex Vance (Field Rep)",
        topicsDiscussed: "Discussed Product X efficacy and tolerability profile.",
        materialsShared: ["Product X efficacy brochure"],
        samplesDistributed: [],
        sentiment: Sentiment.Positive,
        outcomes: "Dr. Menon expressed interest in Phase III data for diabetic patient cohort.",
        followUpActions: "Send Product X Phase III PDF and schedule 2-week follow-up.",
        aiSummary: "Discussed Product X efficacy and safety profile with Dr. Priya Menon.",
        extractedEntities: { product: "Product X", hcp: "Dr. Priya Menon" },
        complianceFlags: [],
        channel: "field_visit",
        consentForVoiceSummary: false,
        createdById: defaultUser.id,
      },
    });
    console.log("  ✓ Seeded initial sample interaction record");
  }

  console.log("✅ Database seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

