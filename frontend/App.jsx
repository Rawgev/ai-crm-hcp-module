import { useCallback, useEffect, useState } from "react";
import { Activity, Bot, CalendarClock, ClipboardCheck, FileText, Loader2, MessageSquareText, RotateCcw } from "lucide-react";
import { InteractionForm } from "./features/interactions/InteractionForm.jsx";
import { AssistantPanel } from "./features/assistant/AssistantPanel.jsx";
import { api } from "./lib/api.js";

export function App() {
const [isServerReady, setIsServerReady] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Bina timeout ke call karo taaki cold start handle ho sake
        await api.get('/health', { timeout: 0 }); 
        setIsServerReady(true);
      } catch (err) {
        console.error("Server booting up...", err);
        // Error handling: server shayad down hai ya time le raha hai
      }
    };

    checkHealth();
  }, []);

  if (!isServerReady) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20%' }}>
        <h1>🚀 Server is waking up...</h1>
        <p>This might take 30-60 seconds on the free tier. Please wait.</p>
        <div className="spinner"></div> {/* Chota sa loading spinner */}
      </div>
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
