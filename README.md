# AI-First CRM HCP Module — Next.js Enterprise Full Stack

An enterprise-grade, production-oriented **AI-First Healthcare Professional (HCP) Interaction Module** for life sciences CRM, migrated from Python (FastAPI + SQLAlchemy + LangGraph) to a unified **Next.js (App Router) + TypeScript + LangGraph.js + PostgreSQL** architecture.

The application allows field representatives to log, review, enrich, and audit HCP interactions quickly and compliantly, using both structured manual entry and conversational AI assistance.

---

## 1. Key Highlights & Architectural Advantages

- **Unified Next.js Full Stack**: Single runtime powered by Node.js and TypeScript. No separate FastAPI or Express backend.
- **Enterprise Layered Architecture**:
  - **Presentation Layer**: React 18, Next.js App Router, Tailwind CSS, Lucide icons, Redux Toolkit.
  - **API Layer**: Route Handlers with Zod input validation, standard response structures, and centralized error handling.
  - **Service Layer**: Decoupled domain business logic (`server/services/`).
  - **AI Agent Layer**: StateGraph orchestration with `@langchain/langgraph`, Groq SDK LLM integration, timeout guards, and resilient fallbacks.
  - **Data Layer**: PostgreSQL with Prisma ORM, migrations, and strict referential constraints.
  - **Security Layer**: JWT-based session authentication with HttpOnly cookies, password hashing with bcrypt, role-based access guards (REP, MANAGER, COMPLIANCE_OFFICER, ADMIN).
- **Human-in-the-Loop Principle**: The AI agent never persists records directly to the database. All AI-extracted fields are applied as a patch to the visible form draft, allowing the representative to inspect, edit, and approve before submission.
- **Automated SQLite to PostgreSQL Migration**: Includes a migration utility (`scripts/migrate-sqlite-to-postgres.ts`) to import historical data from legacy SQLite databases without data loss.

---

## 2. System Architecture

```mermaid
graph TD
    subgraph Client ["Presentation Layer (Client)"]
        UI[Next.js App Router Page]
        Form[InteractionForm Component]
        Assistant[AssistantPanel Component]
        ReduxStore[Redux Toolkit Store<br/>(Draft, Messages, Tools)]
    end

    subgraph API ["API Layer (Next.js Route Handlers)"]
        HealthRoute["/api/health & /health"]
        AuthRoute["/api/auth/*"]
        HCPRoute["/api/hcps/*"]
        InteractionRoute["/api/interactions/*"]
        AgentChatRoute["/api/agent/chat"]
        AgentToolRoute["/api/agent/tool"]
        FollowUpRoute["/api/follow-ups/*"]
        ComplianceRoute["/api/compliance/*"]
        ZodValidator["Zod Validation Layer"]
        JWTMiddleware["JWT Auth & Session Guard"]
    end

    subgraph Services ["Service Layer (Business Logic)"]
        HCPService[HCP Service]
        InteractionService[Interaction Service]
        FollowUpService[Follow-Up Service]
        ComplianceService[Compliance Service]
        AuthService[Auth & User Service]
    end

    subgraph AgentLayer ["AI Agent Layer (LangGraph.js)"]
        Graph[LangGraph StateGraph Workflow]
        State[Typed AgentStateAnnotation]
        IntentNode[detect_intent]
        LogNode[log_node]
        EditNode[edit_node]
        RecommendNode[recommend_node]
        RespondNode[respond_node]
        GroqSDK[Groq SDK (llama-3.1-8b-instant)]
        Tools[6 Core Sales & Compliance Tools]
    end

    subgraph Data ["Data Layer (Prisma ORM)"]
        PrismaClient[Prisma Client]
        Postgres[(PostgreSQL Database)]
        SQLiteMigrator[SQLite Data Migrator]
    end

    UI --> ReduxStore
    Form --> ReduxStore
    Assistant --> ReduxStore
    ReduxStore --> API
    API --> ZodValidator
    API --> JWTMiddleware
    API --> Services
    Services --> AgentLayer
    Services --> Data
    AgentLayer --> Tools
    AgentLayer --> GroqSDK
    Data --> PrismaClient --> Postgres
    SQLiteMigrator --> PrismaClient
```

---

## 3. LangGraph.js Agent Workflow

The LangGraph.js workflow provides deterministic, compliance-checked orchestration between conversational notes and structured CRM fields.

```mermaid
graph LR
    START([Start / User Message]) --> detect_intent[detect_intent]
    detect_intent -->|intent == 'log'| log_node[log_node]
    detect_intent -->|intent == 'edit'| edit_node[edit_node]
    detect_intent -->|intent == 'recommend'| recommend_node[recommend_node]
    
    log_node --> respond_node[respond_node]
    edit_node --> respond_node
    recommend_node --> respond_node
    
    respond_node --> END_NODE([End / Draft Patch & Response])
```

### 3.1 Core Agent Sales Tools

