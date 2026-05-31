import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

type ToastItem = {
  id: string;
  title: string;
  detail?: string;
  tone?: "neutral" | "success" | "danger" | "warning";
};

const ToastContext = createContext<{
  push: (t: Omit<ToastItem, "id">) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}-${Math.random()}`;
    setItems((prev) => [...prev, { id, ...t }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex w-[360px] max-w-[90vw] flex-col gap-3">
        {items.map((t) => (
          <div
            key={t.id}
            className={[
              "rounded-none border bg-white px-4 py-3 shadow-card",
              t.tone === "success"
                ? "border-leaf-200"
                : t.tone === "danger"
                  ? "border-red-200"
                  : t.tone === "warning"
                    ? "border-amber-200"
                    : "border-slate-200/70",
            ].join(" ")}
          >
            <div className="text-sm font-medium text-slate-900">{t.title}</div>
            {t.detail ? <div className="mt-1 text-xs text-slate-600">{t.detail}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("ToastProvider is required");
  return ctx;
}

