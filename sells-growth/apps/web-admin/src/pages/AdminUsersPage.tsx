import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { AdminUserListResponse } from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import { useToast } from "../components/Toast";

export default function AdminUsersPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminUserListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load(nextPage: number, nextPageSize: number) {
    setLoading(true);
    try {
      const res = await apiFetch<AdminUserListResponse>(`/api/v1/admin/users?page=${nextPage}&page_size=${nextPageSize}`);
      setData(res);
    } catch (e: any) {
      toast.push({ title: "Gagal load admin users", detail: e?.message || "Unknown error", tone: "danger" });
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
        title="Users"
        subtitle="Data user dan subscription."
        right={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => load(page, pageSize)} disabled={loading}>
              Refresh
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Loading…</div>
        ) : !data || data.items.length === 0 ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
            Belum ada user.
          </div>
        ) : (
          <div className="border border-slate-200/70 bg-white">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-xs text-slate-600">
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Username</th>
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Role</th>
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Plan</th>
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Status</th>
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Created</th>
                    <th className="border-b border-slate-100 px-3 py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.user.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-2 align-top text-slate-900">{item.user.username || "-"}</td>
                      <td className="px-3 py-2 align-top text-slate-700">{item.user.role}</td>
                      <td className="px-3 py-2 align-top text-slate-700">
                        {item.subscription?.pricing_plan?.key || item.subscription?.plan_key || "-"}
                      </td>
                      <td className="px-3 py-2 align-top text-slate-700">{item.subscription?.status || "-"}</td>
                      <td className="px-3 py-2 align-top text-slate-700">{new Date(item.user.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2 align-top text-right">
                        <Link to={`/admin/users/${item.user.id}`} className="text-leaf-700 underline underline-offset-4">
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
