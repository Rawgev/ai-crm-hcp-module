"use client";

import React from "react";
import { Loader2, Rocket } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="health-screen">
      <div className="health-panel">
        <div className="health-mark">
          <Rocket size={28} />
        </div>
        <h1>Server is waking up...</h1>
        <p className="health-copy">
          Connecting to AI orchestration and database services. Please wait a moment.
        </p>
        <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
          <Loader2 className="health-spinner" size={24} color="#138a62" />
        </div>
      </div>
    </div>
  );
}

