/**
 * Toast context and hook for notifications
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useEffect,
} from "react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number; // ms; 0 = no auto-dismiss
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"], duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/** Provides toast notification state and rendering. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clean up all timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    // Clear any pending timeout for this toast
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info", duration = 3000) => {
      const id = Math.random().toString(36).substr(2, 9);
      const toast: Toast = { id, message, type, duration };
      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        const timeoutId = setTimeout(() => removeToast(id), duration);
        timeoutRefs.current.set(id, timeoutId);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div
        className="fixed z-50 space-y-2 bottom-4 right-4"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            aria-live="polite"
            className={`rounded px-4 py-2 text-white ${
              t.type === "success"
                ? "bg-green-600"
                : t.type === "error"
                ? "bg-red-600"
                : t.type === "warning"
                ? "bg-yellow-500 text-black"
                : "bg-blue-600"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/**
 * Access the toast API (addToast only).
 * Must be used within {@link ToastProvider}.
 */
export const useToast = (): Pick<ToastContextValue, "addToast"> => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return { addToast: ctx.addToast };
};
