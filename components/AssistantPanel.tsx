"use client";

import React, { useState, useRef, useEffect, FormEvent } from "react";
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

function AssistantMessageContent({ content }: { content: string }) {
  if (!content.includes(" Summary: ")) {
    return <span>{content}</span>;
  }

  const [lead, summaryAndMore] = content.split(" Summary: ");
  return (
    <div>
      <p style={{ margin: 0, fontWeight: 500 }}>{lead}</p>
      <details
        style={{
          marginTop: "8px",
          fontSize: "12px",
          color: "#475467",
          borderTop: "1px dashed #cbd5e1",
          paddingTop: "6px",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 700,
            color: "#1d4ed8",
            outline: "none",
            userSelect: "none",
          }}
        >
          View extracted summary & notes ▾
        </summary>
        <div
          style={{
            marginTop: "6px",
            padding: "8px 10px",
            background: "#ffffff",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
            lineHeight: 1.45,
            color: "#334155",
          }}
        >
          {summaryAndMore}
        </div>
      </details>
    </div>
  );
}

export function AssistantPanel() {
  const dispatch = useAppDispatch();
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const { messages, status } = useAppSelector((state) => state.assistant);
  const draft = useAppSelector((state) => state.interaction.draft);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const send = async (text: string = message) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    dispatch(addUserMessage(trimmed));
    setMessage("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
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
            {item.role === "assistant" ? (
              <AssistantMessageContent content={item.content} />
            ) : (
              item.content
            )}
          </div>
        ))}
        {status === "thinking" && (
          <div className="message assistant thinking">
            <Loader2 size={16} /> Analyzing interaction details...
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleFormSubmit}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={message}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type field notes, physician feedback, or clinical updates..."
        />
        <button
          className="primary-button icon-only"
          type="submit"
          disabled={status === "thinking" || !message.trim()}
          title="Send (Enter)"
        >
          <CornerDownLeft size={18} />
        </button>
      </form>
    </aside>
  );
}
