import { sourceText as t } from '../../i18n/messages.js';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useArchiveMutation(operation) {
  const mounted = useRef(false);
  const running = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const mutate = useCallback((...args) => {
    if (running.current) return running.current;
    setLoading(true);
    setError(null);
    const request = Promise.resolve().then(() => operation(...args)).catch((err) => {
      if (mounted.current) setError(err.message || t('useArchiveMutation.theRequestFailed'));
      throw err;
    }).finally(() => {
      running.current = null;
      if (mounted.current) setLoading(false);
    });
    running.current = request;
    return request;
  }, [operation]);
  return { mutate, loading, error };
}
