"use client";

import React, { useState, FormEvent } from "react";
import {
  CornerDownLeft,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { applyAssistantDraft } from "@/redux/slices/interactionSlice";
import {
  addUserMessage,
  sendAssistantMessage,
} from "@/redux/slices/assistantSlice";

export function AssistantPanel() {
  const dispatch = useAppDispatch();
  const [message, setMessage] = useState("");
  const { messages, status } = useAppSelector((state) => state.assistant);
  const draft = useAppSelector((state) => state.interaction.draft);

  const send = async (text: string = message) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    dispatch(addUserMessage(trimmed));
    setMessage("");

    const result = await dispatch(
      sendAssistantMessage({ message: trimmed, currentDraft: draft })
    );

    if (
      sendAssistantMessage.fulfilled.match(result) &&
      result.payload.success !== false &&
      result.payload.interaction_patch &&
      Object.keys(result.payload.interaction_patch).length > 0
    ) {
      dispatch(applyAssistantDraft(result.payload.interaction_patch));
    }
  };

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };

  return (
    <aside className="assistant-panel">
      <header className="assistant-header">
        <div>
          <p className="eyebrow">Clinical Documentation</p>
          <h2>
            <Sparkles size={18} /> Field Assistant
          </h2>
        </div>
        <span className="model-pill">● Copilot Active</span>
      </header>

      <div className="message-list" aria-live="polite">
        {messages.map((item, index) => (
          <div
            className={`message ${item.role}`}
            key={`${item.role}-${index}`}
          >
            {item.content}
          </div>
        ))}
        {status === "thinking" && (
          <div className="message assistant thinking">
            <Loader2 size={16} /> Analyzing interaction details...
          </div>
        )}
      </div>

      <form className="chat-input" onSubmit={handleFormSubmit}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Type field notes, physician feedback, or clinical updates..."
        />
        <button
          className="primary-button icon-only"
          type="submit"
          disabled={status === "thinking"}
          title="Send"
        >
          <CornerDownLeft size={18} />
        </button>
      </form>
    </aside>
  );
}

