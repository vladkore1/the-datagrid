"use client";

import { toMobileTransformMediaQuery } from "../grid/utils/mobileTransform";
import type { TypeMobileTransformProps } from "../types";
import { useMediaQuery } from "./useMediaQuery";

/**
 * Whether the viewport is narrow enough for the grid's mobile layout, so a
 * consumer can drop the desktop chrome it renders around the grid at the same
 * width the grid itself switches over.
 *
 * Hand it the same object the grid gets, so one breakpoint governs both. An
 * editable grid keeps its table layout whatever this reports, since the
 * mobile rows have nowhere to put a cell editor.
 */
export function useMobileTransformActive(
  mobileTransform?: Pick<TypeMobileTransformProps, "breakpoint" | "enabled">
): boolean {
  const matches = useMediaQuery(
    toMobileTransformMediaQuery(mobileTransform?.breakpoint)
  );
  return (mobileTransform?.enabled ?? true) && matches;
}
