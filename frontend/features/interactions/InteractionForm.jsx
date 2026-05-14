import { useMemo } from "react";
import { Mic, PackagePlus, RotateCcw, Save, Search, Send, Sparkles } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { addMaterial, addSample, resetDraft, saveInteraction, updateField } from "./interactionSlice.js";

const sentimentOptions = ["Positive", "Neutral", "Negative"];
const interactionTypes = ["Meeting", "Call", "Email", "Conference", "Virtual Detail"];
const materials = ["Product X efficacy brochure", "Patient starter guide", "Safety profile card", "Reimbursement FAQ"];
const samples = ["Product X 5 mg starter", "Product X 10 mg starter", "Demo injection device"];

export function InteractionForm() {
  const dispatch = useDispatch();
  const { draft, status, lastSaved, error } = useSelector((state) => state.interaction);

  const suggestedActions = useMemo(() => {
    const base = ["Schedule follow-up meeting in 2 weeks", "Send Product X Phase III PDF"];
    if (draft.sentiment === "Positive") {
      return [...base, "Add Dr. Menon to advisory board invite list"];
    }
    if (draft.sentiment === "Negative") {
      return [...base, "Route objection to medical information team"];
    }
    return [...base, "Confirm patient profile fit before next call"];
  }, [draft.sentiment]);

  const setField = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    dispatch(updateField({ field, value }));
  };

  const submit = (event) => {
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
        <button className="icon-button" type="button" onClick={() => dispatch(resetDraft())} title="Reset form">
          <RotateCcw size={17} />
        </button>
      </div>

      <div className="form-grid two">
        <label>
          <span>HCP Name</span>
          <input value={draft.hcp_name} onChange={setField("hcp_name")} placeholder="Search or select HCP..." />
        </label>
        <label>
          <span>Interaction Type</span>
          <select value={draft.interaction_type} onChange={setField("interaction_type")}>
            {interactionTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>
          <span>Date</span>
          <input type="date" value={draft.interaction_date} onChange={setField("interaction_date")} />
        </label>
        <label>
          <span>Time</span>
          <input type="time" value={draft.interaction_time} onChange={setField("interaction_time")} />
        </label>
      </div>

      <label>
        <span>Attendees</span>
        <input value={draft.attendees} onChange={setField("attendees")} placeholder="Enter names or search..." />
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
          <button className="secondary-button" type="button" onClick={() => dispatch(addMaterial(materials[0]))}>
            <Search size={15} /> Search/Add
          </button>
        </div>
        <div className="chips">
          {draft.materials_shared.length ? draft.materials_shared.map((item) => <span key={item}>{item}</span>) : <em>No materials added.</em>}
        </div>
      </section>

      <section className="subsection">
        <div className="subsection-title">
          <h3>Samples Distributed</h3>
          <button className="secondary-button" type="button" onClick={() => dispatch(addSample(samples[0]))}>
            <PackagePlus size={15} /> Add Sample
          </button>
        </div>
        <div className="chips">
          {draft.samples_distributed.length ? draft.samples_distributed.map((item) => <span key={item}>{item}</span>) : <em>No samples added.</em>}
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
        <textarea value={draft.outcomes} onChange={setField("outcomes")} placeholder="Key outcomes or agreements..." rows={3} />
      </label>

      <label>
        <span>Follow-up Actions</span>
        <textarea value={draft.follow_up_actions} onChange={setField("follow_up_actions")} placeholder="Enter next steps or tasks..." rows={3} />
      </label>

      <div className="suggestions">
        <p><Sparkles size={15} /> AI suggested follow-ups</p>
        {suggestedActions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => dispatch(updateField({ field: "follow_up_actions", value: action }))}
          >
            {action}
          </button>
        ))}
      </div>

      <footer className="form-actions">
        {error && <span className="error-text">{error}</span>}
        {lastSaved && <span className="success-text">Saved interaction #{lastSaved.id}</span>}
        <button className="primary-button" type="submit" disabled={status === "saving"}>
          {status === "saving" ? <Sparkles size={17} /> : <Save size={17} />}
          {status === "saving" ? "Saving..." : "Log Interaction"}
        </button>
        <button className="secondary-button" type="button">
          <Send size={16} /> Submit for Review
        </button>
      </footer>
    </form>
  );
}
