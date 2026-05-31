import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import type { Money } from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import TextArea from "../components/TextArea";
import { useToast } from "../components/Toast";

type ProductListItem = { id: string; sku: string; name: string; category: string };
type ProductDetail = {
  id: string;
  sku: string;
  name: string;
  base_description: string;
  category: string;
  base_price: Money;
};

type ProductDraft = {
  sku: string;
  name: string;
  base_description: string;
  category: string;
  price_amount: string;
};

function toNonNegativeNumber(v: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

const emptyDraft: ProductDraft = {
  sku: "",
  name: "",
  base_description: "",
  category: "",
  price_amount: "0",
};

export default function MasterProductPage() {
  const toast = useToast();
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);

  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => [p.name, p.sku, p.category].some((x) => x.toLowerCase().includes(q)));
  }, [items, query]);

  async function loadList() {
    setLoadingList(true);
    try {
      const res = await apiFetch<{ items: ProductListItem[] }>("/api/v1/products");
      setItems(res.items);
    } catch (e: any) {
      toast.push({ title: "Gagal load catalog produk", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoadingList(false);
    }
  }

  async function loadDetail(productId: string) {
    setLoadingDetail(true);
    try {
      const res = await apiFetch<ProductDetail>(`/api/v1/products/${productId}`);
      setDetail(res);
      setDraft({
        sku: res.sku,
        name: res.name,
        base_description: res.base_description,
        category: res.category,
        price_amount: String(res.base_price.amount),
      });
    } catch (e: any) {
      toast.push({ title: "Gagal load detail produk", detail: e?.message || "Unknown error", tone: "danger" });
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  function startCreate() {
    setMode("create");
    setSelectedId(null);
    setDetail(null);
    setDraft(emptyDraft);
  }

  function startEdit(productId: string) {
    setMode("edit");
    setSelectedId(productId);
    loadDetail(productId);
  }

  async function save() {
    if (saving) return;

    const sku = draft.sku.trim();
    const name = draft.name.trim();
    const category = draft.category.trim();
    const base_description = draft.base_description.trim();
    const amount = toNonNegativeNumber(draft.price_amount);

    if (!sku || !name || !category || !base_description) {
      toast.push({ title: "Lengkapi semua field", tone: "danger" });
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const res = await apiFetch<{ id: string }>("/api/v1/products", {
          method: "POST",
          body: JSON.stringify({
            sku,
            name,
            category,
            base_description,
            base_price: { currency: "IDR", amount },
          }),
        });
        toast.push({ title: "Produk dibuat", tone: "success" });
        await loadList();
        startEdit(res.id);
      } else if (selectedId) {
        await apiFetch(`/api/v1/products/${selectedId}`, {
          method: "PUT",
          body: JSON.stringify({
            sku,
            name,
            category,
            base_description,
            base_price: { currency: "IDR", amount },
          }),
        });
        toast.push({ title: "Produk tersimpan", tone: "success" });
        await loadList();
        await loadDetail(selectedId);
      }
    } catch (e: any) {
      toast.push({ title: "Gagal simpan produk", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selectedId || deleting) return;
    const ok = window.confirm("Hapus produk ini? Stok inventory produk ini juga akan ikut terhapus.");
    if (!ok) return;

    setDeleting(true);
    try {
      await apiFetch(`/api/v1/products/${selectedId}`, { method: "DELETE" });
      toast.push({ title: "Produk terhapus", tone: "success" });
      await loadList();
      startCreate();
    } catch (e: any) {
      toast.push({ title: "Gagal hapus produk", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  return (
    <div className="grid gap-4">
      <Card
        title="Master Product"
        subtitle="CRUD produk yang dipakai saat bikin campaign."
        right={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={startCreate}>
              New
            </Button>
            <Button variant="ghost" size="sm" onClick={loadList} disabled={loadingList}>
              Refresh
            </Button>
          </div>
        }
      >
        {loadingList ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
            Loading…
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-5 lg:col-span-4">
              <div className="border border-slate-200/70 bg-white p-3 shadow-card">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari produk (nama / SKU / kategori)…"
                  className="py-2"
                />
                <div className="mt-3 grid max-h-[520px] gap-2 overflow-auto pr-1">
                  {filteredItems.length === 0 ? (
                    <div className="border border-slate-200/70 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                      Catalog kosong. Buat produk pertama di panel kanan.
                    </div>
                  ) : (
                    filteredItems.map((p) => {
                      const active = p.id === selectedId && mode === "edit";
                      return (
                        <button
                          key={p.id}
                          onClick={() => startEdit(p.id)}
                          className={[
                            "border px-3 py-2 text-left transition",
                            active
                              ? "border-leaf-200 bg-leaf-50"
                              : "border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-display text-base leading-snug tracking-tight text-slate-900">{p.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{p.sku}</div>
                            </div>
                            <div className="inline-flex border border-slate-200/70 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                              {p.category}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-7 lg:col-span-8">
              <div className="border border-slate-200/70 bg-white p-3 shadow-card">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="font-display text-xl leading-tight tracking-tight">
                      {mode === "create" ? "Buat Produk" : detail?.name || "Edit Produk"}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {mode === "create"
                        ? "Isi detail produk, lalu simpan."
                        : detail
                          ? `${detail.sku} · ${detail.category}`
                          : "Memuat detail…"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mode === "edit" ? (
                      <Button variant="danger" size="sm" onClick={remove} disabled={!selectedId || deleting || saving}>
                        {deleting ? "Deleting…" : "Delete"}
                      </Button>
                    ) : null}
                    <Button size="sm" onClick={save} disabled={saving || loadingDetail}>
                      {saving ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>

                {mode === "edit" && loadingDetail ? (
                  <div className="mt-4 border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
                    Loading…
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-3 md:grid-cols-12">
                      <div className="md:col-span-4">
                        <div className="text-xs text-slate-600">SKU</div>
                        <Input value={draft.sku} onChange={(e) => setDraft((p) => ({ ...p, sku: e.target.value }))} className="mt-2 py-2" />
                      </div>
                      <div className="md:col-span-8">
                        <div className="text-xs text-slate-600">Nama produk</div>
                        <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} className="mt-2 py-2" />
                      </div>
                      <div className="md:col-span-6">
                        <div className="text-xs text-slate-600">Kategori</div>
                        <Input
                          value={draft.category}
                          onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
                          className="mt-2 py-2"
                        />
                      </div>
                      <div className="md:col-span-6">
                        <div className="text-xs text-slate-600">Harga (IDR)</div>
                        <Input
                          type="number"
                          min={0}
                          value={draft.price_amount}
                          onChange={(e) => setDraft((p) => ({ ...p, price_amount: e.target.value }))}
                          className="mt-2 py-2"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-600">Deskripsi dasar</div>
                      <TextArea
                        value={draft.base_description}
                        onChange={(e) => setDraft((p) => ({ ...p, base_description: e.target.value }))}
                        className="mt-2 min-h-[160px]"
                        placeholder="Tulis deskripsi produk yang akan dipakai sebagai bahan generate campaign…"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
