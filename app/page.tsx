"use client";

import React from "react";
import { Header } from "@/components/Header";
import { WorkflowStrip } from "@/components/WorkflowStrip";
import { InteractionForm } from "@/components/InteractionForm";
import { AssistantPanel } from "@/components/AssistantPanel";

export default function Home() {
  return (
    <main className="app-shell">
      <Header />
      <WorkflowStrip />
      <section className="screen-grid">
        <InteractionForm />
        <AssistantPanel />
      </section>
    </main>
  );
}
