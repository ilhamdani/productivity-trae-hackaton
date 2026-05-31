import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import type { AdminDashboardResponse } from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import { useToast } from "../components/Toast";

export default function AdminDashboardPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminDashboardResponse | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<AdminDashboardResponse>("/api/v1/admin/dashboard");
      setData(res);
    } catch (e: any) {
      toast.push({ title: "Gagal load dashboard", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-4">
      <Card
        title="Dashboard"
        subtitle="Ringkasan singkat."
        right={
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            Refresh
          </Button>
        }
      >
        {loading ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Loading…</div>
        ) : !data ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Tidak ada data.</div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="border border-slate-200/70 bg-white p-4">
                <div className="text-xs text-slate-500">Total users</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{data.total_users}</div>
              </div>
            </div>

            <div className="border border-slate-200/70 bg-white">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Users by plan</div>
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-xs text-slate-600">
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Key</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Name</th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium">Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users_by_plan.map((x) => (
                      <tr key={`${x.key}-${x.name}`} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-2 align-top text-slate-900">{x.key}</td>
                        <td className="px-3 py-2 align-top text-slate-700">{x.name}</td>
                        <td className="px-3 py-2 align-top text-right text-slate-700">{x.user_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

