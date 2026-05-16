export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export type UserToast = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
};

type ToastViewportProps = {
  toasts: UserToast[];
  onDismiss: (id: string) => void;
};

const ICONS: Record<ToastTone, string> = {
  success: '✓',
  info: 'i',
  warning: '!',
  error: '×',
};

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (!toasts.length) return null;

  return <div className="toast-viewport" role="status" aria-live="polite">
    {toasts.map((toast) => <div className={`toast-card ${toast.tone}`} key={toast.id}>
      <span className="toast-icon">{ICONS[toast.tone]}</span>
      <span className="toast-content">
        <strong>{toast.title}</strong>
        {toast.message && <small>{toast.message}</small>}
      </span>
      <button className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">×</button>
    </div>)}
  </div>;
}

export default ToastViewport;
