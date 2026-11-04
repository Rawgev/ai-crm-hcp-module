import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { InteractionDraft } from "./interactionSlice";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantState {
  messages: ChatMessage[];
  status: "idle" | "thinking";
  error: string | null;
  lastToolCalls: string[];
}

export const sendAssistantMessage = createAsyncThunk(
  "assistant/sendMessage",
  async (
    { message, currentDraft }: { message: string; currentDraft: InteractionDraft },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          current_draft: currentDraft,
        }),
      });

      if (!response.ok) {
        return rejectWithValue("AI service temporarily unavailable");
      }

      return await response.json();
    } catch {
      return rejectWithValue("AI service temporarily unavailable");
    }
  }
);

export const runAgentTool = createAsyncThunk(
  "assistant/runTool",
  async (
    {
      toolName,
      message,
      currentDraft,
    }: {
      toolName: string;
      message: string;
      currentDraft: InteractionDraft;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/agent/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_name: toolName,
          message,
          current_draft: currentDraft,
        }),
      });

      if (!response.ok) {
        return rejectWithValue("AI service temporarily unavailable");
      }

      return await response.json();
    } catch {
      return rejectWithValue("AI service temporarily unavailable");
    }
  }
);

const initialState: AssistantState = {
  messages: [
    {
      role: "assistant",
      content:
        "Tell me what happened with the HCP. I can draft the log, suggest compliant next steps, or edit the current record.",
    },
  ],
  status: "idle",
  error: null,
  lastToolCalls: [],
};

export const assistantSlice = createSlice({
  name: "assistant",
  initialState,
  reducers: {
    addUserMessage(state, action: PayloadAction<string>) {
      state.messages.push({ role: "user", content: action.payload });
    },
  },
  extraReducers(builder) {
    builder
      .addCase(sendAssistantMessage.pending, (state) => {
        state.status = "thinking";
        state.error = null;
      })
      .addCase(sendAssistantMessage.fulfilled, (state, action) => {
        state.status = "idle";
        state.messages.push({
          role: "assistant",
          content:
            action.payload.response ||
            action.payload.message ||
            "AI service temporarily unavailable. The structured form is still available.",
        });
        state.error = action.payload.success === false ? action.payload.message : null;
        state.lastToolCalls = action.payload.tool_calls ?? [];
      })
      .addCase(sendAssistantMessage.rejected, (state, action) => {
        state.status = "idle";
        state.error = (action.payload as string) || action.error.message || null;
        state.messages.push({
          role: "assistant",
          content:
            "AI service is temporarily unavailable. The structured form is still available, and you can save the interaction manually.",
        });
      })
      .addCase(runAgentTool.pending, (state) => {
        state.status = "thinking";
        state.error = null;
      })
      .addCase(runAgentTool.fulfilled, (state, action) => {
        state.status = "idle";
        state.messages.push({
          role: "assistant",
          content:
            action.payload.response ||
            action.payload.message ||
            "AI service temporarily unavailable. The structured form is still available.",
        });
        state.error = action.payload.success === false ? action.payload.message : null;
        state.lastToolCalls = action.payload.tool_calls ?? [];
      })
      .addCase(runAgentTool.rejected, (state, action) => {
        state.status = "idle";
        state.error = (action.payload as string) || action.error.message || null;
        state.messages.push({
          role: "assistant",
          content: "I could not run that AI tool right now. The form remains editable and safe to save.",
        });
      });
  },
});

export const { addUserMessage } = assistantSlice.actions;
export default assistantSlice.reducer;

