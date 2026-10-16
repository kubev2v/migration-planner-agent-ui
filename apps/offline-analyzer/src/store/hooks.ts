import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./index";

/** Typed `useDispatch` for the agent-ui store. */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/** Typed `useSelector` for the agent-ui store. */
export const useAppSelector = useSelector.withTypes<RootState>();
