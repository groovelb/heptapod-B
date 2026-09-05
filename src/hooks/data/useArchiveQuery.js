import { useCallback, useEffect, useState } from 'react';

/** Abort supported requests and ignore late responses after navigation/unmount. */
export function useArchiveQuery(query, { enabled = true, initialData = null } = {}) {
  const [state, setState] = useState({ query, revision: 0, data: initialData, loading: enabled, error: null });
  const [revision, setRevision] = useState(0);
  const refetch = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    if (!enabled) return () => controller.abort();
    Promise.resolve().then(() => query(controller.signal)).then(
      (data) => {
        if (!controller.signal.aborted) setState({ query, revision, data, loading: false, error: null });
      },
      (error) => {
        if (!controller.signal.aborted) setState({ query, revision, data: initialData, loading: false, error: error.message || '요청에 실패했습니다.' });
      },
    );
    return () => controller.abort();
  }, [query, enabled, initialData, revision]);
  // A render for a new center must never expose the previous center's neighbors.
  const current = enabled && state.query === query && state.revision === revision
    ? state : { data: initialData, loading: enabled, error: null };
  return { data: current.data, loading: current.loading, error: current.error, refetch };
}
