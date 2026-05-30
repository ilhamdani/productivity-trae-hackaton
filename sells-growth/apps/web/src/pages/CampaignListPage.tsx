import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { CampaignListItem } from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import { useToast } from "../components/Toast";

function StatusPill({ status }: { status: CampaignListItem["status"] }) {
  const tone =
    status === "complete"
      ? "border-mint-300/25 bg-mint-300/10 text-mint-100"
      : status === "failed"
        ? "border-red-300/25 bg-red-300/10 text-red-100"
        : status === "running"
          ? "border-caramel-300/25 bg-caramel-300/10 text-caramel-100"
          : "border-white/12 bg-white/5 text-white/70";

  return (
    <div className={["inline-flex rounded-full border px-3 py-1 text-xs font-medium", tone].join(" ")}>
      {status.toUpperCase()}
    </div>
  );
}

export default function CampaignListPage() {
  const toast = useToast();
  const [items, setItems] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-6">
      <Card
        title="Campaigns"
        subtitle="Lihat semua campaign kamu, lanjutkan yang running, atau buat yang baru."
        right={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Link to="/campaigns/new">
              <Button size="sm">New</Button>
            </Link>
          </div>
        }
      >
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/60">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center">
            <div className="font-display text-xl">Belum ada campaign</div>
            <div className="mt-2 text-sm text-white/55">Buat campaign pertama kamu dan generate paket promosi lengkap.</div>
            <div className="mt-5">
              <Link to="/campaigns/new">
                <Button>New Campaign</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <Link
                key={c.id}
                to={`/campaigns/${c.id}`}
                className="group rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-white/3 p-4 shadow-card transition hover:translate-y-[-2px] hover:border-white/18"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-lg leading-snug tracking-tight">{c.product_name}</div>
                    <div className="mt-1 text-xs text-white/45">{new Date(c.created_at).toLocaleString()}</div>
                  </div>
                  <StatusPill status={c.status} />
                </div>
                <div className="mt-4 text-sm text-white/60">
                  <span className="text-white/85">Open</span>{" "}
                  <span className="opacity-70 group-hover:opacity-100">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

