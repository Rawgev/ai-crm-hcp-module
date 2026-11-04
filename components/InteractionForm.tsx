"use client";

import React, { useMemo, useState, ChangeEvent, FormEvent } from "react";
import {
  History,
  Mic,
  PackagePlus,
  RotateCcw,
  Save,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  addMaterial,
  addSample,
  resetDraft,
  saveInteraction,
  updateField,
  InteractionDraft,
} from "@/redux/slices/interactionSlice";
import { AuditHistoryModal } from "./AuditHistoryModal";

const sentimentOptions: Array<"Positive" | "Neutral" | "Negative"> = [
  "Positive",
  "Neutral",
  "Negative",
];

const interactionTypes = [
  "Meeting",
  "Call",
  "Email",
  "Conference",
  "Virtual Detail",
];

const materials = [
  "Product X efficacy brochure",
  "Patient starter guide",
  "Safety profile card",
  "Reimbursement FAQ",
];

const samples = [
  "Product X 5 mg starter",
  "Product X 10 mg starter",
  "Demo injection device",
];

export function InteractionForm() {
  const dispatch = useAppDispatch();
  const [showAuditModal, setShowAuditModal] = useState(false);
  const { draft, status, lastSaved, error } = useAppSelector(
    (state) => state.interaction
  );

  const suggestedActions = useMemo(() => {
    const base = [
      "Schedule follow-up meeting in 2 weeks",
      "Send Product X Phase III PDF",
    ];
    if (draft.sentiment === "Positive") {
      return [...base, "Add Dr. Menon to advisory board invite list"];
    }
    if (draft.sentiment === "Negative") {
      return [...base, "Route objection to medical information team"];
    }
    return [...base, "Confirm patient profile fit before next call"];
  }, [draft.sentiment]);

  const setField =
    <K extends keyof InteractionDraft>(field: K) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const target = event.target as HTMLInputElement;
      const value = target.type === "checkbox" ? target.checked : target.value;
      dispatch(updateField({ field, value: value as InteractionDraft[K] }));
    };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    dispatch(saveInteraction(draft));
  };

  return (
    <form className="interaction-panel" onSubmit={submit}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Interaction Details</p>
          <h2>Structured Log</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={() => dispatch(resetDraft())}
          title="Reset form"
        >
          <RotateCcw size={17} />
        </button>
      </div>

      <div className="form-grid two">
        <label>
          <span>HCP Name</span>
          <input
            value={draft.hcp_name}
            onChange={setField("hcp_name")}
            placeholder="Search or select HCP..."
          />
        </label>
        <label>
          <span>Interaction Type</span>
          <select
            value={draft.interaction_type}
            onChange={setField("interaction_type")}
          >
            {interactionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Date</span>
          <input
            type="date"
            value={draft.interaction_date}
            onChange={setField("interaction_date")}
          />
        </label>
        <label>
          <span>Time</span>
          <input
            type="time"
            value={draft.interaction_time}
            onChange={setField("interaction_time")}
          />
        </label>
      </div>

      <label>
        <span>Attendees</span>
        <input
          value={draft.attendees}
          onChange={setField("attendees")}
          placeholder="Enter names or search..."
        />
      </label>

      <label>
        <span>Topics Discussed</span>
        <textarea
          value={draft.topics_discussed}
          onChange={setField("topics_discussed")}
          placeholder="Enter key discussion points..."
          rows={5}
        />
      </label>

      <label className="voice-consent">
        <input
          type="checkbox"
          checked={draft.consent_for_voice_summary}
          onChange={setField("consent_for_voice_summary")}
        />
        <Mic size={15} />
        Summarize from voice note
      </label>

      <section className="subsection">
        <div className="subsection-title">
          <h3>Materials Shared</h3>
          <button
            className="secondary-button"
            type="button"
            onClick={() => dispatch(addMaterial(materials[0]))}
          >
            <Search size={15} /> Search/Add
          </button>
        </div>
        <div className="chips">
          {draft.materials_shared.length ? (
            draft.materials_shared.map((item) => (
              <span key={item}>{item}</span>
            ))
          ) : (
            <em>No materials added.</em>
          )}
        </div>
      </section>

      <section className="subsection">
        <div className="subsection-title">
          <h3>Samples Distributed</h3>
          <button
            className="secondary-button"
            type="button"
            onClick={() => dispatch(addSample(samples[0]))}
          >
            <PackagePlus size={15} /> Add Sample
          </button>
        </div>
        <div className="chips">
          {draft.samples_distributed.length ? (
            draft.samples_distributed.map((item) => (
              <span key={item}>{item}</span>
            ))
          ) : (
            <em>No samples added.</em>
          )}
        </div>
      </section>

      <fieldset className="sentiment">
        <legend>Observed/Inferred HCP Sentiment</legend>
        <div>
          {sentimentOptions.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name="sentiment"
                value={option}
                checked={draft.sentiment === option}
                onChange={setField("sentiment")}
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        <span>Outcomes</span>
        <textarea
          value={draft.outcomes}
          onChange={setField("outcomes")}
          placeholder="Key outcomes or agreements..."
          rows={3}
        />
      </label>

      <label>
        <span>Follow-up Actions</span>
        <textarea
          value={draft.follow_up_actions}
          onChange={setField("follow_up_actions")}
          placeholder="Enter next steps or tasks..."
          rows={3}
        />
      </label>

      <div className="suggestions">
        <p>
          <Sparkles size={15} /> AI suggested follow-ups
        </p>
        {suggestedActions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() =>
              dispatch(
                updateField({ field: "follow_up_actions", value: action })
              )
            }
          >
            {action}
          </button>
        ))}
      </div>

      <footer className="form-actions">
        {error && <span className="error-text">{error}</span>}
        {lastSaved && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <span className="success-text">Saved interaction #{lastSaved.id}</span>
            <button
              type="button"
              onClick={() => setShowAuditModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                padding: "3px 8px",
                fontSize: "12px",
                cursor: "pointer",
                color: "#334155",
                fontWeight: 600,
              }}
              title="Inspect 21 CFR Part 11 Audit Trail"
            >
              <History size={13} /> View Audit Trail
            </button>
          </div>
        )}
        <button
          className="primary-button"
          type="submit"
          disabled={status === "saving"}
        >
          {status === "saving" ? <Sparkles size={17} /> : <Save size={17} />}
          {status === "saving" ? "Saving..." : "Log Interaction"}
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setShowAuditModal(true)}
          title="Open complete regulatory audit trail"
        >
          <History size={15} /> Audit Log
        </button>
      </footer>

      <AuditHistoryModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        entityType="Interaction"
        entityId={lastSaved?.id || null}
      />
    </form>
  );
}

