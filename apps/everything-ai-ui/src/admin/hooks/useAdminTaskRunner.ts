import { useState } from 'react';

type AdminTask = () => Promise<void>;

export function useAdminTaskRunner(initialMessage = 'Ready for AI Analysis') {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState('');

  async function run(label: string, task: AdminTask) {
    setBusy(true);
    setError('');
    setMessage(label);

    try {
      await task();
    } catch (err: any) {
      setError(err.message || String(err));
      setMessage('Action failed');
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    setBusy,
    message,
    setMessage,
    error,
    setError,
    run,
  };
}

export default useAdminTaskRunner;
