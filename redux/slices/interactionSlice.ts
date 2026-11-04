import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface InteractionDraft {
  id?: number;
  hcp_id: string;
  hcp_name: string;
  interaction_type: string;
  interaction_date: string;
  interaction_time: string;
  attendees: string;
  topics_discussed: string;
  materials_shared: string[];
  samples_distributed: string[];
  sentiment: "Positive" | "Neutral" | "Negative";
  outcomes: string;
  follow_up_actions: string;
  channel: string;
  consent_for_voice_summary: boolean;
  compliance_flags?: string[];
  ai_summary?: string;
  extracted_entities?: Record<string, unknown>;
}

export interface InteractionState {
  draft: InteractionDraft;
  status: "idle" | "saving" | "saved" | "error";
  lastSaved: any | null;
  error: string | null;
}

const getTodayIso = () => new Date().toISOString().slice(0, 10);
const getCurrentTime = () => new Date().toTimeString().slice(0, 5);

export const initialDraft: InteractionDraft = {
  hcp_id: "hcp_1001",
  hcp_name: "Dr. Priya Menon",
  interaction_type: "Meeting",
  interaction_date: getTodayIso(),
  interaction_time: getCurrentTime(),
  attendees: "",
  topics_discussed: "",
  materials_shared: [],
  samples_distributed: [],
  sentiment: "Neutral",
  outcomes: "",
  follow_up_actions: "",
  channel: "field_visit",
  consent_for_voice_summary: false,
};

export const saveInteraction = createAsyncThunk(
  "interaction/save",
  async (draft: InteractionDraft, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(errorData.message || "Could not save interaction");
      }

      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Could not save interaction");
    }
  }
);

const initialState: InteractionState = {
  draft: initialDraft,
  status: "idle",
  lastSaved: null,
  error: null,
};

export const interactionSlice = createSlice({
  name: "interaction",
  initialState,
  reducers: {
    updateField<K extends keyof InteractionDraft>(
      state: InteractionState,
      action: PayloadAction<{ field: K; value: InteractionDraft[K] }>
    ) {
      const { field, value } = action.payload;
      state.draft[field] = value;
    },
    applyAssistantDraft(
      state: InteractionState,
      action: PayloadAction<Partial<InteractionDraft>>
    ) {
      state.draft = {
        ...state.draft,
        ...action.payload,
        materials_shared:
          action.payload.materials_shared ?? state.draft.materials_shared,
        samples_distributed:
          action.payload.samples_distributed ?? state.draft.samples_distributed,
      };
    },
    addMaterial(state: InteractionState, action: PayloadAction<string>) {
      if (!state.draft.materials_shared.includes(action.payload)) {
        state.draft.materials_shared.push(action.payload);
      }
    },
    addSample(state: InteractionState, action: PayloadAction<string>) {
      if (!state.draft.samples_distributed.includes(action.payload)) {
        state.draft.samples_distributed.push(action.payload);
      }
    },
    resetDraft(state: InteractionState) {
      state.draft = {
        ...initialDraft,
        interaction_date: getTodayIso(),
        interaction_time: getCurrentTime(),
      };
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(saveInteraction.pending, (state) => {
        state.status = "saving";
        state.error = null;
      })
      .addCase(saveInteraction.fulfilled, (state, action) => {
        state.status = "saved";
        state.lastSaved = action.payload;
      })
      .addCase(saveInteraction.rejected, (state, action) => {
        state.status = "error";
        state.error = (action.payload as string) || action.error.message || "Failed to save";
      });
  },
});

export const { addMaterial, addSample, applyAssistantDraft, resetDraft, updateField } =
  interactionSlice.actions;

export default interactionSlice.reducer;

