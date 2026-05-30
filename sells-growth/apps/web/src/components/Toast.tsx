import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

type ToastItem = {
  id: string;
  title: string;
  detail?: string;
  tone?: "neutral" | "success" | "danger";
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
              "rounded-2xl border px-4 py-3 shadow-card backdrop-blur",
              t.tone === "success"
                ? "border-mint-300/25 bg-mint-300/10"
                : t.tone === "danger"
                  ? "border-red-300/25 bg-red-300/10"
                  : "border-white/12 bg-white/6",
            ].join(" ")}
          >
            <div className="text-sm font-medium text-white/90">{t.title}</div>
            {t.detail ? <div className="mt-1 text-xs text-white/60">{t.detail}</div> : null}
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

