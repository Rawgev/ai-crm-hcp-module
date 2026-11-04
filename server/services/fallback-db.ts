import { existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
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
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Production database connection failure: SQLite local fallback is strictly disabled in production to guarantee data consistency and compliance (FDA 21 CFR Part 11). Verify PostgreSQL connectivity."
    );
  }

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
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(100) NOT NULL,
          action VARCHAR(30) NOT NULL,
          user_id TEXT NOT NULL,
          user_name VARCHAR(160) NOT NULL,
          user_role VARCHAR(40) NOT NULL,
          changes TEXT DEFAULT '{}',
          ip_address VARCHAR(60),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

export function getFallbackInteraction(id: number) {
  const db = getSqlite();
  if (!db) return null;

  const row = db.prepare("SELECT * FROM interactions WHERE id = ?").get(id) as any;
  if (!row) return null;

  return {
    id: row.id,
    hcp_id: row.hcp_id,
    hcp_name: row.hcp_name,
    interaction_type: row.interaction_type,
    interaction_date: row.interaction_date,
    interaction_time: row.interaction_time,
    attendees: row.attendees,
    topics_discussed: row.topics_discussed,
    materials_shared: JSON.parse(row.materials_shared || "[]"),
    samples_distributed: JSON.parse(row.samples_distributed || "[]"),
    sentiment: row.sentiment,
    outcomes: row.outcomes,
    follow_up_actions: row.follow_up_actions,
    ai_summary: row.ai_summary,
    extracted_entities: JSON.parse(row.extracted_entities || "{}"),
    compliance_flags: JSON.parse(row.compliance_flags || "[]"),
    channel: row.channel,
    consent_for_voice_summary: Boolean(row.consent_for_voice_summary),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function updateFallbackInteraction(id: number, payload: any) {
  const existing = getFallbackInteraction(id);
  if (!existing) {
    throw new Error("NOT_FOUND");
  }

  const merged = { ...existing, ...payload };
  const flags = checkCompliance({
    topics_discussed: merged.topics_discussed,
    outcomes: merged.outcomes,
    follow_up_actions: merged.follow_up_actions,
    samples_distributed: merged.samples_distributed,
    consent_for_voice_summary: merged.consent_for_voice_summary,
  });

  const now = new Date().toISOString();
  const db = getSqlite();

  if (db) {
    const stmt = db.prepare(`
      UPDATE interactions SET
        hcp_name = ?,
        interaction_type = ?,
        interaction_date = ?,
        interaction_time = ?,
        attendees = ?,
        topics_discussed = ?,
        materials_shared = ?,
        samples_distributed = ?,
        sentiment = ?,
        outcomes = ?,
        follow_up_actions = ?,
        compliance_flags = ?,
        channel = ?,
        consent_for_voice_summary = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.hcp_name,
      merged.interaction_type,
      merged.interaction_date,
      merged.interaction_time,
      merged.attendees || "",
      merged.topics_discussed || "",
      JSON.stringify(merged.materials_shared || []),
      JSON.stringify(merged.samples_distributed || []),
      merged.sentiment || "Neutral",
      merged.outcomes || "",
      merged.follow_up_actions || "",
      JSON.stringify(flags),
      merged.channel || "field_visit",
      merged.consent_for_voice_summary ? 1 : 0,
      now,
      id
    );
  }

  return {
    ...merged,
    compliance_flags: flags,
    updated_at: now,
  };
}

export interface FallbackAuditLogEntry {
  id?: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userName: string;
  userRole: string;
  changes: Record<string, any>;
  ipAddress?: string | null;
  createdAt?: string;
}

export function createFallbackAuditLog(entry: FallbackAuditLogEntry) {
  const db = getSqlite();
  const id = entry.id || randomUUID();
  const now = entry.createdAt || new Date().toISOString();

  if (!db) {
    return {
      id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      userId: entry.userId,
      userName: entry.userName,
      userRole: entry.userRole,
      changes: entry.changes || {},
      ipAddress: entry.ipAddress || null,
      createdAt: now,
    };
  }

  const stmt = db.prepare(`
    INSERT INTO audit_logs (
      id, entity_type, entity_id, action, user_id, user_name, user_role, changes, ip_address, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    entry.entityType,
    entry.entityId,
    entry.action,
    entry.userId,
    entry.userName,
    entry.userRole,
    JSON.stringify(entry.changes || {}),
    entry.ipAddress || null,
    now
  );

  return {
    id,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    userId: entry.userId,
    userName: entry.userName,
    userRole: entry.userRole,
    changes: entry.changes || {},
    ipAddress: entry.ipAddress || null,
    createdAt: now,
  };
}

export function listFallbackAuditLogs(filters?: {
  entityType?: string;
  entityId?: string;
  userId?: string;
  limit?: number;
}) {
  const db = getSqlite();
  if (!db) return [];

  let query = "SELECT * FROM audit_logs WHERE 1=1";
  const params: any[] = [];

  if (filters?.entityType) {
    query += " AND entity_type = ?";
    params.push(filters.entityType);
  }
  if (filters?.entityId) {
    query += " AND entity_id = ?";
    params.push(filters.entityId);
  }
  if (filters?.userId) {
    query += " AND user_id = ?";
    params.push(filters.userId);
  }

  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(filters?.limit || 50);

  const rows = db.prepare(query).all(...params) as any[];
  return rows.map((r) => ({
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    action: r.action,
    userId: r.user_id,
    userName: r.user_name,
    userRole: r.user_role,
    changes: typeof r.changes === "string" ? JSON.parse(r.changes || "{}") : r.changes,
    ipAddress: r.ip_address,
    createdAt: r.created_at,
  }));
}


