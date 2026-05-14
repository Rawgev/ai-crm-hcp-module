import { Activity, Bot, CalendarClock, ClipboardCheck, FileText, MessageSquareText } from "lucide-react";
import { InteractionForm } from "./features/interactions/InteractionForm.jsx";
import { AssistantPanel } from "./features/assistant/AssistantPanel.jsx";

export function App() {
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
