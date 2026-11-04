"use client";

import React from "react";
import { Bot, FileText, MessageSquareText } from "lucide-react";

export function WorkflowStrip() {
  return (
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
  );
}

