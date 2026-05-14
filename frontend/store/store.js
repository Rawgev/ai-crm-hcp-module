import { configureStore } from "@reduxjs/toolkit";
import interactionReducer from "../features/interactions/interactionSlice.js";
import assistantReducer from "../features/assistant/assistantSlice.js";

export const store = configureStore({
  reducer: {
    interaction: interactionReducer,
    assistant: assistantReducer
  }
});
