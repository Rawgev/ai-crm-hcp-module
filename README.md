# AI-First CRM HCP Module

This project implements an **AI-first Log HCP Interaction module** for a life-sciences CRM. It helps a field representative capture Healthcare Professional interactions quickly while keeping the final CRM record reviewable and compliance-aware.

The screen supports two capture modes:

- A structured React form for field representatives who need fast, auditable entry.
- A conversational AI assistant that drafts, edits, and enriches the same interaction record through a LangGraph agent.

The stack follows the brief: React, Redux Toolkit, FastAPI, LangGraph, Groq LLMs, and a SQL database. Local development defaults to SQLite for quick setup, while SQLAlchemy also supports Postgres or MySQL-compatible deployment with a suitable `DATABASE_URL`.

## Project Summary

The module lets a rep record an HCP meeting, call, email, or virtual detail. The rep can manually enter details such as HCP name, interaction type, attendees, topics, materials, samples, sentiment, outcomes, and follow-up actions.

The AI assistant improves this workflow by turning natural-language notes into structured CRM fields. For example, a rep can type: "Met Dr. Menon, discussed Product X efficacy and safety. Positive response, wants Phase III data." The agent can populate the draft, infer sentiment, suggest approved materials, recommend next steps, and run compliance checks before the rep submits the record.

The rep stays in control: AI output is applied to the visible form draft, where it can be reviewed or edited before saving.

## Architecture

**Frontend**

- React + Vite UI using the Google Inter font.
- Redux Toolkit stores the active interaction draft, save status, assistant messages, and recent tool activity.
- The screen includes HCP selection, interaction metadata, attendees, topics, materials, samples, sentiment, outcomes, follow-ups, voice-note consent, chat-assisted drafting, and a compact **AI agent tools** dropdown.

**Backend**

- FastAPI exposes CRM endpoints under `/api`.
- SQLAlchemy models persist HCPs and interactions.
- LangGraph manages the agent workflow for conversation interpretation, compliance checks, recommendations, and draft edits.
- Groq is used through `langchain-groq` with `llama-3.1-8b-instant` as the primary model. The `.env.example` includes `llama-3.3-70b-versatile` as an optional context-heavy model.

Groq docs list `llama-3.1-8b-instant` as a production chat model and the recommended replacement for the decommissioned `gemma2-9b-it`. See:

- https://console.groq.com/docs/model/llama-3.1-8b-instant
- https://console.groq.com/docs/deprecations
- https://console.groq.com/docs/models

## LangGraph Agent Role

The LangGraph agent is the orchestration layer between natural-language field notes and CRM-safe structured data. It detects the rep's intent, invokes the right sales tools, applies an interaction patch to the Redux draft, and returns a concise explanation plus compliance warnings.

The frontend also exposes the five core tools directly in an **AI agent tools** dropdown. This allows the rep to deliberately run a specific tool, such as logging a note, editing the draft, finding approved materials, or recommending follow-ups.

Graph flow:

1. `detect_intent`: classifies the message as log, edit, or recommendation.
2. `log`: extracts a structured draft, fetches HCP context, searches approved materials, checks compliance, and suggests follow-up.
3. `edit`: modifies the current draft while preserving untouched fields.
4. `recommend`: proposes next-best compliant actions and a follow-up task.
5. `respond`: explains the result to the field representative.

## Agent Tools

The LangGraph agent defines the minimum five sales tools required by the brief. These tools can run through the conversational agent or through the compact AI agent tools dropdown in the frontend.

- `log_interaction`: Captures interaction data from a field rep's free-text note. With Groq `llama-3.1-8b-instant`, it summarizes the discussion, maps the note into CRM fields, extracts entities such as HCP/product/material mentions, infers sentiment, and avoids inventing sample distribution. It also has a local fallback so the app remains inspectable without a token.
- `edit_interaction`: Allows the rep to modify already logged or drafted interaction data through natural language. It applies corrections to the current draft while preserving untouched fields, then reruns compliance checks so edited records stay review-ready.
- `fetch_hcp_profile`: Retrieves sales context for the selected HCP, including specialty, tier, organization, territory, consent status, and previous engagement. The agent uses this context to avoid generic recommendations.
- `search_approved_materials`: Finds approved sales materials aligned to the discussion topic, such as efficacy brochures, Phase III data, safety cards, patient education, or access resources. This keeps follow-up content inside the approved-materials catalog.
- `recommend_followups`: Suggests compliant next-best sales actions based on the interaction content, HCP sentiment, and compliance state. Examples include sending approved material, scheduling a deeper efficacy discussion, routing clinical questions to Medical Affairs, or logging objections for coaching.

Two additional helper tools are implemented for completeness:

- `check_compliance`: Flags off-label mentions, adverse-event language, sample eligibility issues, and unsupported promotional claims.
- `schedule_followup`: Creates a proposed follow-up task with due date and reason.

## Run Locally

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Optional local Postgres:

```bash
docker compose up -d postgres
```

Set a new Groq token in `backend/.env`:

```env
GROQ_API_KEY=your-new-token
GROQ_MODEL=llama-3.1-8b-instant
DATABASE_URL=sqlite:///./test.db
FRONTEND_ORIGIN=http://localhost:5173
```

For Postgres, use:

```env
DATABASE_URL=postgresql+psycopg://crm_user:crm_password@localhost:5432/ai_crm
```

For MySQL, use a SQLAlchemy URL such as:

```env
DATABASE_URL=mysql+pymysql://crm_user:crm_password@localhost:3306/ai_crm
```

## API Surface

- `GET /api/health`: confirms FastAPI, LangGraph, and selected Groq model.
- `GET /api/hcps`: lists available HCPs.
- `POST /api/interactions`: saves a structured log and enriches it with summary, entities, and compliance flags.
- `PATCH /api/interactions/{id}`: edits a saved interaction and reruns compliance checks.
- `POST /api/agent/chat`: runs the LangGraph assistant and returns a draft patch plus tool trace.
- `POST /api/agent/tool`: runs a specific sales tool from the frontend AI agent tools dropdown.

## How To Demo

1. From the `backend` directory, start the server with `uvicorn app.main:app --reload`.
2. From the `frontend` directory, start the UI with `npm run dev`.
3. Open the Vite URL, usually `http://localhost:5173`.
4. Type a meeting note into the AI assistant, such as:

```text
Met Dr. Menon, discussed Product X efficacy and safety profile. Positive response, wants Phase III data.
```

5. Send the message or open **AI agent tools** and run `Log Interaction`.
6. Review the populated CRM form fields.
7. Use `Edit Interaction` to modify a field, `Approved Materials` to add compliant materials, or `Recommend Follow-ups` to generate next actions.
8. Save the structured interaction.

## Design Notes

- The chat interface does not bypass review. It drafts and patches the same Redux form state the rep can inspect before submission.
- Voice-note summarization is gated by an explicit consent checkbox.
- Compliance checks run before persistence and after edits.
- The AI agent tools dropdown provides direct access to the five core sales tools without crowding the chat area.