1. **`log_interaction`**: Extracts structured CRM fields (hcp_name, interaction_type, attendees, topics_discussed, materials_shared, samples_distributed, sentiment, outcomes, follow_up_actions, ai_summary, extracted_entities) from unstructured field notes using Groq LLM or deterministic fallback.
2. **`edit_interaction`**: Modifies existing draft fields based on natural language instructions while preserving untouched fields.
3. **`fetch_hcp_profile`**: Retrieves HCP tier, specialty, organization, territory, and consent context to inform personalization.
4. **`search_approved_materials`**: Queries the approved promotional materials catalog for relevant efficacy brochures, Phase III papers, safety cards, and reimbursement FAQs.
5. **`recommend_followups`**: Suggests next-best compliant sales actions based on HCP sentiment and compliance constraints.
6. **`check_compliance`**: Automated guardrail flagging off-label discussions, adverse events, unauthorized sampling, and promotional claim violations.
7. **`schedule_followup`**: Formulates a proposed follow-up task with a target due date.

---

## 4. Database Schema (PostgreSQL & Prisma)

The database schema preserves all legacy models while establishing full relational integrity and adding authentication and task management:

- **`User`**: System accounts (Field Reps, Managers, Compliance Officers) with hashed passwords and role-based access.
- **`HCP`**: Healthcare Professional registry including tier, specialty, territory, organization, and consent status.
- **`Interaction`**: Detailed log records, indexed by `[hcpId, interactionDate(desc)]`, storing structured topics, outcomes, JSON materials, JSON samples, sentiment, and compliance flags.
- **`FollowUp`**: Actionable tasks linked to HCPs and interactions with due dates and statuses.

---

## 5. Getting Started

### 5.1 Prerequisites

- **Node.js**: v18.18+ or v20+ (tested on Node v24 LTS)
- **Docker & Docker Compose** (for PostgreSQL database)
- **Groq API Key** (optional: app includes robust deterministic fallbacks if offline)

### 5.2 Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Configure your `.env` variables:

```env
# Application & Server
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Groq LLM Configuration
GROQ_API_KEY=your-groq-api-key-here
GROQ_MODEL=llama-3.1-8b-instant
GROQ_CONTEXT_MODEL=llama-3.3-70b-versatile
AI_REQUEST_TIMEOUT_SECONDS=12

# Database Configuration (PostgreSQL)
DATABASE_URL=postgresql://crm_user:crm_password@localhost:5432/ai_crm?schema=public

# Security & Authentication
JWT_SECRET=super-secret-jwt-key-replace-in-production-min-32-chars
JWT_EXPIRES_IN=7d
```

### 5.3 Quick Start with Docker Compose

Run the entire application (Next.js + PostgreSQL) with a single command:

```bash
docker compose up --build
```

Access the application at `http://localhost:3000`.

### 5.4 Local Development Setup

1. **Start PostgreSQL**:
   ```bash
   docker compose up -d postgres
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Generate Prisma Client & Push Schema**:
   ```bash
   npm run prisma:generate
   npm run prisma:push
   ```

4. **Seed Database or Migrate Legacy SQLite Data**:
   - To seed fresh test data:
     ```bash
     npm run prisma:seed
     ```
   - To migrate existing data from legacy `test.db`:
     ```bash
     npm run db:migrate:sqlite
     ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. API Reference

All endpoints are built using Next.js Route Handlers with Zod validation.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status, runtime info, and active model. |
| `GET` | `/health` | Compatibility health check route. |
| `GET` | `/api/hcps` | Lists available Healthcare Professionals. |
| `POST` | `/api/hcps` | Registers a new HCP. |
| `GET` | `/api/hcps/:id` | Retrieves HCP details by ID. |
| `GET` | `/api/interactions` | Lists saved interactions (supports `?hcp_id=...` filter). |
| `POST` | `/api/interactions` | Saves a structured interaction log, runs compliance, returns record. |
| `PATCH` | `/api/interactions/:id` | Modifies an existing interaction and reruns compliance evaluation. |
| `POST` | `/api/agent/chat` | Runs the full LangGraph.js conversation agent; returns draft patch & tool calls. |
| `POST` | `/api/agent/tool` | Executes an explicit sales tool from the AI agent tools dropdown. |
| `GET` | `/api/compliance/rules` | Returns the list of regulatory and compliance rules. |
| `POST` | `/api/compliance/check` | Evaluates an interaction payload for compliance risks. |
| `GET` | `/api/follow-ups` | Lists scheduled follow-up tasks. |
| `POST` | `/api/follow-ups` | Creates a follow-up task or generates recommendations. |
| `POST` | `/api/auth/register` | Registers a new user and issues a secure JWT cookie. |
| `POST` | `/api/auth/login` | Authenticates user and issues JWT. |
| `GET` | `/api/auth/me` | Retrieves current authenticated session. |

---

## 7. Automated Testing Suite

The repository includes a comprehensive Vitest test suite covering validation, compliance rules, AI tools, LangGraph workflows, and API route handlers.

Run tests:

```bash
npm test
```

Watch mode for development:

```bash
npm run test:watch
```

Run TypeScript compilation check:

```bash
npx tsc --noEmit
```

Build production bundle:

```bash
npm run build
```

---

## 8. Preserved Original Implementation

The complete original Python + React codebase has been preserved in `_original_backup/` for auditability and compliance verification.
