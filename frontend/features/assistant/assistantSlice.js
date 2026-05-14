import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../lib/api.js";

export const sendAssistantMessage = createAsyncThunk(
  "assistant/sendMessage",
  async ({ message, currentDraft }, { rejectWithValue }) => {
    try {
      const response = await api.post("/agent/chat", {
        message,
        current_draft: currentDraft
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.normalizedMessage || "AI service temporarily unavailable");
    }
  }
);

export const runAgentTool = createAsyncThunk(
  "assistant/runTool",
  async ({ toolName, message, currentDraft }, { rejectWithValue }) => {
    try {
      const response = await api.post("/agent/tool", {
        tool_name: toolName,
        message,
        current_draft: currentDraft
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.normalizedMessage || "AI service temporarily unavailable");
    }
  }
);

const assistantSlice = createSlice({
  name: "assistant",
  initialState: {
    messages: [
      {
        role: "assistant",
        content: "Tell me what happened with the HCP. I can draft the log, suggest compliant next steps, or edit the current record."
      }
    ],
    status: "idle",
    error: null,
    lastToolCalls: []
  },
  reducers: {
    addUserMessage(state, action) {
      state.messages.push({ role: "user", content: action.payload });
    }
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
          content: action.payload.response || action.payload.message || "AI service temporarily unavailable. The structured form is still available."
        });
        state.error = action.payload.success === false ? action.payload.message : null;
        state.lastToolCalls = action.payload.tool_calls ?? [];
      })
      .addCase(sendAssistantMessage.rejected, (state, action) => {
        state.status = "idle";
        state.error = action.payload || action.error.message;
        state.messages.push({
          role: "assistant",
          content: "AI service is temporarily unavailable. The structured form is still available, and you can save the interaction manually."
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
          content: action.payload.response || action.payload.message || "AI service temporarily unavailable. The structured form is still available."
        });
        state.error = action.payload.success === false ? action.payload.message : null;
        state.lastToolCalls = action.payload.tool_calls ?? [];
      })
      .addCase(runAgentTool.rejected, (state, action) => {
        state.status = "idle";
        state.error = action.payload || action.error.message;
        state.messages.push({
          role: "assistant",
          content: "I could not run that AI tool right now. The form remains editable and safe to save."
        });
      });
  }
});

export const { addUserMessage } = assistantSlice.actions;
export default assistantSlice.reducer;
