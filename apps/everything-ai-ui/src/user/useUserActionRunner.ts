import { useState } from 'react';

export function useUserActionRunner() {
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(label: string, task: () => Promise<void>) {
    setBusy(true);
    setError('');
    setStatus(label);
    try {
      await task();
    } catch (err: any) {
      setError(err.message || String(err));
      setStatus('Action failed');
    } finally {
      setBusy(false);
    }
  }

  return {
    status,
    setStatus,
    error,
    setError,
    busy,
    run,
  };
}
