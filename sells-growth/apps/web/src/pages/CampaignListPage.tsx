import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { CampaignListItem } from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import { useToast } from "../components/Toast";

function StatusPill({ status }: { status: CampaignListItem["status"] }) {
  const tone =
    status === "complete"
      ? "border-leaf-200 bg-leaf-50 text-leaf-800"
      : status === "failed"
        ? "border-red-200 bg-red-50 text-red-700"
        : status === "running"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className={["inline-flex border px-3 py-1 text-xs font-medium", tone].join(" ")}>
      {status.toUpperCase()}
    </div>
  );
}

export default function CampaignListPage() {
  const toast = useToast();
  const [items, setItems] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: CampaignListItem[] }>("/api/v1/campaigns");
      setItems(res.items);
    } catch (e: any) {
      toast.push({ title: "Gagal load campaigns", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(total, page * pageSize);

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-4">
      <Card
        title="Campaigns"
        subtitle="Lihat semua campaign kamu, lanjutkan yang running, atau buat yang baru."
        right={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Link
              to="/campaigns/new"
              className="inline-flex items-center justify-center gap-2 rounded-none bg-gradient-to-b from-leaf-500 to-leaf-700 px-3 py-1.5 text-sm font-medium text-white shadow-glow transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-leaf-300/45"
            >
              New
            </Link>
          </div>
        }
      >
        {loading ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center">
            <div className="font-display text-xl">Belum ada campaign</div>
            <div className="mt-2 text-sm text-slate-600">Buat campaign pertama kamu dan generate paket promosi lengkap.</div>
            <div className="mt-5">
              <Link
                to="/campaigns/new"
                className="inline-flex items-center justify-center gap-2 rounded-none bg-gradient-to-b from-leaf-500 to-leaf-700 px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-leaf-300/45"
              >
                New Campaign
              </Link>
            </div>
          </div>
        ) : (
          <div className="border border-slate-200/70 bg-white">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-xs text-slate-600">
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Campaign</th>
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Status</th>
                    <th className="border-b border-slate-100 px-3 py-2 font-medium">Created</th>
                    <th className="border-b border-slate-100 px-3 py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-2 align-top text-slate-900">
                        <Link to={`/campaigns/${c.id}`} className="font-medium hover:underline">
                          {c.product_name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <StatusPill status={c.status} />
                      </td>
                      <td className="px-3 py-2 align-top text-slate-700">{new Date(c.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2 align-top text-right">
                        <Link to={`/campaigns/${c.id}`} className="text-leaf-700 underline underline-offset-4">
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
