import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import Button from "../components/Button";
import Card from "../components/Card";
import { useToast } from "../components/Toast";

type ProductListItem = { id: string; sku: string; name: string; category: string };

export default function MasterProductPage() {
  const toast = useToast();
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: ProductListItem[] }>("/api/v1/products");
      setItems(res.items);
    } catch (e: any) {
      toast.push({ title: "Gagal load catalog produk", detail: e?.message || "Unknown error", tone: "danger" });
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
        title="Master Product"
        subtitle="Catalog produk untuk dipakai saat bikin campaign."
        right={
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            Refresh
          </Button>
        }
      >
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/60">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center">
            <div className="font-display text-xl">Catalog kosong</div>
            <div className="mt-2 text-sm text-white/55">Tambahkan produk dari backend atau import, lalu refresh.</div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <div
                key={p.id}
                className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-white/3 p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-lg leading-snug tracking-tight">{p.name}</div>
                    <div className="mt-1 text-xs text-white/50">{p.sku}</div>
                  </div>
                  <div className="inline-flex rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                    {p.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
