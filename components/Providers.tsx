"use client";

import React, { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, AppStore } from "@/redux/store";

export function Providers({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore>();
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}

