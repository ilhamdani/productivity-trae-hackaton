import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import type { AdminBillingRunResponse } from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import { useToast } from "../components/Toast";

export default function BillingPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<AdminBillingRunResponse | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<AdminBillingRunResponse | null>("/api/v1/admin/billing/last-run");
      setData(res);
    } catch (e: any) {
      toast.push({ title: "Gagal load billing", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  async function runNow() {
    if (running) return;
    setRunning(true);
    try {
      const res = await apiFetch<AdminBillingRunResponse>("/api/v1/admin/billing/run", { method: "POST" });
      setData(res);
      toast.push({ title: "Billing job selesai", detail: `downgraded: ${res.downgraded}`, tone: "success" });
    } catch (e: any) {
      toast.push({ title: "Gagal run billing", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-4">
      <Card
        title="Billing"
        subtitle="Run job sekarang dan lihat last run."
        right={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={load} disabled={loading || running}>
              Refresh
            </Button>
            <Button size="sm" onClick={runNow} disabled={running}>
              {running ? "Running…" : "Run Now"}
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Loading…</div>
        ) : !data ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Belum ada history run.</div>
        ) : (
          <div className="border border-slate-200/70 bg-white p-4">
            <div className="grid gap-2 text-sm text-slate-800">
              <div>
                <span className="text-slate-500">Status:</span> {data.status}
              </div>
              <div>
                <span className="text-slate-500">Started:</span> {new Date(data.started_at).toLocaleString()}
              </div>
              <div>
                <span className="text-slate-500">Finished:</span> {data.finished_at ? new Date(data.finished_at).toLocaleString() : "-"}
              </div>
              <div>
                <span className="text-slate-500">Downgraded:</span> {data.downgraded}
              </div>
              <div>
                <span className="text-slate-500">Upgraded:</span> {data.upgraded}
              </div>
              {data.error_message ? (
                <div className="border-t border-slate-100 pt-2 text-xs text-red-700">{data.error_message}</div>
              ) : null}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

