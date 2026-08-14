"use client";

import { useCallback, useEffect, useState } from "react";

type State<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

// Generic async loader with loading/error/data + retry (spec §11 four states).
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): State<T> & {
  retry: () => void;
} {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });

  const run = useCallback(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });
    fn()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState({
            data: null,
            loading: false,
            error: e instanceof Error ? e.message : "Something went wrong loading this view.",
          });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => run(), [run]);

  return { ...state, retry: run };
}
