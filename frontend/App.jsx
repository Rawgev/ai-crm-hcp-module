import { useCallback, useEffect, useState } from "react";
import { Activity, Bot, CalendarClock, ClipboardCheck, FileText, Loader2, MessageSquareText, RotateCcw } from "lucide-react";
import { InteractionForm } from "./features/interactions/InteractionForm.jsx";
import { AssistantPanel } from "./features/assistant/AssistantPanel.jsx";
import { api } from "./lib/api.js";

export function App() {
  const [health, setHealth] = useState({
    status: "checking",
    error: null
  });

  const checkHealth = useCallback(async () => {
    setHealth({ status: "checking", error: null });
    try {
      await api.get("/health", { timeout: 5000 });
      setHealth({ status: "ready", error: null });
    } catch (error) {
      setHealth({
        status: "error",
        error: error.normalizedMessage || "Backend service temporarily unavailable"
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  if (health.status !== "ready") {
    return (
      <main className="health-screen" aria-live="polite">
        <section className="health-panel">
          <div className="health-mark" aria-hidden="true">
            {health.status === "checking" ? <Loader2 className="health-spinner" size={28} /> : <Activity size={28} />}
          </div>
          <p className="eyebrow">AI-first CRM</p>
          <h1>{health.status === "checking" ? "Connecting to CRM services" : "CRM service unavailable"}</h1>
          <p className="health-copy">
            {health.status === "checking"
              ? "Checking backend health before loading the interaction workspace."
              : health.error}
          </p>
          {health.status === "error" && (
            <button className="primary-button" type="button" onClick={checkHealth}>
              <RotateCcw size={17} /> Retry
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI-first CRM</p>
          <h1>Log HCP Interaction</h1>
        </div>
        <div className="topbar-metrics" aria-label="interaction context">
          <span><Activity size={16} /> Field ready</span>
          <span><CalendarClock size={16} /> Today</span>
          <span><ClipboardCheck size={16} /> Compliance aware</span>
        </div>
      </header>

      <section className="workflow-strip" aria-label="workflow summary">
        <div>
          <MessageSquareText size={18} />
          <span>Capture discussion</span>
        </div>
        <div>
          <Bot size={18} />
          <span>AI extracts entities</span>
        </div>
        <div>
          <FileText size={18} />
          <span>Review and submit</span>
        </div>
      </section>

      <section className="screen-grid">
        <InteractionForm />
        <AssistantPanel />
      </section>
    </main>
  );
}
