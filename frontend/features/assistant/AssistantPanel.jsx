import { useState } from "react";
import { Bot, ChevronDown, ChevronUp, ClipboardCheck, CornerDownLeft, FileText, Loader2, PencilLine, Search, Sparkles, UserSearch, WandSparkles } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { applyAssistantDraft } from "../interactions/interactionSlice.js";
import { addUserMessage, runAgentTool, sendAssistantMessage } from "./assistantSlice.js";

const quickPrompts = [
  "Met Dr. Menon, discussed Product X efficacy and safety profile. Positive response, wants Phase III data.",
  "Edit the outcome: HCP asked for patient affordability information before prescribing.",
  "Recommend compliant follow-up actions for a neutral HCP after a product discussion."
];

const salesTools = [
  {
    name: "log_interaction",
    label: "Log Interaction",
    description: "Draft fields from a rep note",
    Icon: FileText,
    fallback: (draft) => draft.topics_discussed || "Met Dr. Menon, discussed Product X efficacy and safety."
  },
  {
    name: "edit_interaction",
    label: "Edit Interaction",
    description: "Change the current draft",
    Icon: PencilLine,
    fallback: () => ""
  },
  {
    name: "fetch_hcp_profile",
    label: "HCP Profile",
    description: "Load specialty, tier, consent",
    Icon: UserSearch,
    fallback: (draft) => draft.hcp_name
  },
  {
    name: "search_approved_materials",
    label: "Approved Materials",
    description: "Find compliant content",
    Icon: Search,
    fallback: (draft) => draft.topics_discussed || draft.outcomes || "Product X efficacy and safety"
  },
  {
    name: "recommend_followups",
    label: "Recommend Follow-ups",
    description: "Next-best compliant action",
    Icon: ClipboardCheck,
    fallback: () => ""
  }
];

export function AssistantPanel() {
  const dispatch = useDispatch();
  const [message, setMessage] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const { messages, status } = useSelector((state) => state.assistant);
  const draft = useSelector((state) => state.interaction.draft);

  const send = async (text = message) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    dispatch(addUserMessage(trimmed));
    setMessage("");
    const result = await dispatch(sendAssistantMessage({ message: trimmed, currentDraft: draft }));
    if (
      sendAssistantMessage.fulfilled.match(result) &&
      result.payload.success !== false &&
      result.payload.interaction_patch &&
      Object.keys(result.payload.interaction_patch).length > 0
    ) {
      dispatch(applyAssistantDraft(result.payload.interaction_patch));
    }
  };

  const runSalesTool = async (tool) => {
    const typedMessage = message.trim();
    const toolMessage = typedMessage || tool.fallback(draft);
    if (tool.name === "edit_interaction" && !typedMessage) {
      setMessage("Edit the interaction: ");
      return;
    }

    dispatch(addUserMessage(`${tool.label}: ${toolMessage || "use current draft"}`));
    setMessage("");
    const result = await dispatch(runAgentTool({
      toolName: tool.name,
      message: toolMessage,
      currentDraft: draft
    }));
    if (
      runAgentTool.fulfilled.match(result) &&
      result.payload.success !== false &&
      result.payload.interaction_patch &&
      Object.keys(result.payload.interaction_patch).length > 0
    ) {
      dispatch(applyAssistantDraft(result.payload.interaction_patch));
    }
  };

  return (
    <aside className="assistant-panel">
      <header className="assistant-header">
        <div>
          <p className="eyebrow">AI Assistant</p>
          <h2><Bot size={19} /> Conversational Log</h2>
        </div>
        <span className="model-pill">Groq llama-3.1-8b-instant</span>
      </header>

      <div className="quick-prompts">
        {quickPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => send(prompt)}>
            <WandSparkles size={14} />
            {prompt}
          </button>
        ))}
      </div>

      <section className="sales-tools" aria-label="sales agent tools">
        <button
          className="sales-tools-toggle"
          type="button"
          onClick={() => setToolsOpen((open) => !open)}
          aria-expanded={toolsOpen}
        >
          <span><Sparkles size={15} /> AI agent tools</span>
          <span>{salesTools.length} tools {toolsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        </button>
        {toolsOpen && (
          <div className="sales-tool-grid">
            {salesTools.map((tool) => (
              <button
                key={tool.name}
                type="button"
                onClick={() => runSalesTool(tool)}
                disabled={status === "thinking"}
                title={tool.name}
              >
                <tool.Icon size={15} />
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="message-list" aria-live="polite">
        {messages.map((item, index) => (
          <div className={`message ${item.role}`} key={`${item.role}-${index}`}>
            {item.content}
          </div>
        ))}
        {status === "thinking" && (
          <div className="message assistant thinking">
            <Loader2 size={16} /> Thinking with LangGraph...
          </div>
        )}
      </div>

      <form
        className="chat-input"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Describe interaction or ask for help..."
        />
        <button className="primary-button icon-only" type="submit" disabled={status === "thinking"} title="Send">
          <CornerDownLeft size={18} />
        </button>
      </form>
    </aside>
  );
}
