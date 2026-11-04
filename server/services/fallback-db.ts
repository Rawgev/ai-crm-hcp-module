import { existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import bcrypt from "bcryptjs";
import { checkCompliance } from "../agent/tools";

const req = createRequire(import.meta.url);

let DatabaseSyncClass: any = null;
try {
  const sqliteModule = req("node:sqlite");
  DatabaseSyncClass = sqliteModule.DatabaseSync;
} catch {
  // node:sqlite fallback unavailable
}

const dbPath = resolve(process.cwd(), "test.db");
const backupDbPath = resolve(process.cwd(), "_original_backup/test.db");

if (!existsSync(dbPath) && existsSync(backupDbPath)) {
  try {
    copyFileSync(backupDbPath, dbPath);
  } catch (err) {
    console.warn("Could not copy backup test.db:", err);
  }
}

let sqliteDb: any = null;

function getSqlite(): any {
  if (!sqliteDb && DatabaseSyncClass) {
    try {
      sqliteDb = new DatabaseSyncClass(dbPath);
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS hcps (
          id VARCHAR(40) PRIMARY KEY,
          full_name VARCHAR(160) NOT NULL,
          specialty VARCHAR(120) NOT NULL,
          tier VARCHAR(40) NOT NULL DEFAULT 'B',
          organization VARCHAR(180) NOT NULL,
          territory VARCHAR(120) NOT NULL,
          consent_status VARCHAR(40) NOT NULL DEFAULT 'unknown'
        );
        CREATE TABLE IF NOT EXISTS interactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hcp_id VARCHAR(40) NOT NULL,
          hcp_name VARCHAR(160) NOT NULL,
          interaction_type VARCHAR(80) NOT NULL,
          interaction_date DATE NOT NULL,
          interaction_time TIME NOT NULL,
          attendees TEXT DEFAULT '',
          topics_discussed TEXT DEFAULT '',
          materials_shared TEXT DEFAULT '[]',
          samples_distributed TEXT DEFAULT '[]',
          sentiment VARCHAR(40) DEFAULT 'Neutral',
          outcomes TEXT DEFAULT '',
          follow_up_actions TEXT DEFAULT '',
          ai_summary TEXT DEFAULT '',
          extracted_entities TEXT DEFAULT '{}',
          compliance_flags TEXT DEFAULT '[]',
          channel VARCHAR(80) DEFAULT 'field_visit',
          consent_for_voice_summary BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'REP',
          territory TEXT DEFAULT 'South Zone',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Seed default rep user in SQLite fallback if not present
      const existingUser = sqliteDb.prepare("SELECT * FROM users WHERE email = ?").get("rep@crm.example.com");
      if (!existingUser) {
        const hash = bcrypt.hashSync("password123", 10);
        sqliteDb.prepare(`
          INSERT INTO users (id, email, name, password_hash, role, territory)
          VALUES ('user_default_rep', 'rep@crm.example.com', 'Alex Vance', ?, 'REP', 'South Zone')
        `).run(hash);
      }
    } catch (e) {
      console.warn("Could not initialize local SQLite db:", e);
    }
  }
  return sqliteDb;
}

export function findFallbackUserByEmail(email: string) {
  const db = getSqlite();
  if (!db) {
    if (email === "rep@crm.example.com") {
      return {
        id: "user_default_rep",
        email: "rep@crm.example.com",
        name: "Alex Vance",
        passwordHash: bcrypt.hashSync("password123", 10),
        role: "REP",
        territory: "South Zone",
      };
    }
    return null;
  }

  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role,
    territory: row.territory,
  };
}

export function createFallbackUser(user: { id: string; email: string; name: string; passwordHash: string; role: string; territory?: string }) {
  const db = getSqlite();
  if (!db) return user;

  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, role, territory)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.id, user.email, user.name, user.passwordHash, user.role, user.territory || "South Zone");

  return user;
}

export function findFallbackUserById(id: string) {
  const db = getSqlite();
  if (!db) {
    return {
      id,
      email: "rep@crm.example.com",
      name: "Alex Vance",
      role: "REP",
      territory: "South Zone",
      createdAt: new Date(),
    };
  }

  const row = db.prepare("SELECT id, email, name, role, territory, created_at FROM users WHERE id = ?").get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    territory: row.territory,
    createdAt: row.created_at,
  };
}

export function listFallbackHcps() {
  const db = getSqlite();
  if (!db) {
    return [
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
  }

  const rows = db.prepare("SELECT * FROM hcps ORDER BY full_name ASC").all() as any[];
  return rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    specialty: r.specialty,
    tier: r.tier,
    organization: r.organization,
    territory: r.territory,
    consentStatus: r.consent_status,
  }));
}

export function listFallbackInteractions(hcpId?: string) {
  const db = getSqlite();
  if (!db) return [];

  let query = "SELECT * FROM interactions";
  if (hcpId) query += ` WHERE hcp_id = '${hcpId}'`;
  query += " ORDER BY interaction_date DESC, id DESC LIMIT 50";

  const rows = db.prepare(query).all() as any[];
  return rows.map((r) => ({
    id: r.id,
    hcp_id: r.hcp_id,
    hcp_name: r.hcp_name,
    interaction_type: r.interaction_type,
    interaction_date: r.interaction_date,
    interaction_time: r.interaction_time,
    attendees: r.attendees,
    topics_discussed: r.topics_discussed,
    materials_shared: JSON.parse(r.materials_shared || "[]"),
    samples_distributed: JSON.parse(r.samples_distributed || "[]"),
    sentiment: r.sentiment,
    outcomes: r.outcomes,
    follow_up_actions: r.follow_up_actions,
    ai_summary: r.ai_summary,
    extracted_entities: JSON.parse(r.extracted_entities || "{}"),
    compliance_flags: JSON.parse(r.compliance_flags || "[]"),
    channel: r.channel,
    consent_for_voice_summary: Boolean(r.consent_for_voice_summary),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export function createFallbackInteraction(payload: any) {
  const flags = checkCompliance(payload);
  const now = new Date().toISOString();
  const db = getSqlite();

  if (!db) {
    return {
      id: Date.now(),
      ...payload,
      compliance_flags: flags,
      created_at: now,
      updated_at: now,
    };
  }

  const stmt = db.prepare(`
    INSERT INTO interactions (
      hcp_id, hcp_name, interaction_type, interaction_date, interaction_time,
      attendees, topics_discussed, materials_shared, samples_distributed,
      sentiment, outcomes, follow_up_actions, ai_summary, extracted_entities,
      compliance_flags, channel, consent_for_voice_summary, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  const res = stmt.run(
    payload.hcp_id,
    payload.hcp_name,
    payload.interaction_type,
    payload.interaction_date,
    payload.interaction_time,
    payload.attendees || "",
    payload.topics_discussed || "",
    JSON.stringify(payload.materials_shared || []),
    JSON.stringify(payload.samples_distributed || []),
    payload.sentiment || "Neutral",
    payload.outcomes || "",
    payload.follow_up_actions || "",
    payload.ai_summary || payload.topics_discussed || "",
    JSON.stringify(payload.extracted_entities || {}),
    JSON.stringify(flags),
    payload.channel || "field_visit",
    payload.consent_for_voice_summary ? 1 : 0,
    now,
    now
  );

  const lastId = Number(res.lastInsertRowid);
  return {
    id: lastId,
    ...payload,
    compliance_flags: flags,
    created_at: now,
    updated_at: now,
  };
}

