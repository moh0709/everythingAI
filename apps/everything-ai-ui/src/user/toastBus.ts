import type { ToastTone } from './ToastViewport';

export type ToastInput = {
  tone?: ToastTone;
  title: string;
  message?: string;
};

export const TOAST_EVENT_NAME = 'everythingai:user-toast';

export function showUserToast(input: ToastInput) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT_NAME, {
    detail: {
      tone: input.tone || 'info',
      title: input.title,
      message: input.message,
    },
  }));
}
