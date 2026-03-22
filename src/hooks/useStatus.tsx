import { useCallback, useState } from "react";
import type { ReactElement } from "react";
import type { TLoadingState } from "../types";

type StatusProps = {
  [key in TLoadingState]: ReactElement;
};

/**
 * Custom hook for managing component loading states.
 *
 * Returns a `Status` render component that displays the correct child
 * element based on the current state, plus a `setStatus` updater.
 *
 * @param initialState - The initial loading state.
 *
 * @example
 * const { Status, setStatus } = useStatus("loading");
 * return <Status loading={<Spinner />} success={<Data />} error={<Err />} empty={<Empty />} />;
 */
const useStatus = (initialState: TLoadingState) => {
  const [status, setStatus] = useState<TLoadingState>(initialState);

  // Memoised so the component reference only changes when `status` changes.
  // Without this, every parent re-render produces a new function reference,
  // causing React to unmount/remount the rendered content and replay CSS
  // animations (e.g. animate-fade-in) on unrelated state updates.
  const Status = useCallback(
    (props: StatusProps): ReactElement | null => props[status] ?? null,
    [status]
  );

  return { Status, setStatus };
};

export default useStatus;
