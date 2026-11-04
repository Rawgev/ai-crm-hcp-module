import { configureStore } from "@reduxjs/toolkit";
import interactionReducer from "./slices/interactionSlice";
import assistantReducer from "./slices/assistantSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      interaction: interactionReducer,
      assistant: assistantReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

