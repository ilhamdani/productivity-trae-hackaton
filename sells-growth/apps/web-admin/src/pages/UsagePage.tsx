import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { AdminUserUsageListResponse } from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import { useToast } from "../components/Toast";

export default function UsagePage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminUserUsageListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load(nextPage: number, nextPageSize: number) {
    setLoading(true);
    try {
      const res = await apiFetch<AdminUserUsageListResponse>(`/api/v1/admin/users/usage?page=${nextPage}&page_size=${nextPageSize}`);
      setData(res);
    } catch (e: any) {
      toast.push({ title: "Gagal load usage", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page, pageSize);
  }, [page, pageSize]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(total, page * pageSize);

  return (
    <div className="grid gap-4">
      <Card
        title="Usage"
        subtitle="Pemakaian dan limit per user."
        right={
          <Button variant="ghost" size="sm" onClick={() => load(page, pageSize)} disabled={loading}>
            Refresh
          </Button>
        }
      >
        {loading ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Loading…</div>
        ) : !data || data.items.length === 0 ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Tidak ada data.</div>
        ) : (
          <div className="border border-slate-200/70 bg-white">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-xs text-slate-600">
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Username</th>
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Plan</th>
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Status</th>
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Campaign this month</th>
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Limit</th>
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Team size</th>
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Seats limit</th>
                    <th className="border-b border-slate-100 px-3 py-2 text-right font-medium">User</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((x) => (
                    <tr key={x.user.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-2 align-top text-slate-900">{x.user.username || "-"}</td>
                      <td className="px-3 py-2 align-top text-slate-700">
                        {x.subscription?.pricing_plan?.key || x.subscription?.plan_key || "-"}
                      </td>
                      <td className="px-3 py-2 align-top text-slate-700">{x.subscription?.status || "-"}</td>
                      <td className="px-3 py-2 align-top text-slate-700">{x.usage.campaigns_this_month}</td>
                      <td className="px-3 py-2 align-top text-slate-700">{x.usage.campaign_monthly_limit ?? "-"}</td>
                      <td className="px-3 py-2 align-top text-slate-700">{x.usage.team_size ?? "-"}</td>
                      <td className="px-3 py-2 align-top text-slate-700">{x.usage.user_seats_limit ?? "-"}</td>
                      <td className="px-3 py-2 align-top text-right">
                        <Link to={`/admin/users/${x.user.id}`} className="text-leaf-700 underline underline-offset-4">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-2">
              <div className="text-xs text-slate-600">
                Menampilkan {startIndex}–{endIndex} dari {total}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={String(pageSize)}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border border-slate-200/80 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-leaf-200/70"
                >
                  <option value="5">5 / page</option>
                  <option value="10">10 / page</option>
                  <option value="20">20 / page</option>
                </select>

                <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Prev
                </Button>
                <div className="px-2 text-xs text-slate-600">
                  {page} / {totalPages}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

