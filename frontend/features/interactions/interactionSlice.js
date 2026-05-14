import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../lib/api.js";

const today = new Date();
const isoDate = today.toISOString().slice(0, 10);
const time = today.toTimeString().slice(0, 5);

const initialDraft = {
  hcp_id: "hcp_1001",
  hcp_name: "Dr. Priya Menon",
  interaction_type: "Meeting",
  interaction_date: isoDate,
  interaction_time: time,
  attendees: "",
  topics_discussed: "",
  materials_shared: [],
  samples_distributed: [],
  sentiment: "Neutral",
  outcomes: "",
  follow_up_actions: "",
  channel: "field_visit",
  consent_for_voice_summary: false
};

export const saveInteraction = createAsyncThunk(
  "interaction/save",
  async (draft, { rejectWithValue }) => {
    try {
      const response = await api.post("/interactions", draft);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.normalizedMessage || "Could not save interaction");
    }
  }
);

const interactionSlice = createSlice({
  name: "interaction",
  initialState: {
    draft: initialDraft,
    status: "idle",
    lastSaved: null,
    error: null
  },
  reducers: {
    updateField(state, action) {
      const { field, value } = action.payload;
      state.draft[field] = value;
    },
    applyAssistantDraft(state, action) {
      state.draft = {
        ...state.draft,
        ...action.payload,
        materials_shared: action.payload.materials_shared ?? state.draft.materials_shared,
        samples_distributed: action.payload.samples_distributed ?? state.draft.samples_distributed
      };
    },
    addMaterial(state, action) {
      if (!state.draft.materials_shared.includes(action.payload)) {
        state.draft.materials_shared.push(action.payload);
      }
    },
    addSample(state, action) {
      if (!state.draft.samples_distributed.includes(action.payload)) {
        state.draft.samples_distributed.push(action.payload);
      }
    },
    resetDraft(state) {
      state.draft = initialDraft;
      state.status = "idle";
      state.error = null;
    }
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
        state.error = action.payload || action.error.message;
      });
  }
});

export const { addMaterial, addSample, applyAssistantDraft, resetDraft, updateField } = interactionSlice.actions;
export default interactionSlice.reducer;
