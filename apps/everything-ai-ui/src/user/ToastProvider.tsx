import { useEffect, useState } from 'react';
import { ToastViewport, UserToast } from './ToastViewport';
import { TOAST_EVENT_NAME } from './toastBus';

const TOAST_DURATION_MS = 5200;

function createToastId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<UserToast[]>([]);

  function dismissToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  useEffect(() => {
    function handleToast(event: Event) {
      const customEvent = event as CustomEvent<Omit<UserToast, 'id'>>;
      const toast: UserToast = {
        id: createToastId(),
        tone: customEvent.detail?.tone || 'info',
        title: customEvent.detail?.title || 'EverythingAI',
        message: customEvent.detail?.message,
      };

      setToasts((current) => [toast, ...current].slice(0, 5));
      window.setTimeout(() => dismissToast(toast.id), TOAST_DURATION_MS);
    }

    window.addEventListener(TOAST_EVENT_NAME, handleToast);
    return () => window.removeEventListener(TOAST_EVENT_NAME, handleToast);
  }, []);

  return <ToastViewport toasts={toasts} onDismiss={dismissToast} />;
}

export default ToastProvider;
