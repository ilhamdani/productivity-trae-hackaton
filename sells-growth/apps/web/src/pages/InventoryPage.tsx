import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { useToast } from "../components/Toast";

type ProductListItem = { id: string; sku: string; name: string; category: string };
type InventoryItem = { location_code: string; qty_on_hand: number; qty_reserved: number; updated_at: string };

function toNonNegativeInt(v: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export default function InventoryPage() {
  const toast = useToast();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productQuery, setProductQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [savingByLocation, setSavingByLocation] = useState<Record<string, boolean>>({});
  const [deletingByLocation, setDeletingByLocation] = useState<Record<string, boolean>>({});

  const [newLocation, setNewLocation] = useState("");
  const [newOnHand, setNewOnHand] = useState("0");
  const [newReserved, setNewReserved] = useState("0");

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => [p.name, p.sku, p.category].some((x) => x.toLowerCase().includes(q)));
  }, [products, productQuery]);

  async function loadProducts() {
    setLoadingProducts(true);
    try {
      const res = await apiFetch<{ items: ProductListItem[] }>("/api/v1/products");
      setProducts(res.items);
      setSelectedProductId((prev) => prev || res.items[0]?.id || null);
    } catch (e: any) {
      toast.push({ title: "Gagal load produk", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadInventory(productId: string) {
    setLoadingInventory(true);
    try {
      const res = await apiFetch<{ items: InventoryItem[] }>(`/api/v1/products/${productId}/inventory`);
      setInventory(res.items);
    } catch (e: any) {
      toast.push({ title: "Gagal load inventory", detail: e?.message || "Unknown error", tone: "danger" });
      setInventory([]);
    } finally {
      setLoadingInventory(false);
    }
  }

  async function saveLocation(productId: string, item: Pick<InventoryItem, "location_code" | "qty_on_hand" | "qty_reserved">) {
    setSavingByLocation((prev) => ({ ...prev, [item.location_code]: true }));
    try {
      await apiFetch(`/api/v1/products/${productId}/inventory/${encodeURIComponent(item.location_code)}`, {
        method: "PUT",
        body: JSON.stringify({ qty_on_hand: item.qty_on_hand, qty_reserved: item.qty_reserved }),
      });
      toast.push({ title: "Stok tersimpan", tone: "success" });
      await loadInventory(productId);
    } catch (e: any) {
      toast.push({ title: "Gagal simpan stok", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setSavingByLocation((prev) => ({ ...prev, [item.location_code]: false }));
    }
  }

  async function deleteLocation(productId: string, locationCode: string) {
    const ok = window.confirm(`Hapus lokasi ${locationCode}?`);
    if (!ok) return;

    setDeletingByLocation((prev) => ({ ...prev, [locationCode]: true }));
    try {
      await apiFetch(`/api/v1/products/${productId}/inventory/${encodeURIComponent(locationCode)}`, { method: "DELETE" });
      toast.push({ title: "Lokasi terhapus", tone: "success" });
      await loadInventory(productId);
    } catch (e: any) {
      toast.push({ title: "Gagal hapus lokasi", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setDeletingByLocation((prev) => ({ ...prev, [locationCode]: false }));
    }
  }

  async function addLocation() {
    if (!selectedProductId) return;
    const location = newLocation.trim();
    if (!location) {
      toast.push({ title: "Kode lokasi wajib diisi", tone: "danger" });
      return;
    }
    await saveLocation(selectedProductId, {
      location_code: location,
      qty_on_hand: toNonNegativeInt(newOnHand),
      qty_reserved: toNonNegativeInt(newReserved),
    });
    setNewLocation("");
    setNewOnHand("0");
    setNewReserved("0");
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!selectedProductId) return;
    loadInventory(selectedProductId);
  }, [selectedProductId]);

  return (
    <div className="grid gap-4">
      <Card
        title="Inventory"
        subtitle="Pantau dan atur stok per lokasi untuk setiap produk."
        right={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={loadProducts} disabled={loadingProducts}>
              Refresh Produk
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (selectedProductId ? loadInventory(selectedProductId) : null)}
              disabled={!selectedProductId || loadingInventory}
            >
              Refresh Stok
            </Button>
          </div>
        }
      >
        {loadingProducts ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
            Loading…
          </div>
        ) : products.length === 0 ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center">
            <div className="font-display text-xl">Belum ada produk</div>
            <div className="mt-2 text-sm text-slate-600">Buat produk dulu di Master Product, lalu kembali ke sini.</div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-5 lg:col-span-4">
              <div className="border border-slate-200/70 bg-white p-3 shadow-card">
                <Input
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Cari produk (nama / SKU / kategori)…"
                  className="py-2"
                />
                <div className="mt-3 grid max-h-[520px] gap-2 overflow-auto pr-1">
                  {filteredProducts.map((p) => {
                    const active = p.id === selectedProductId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProductId(p.id)}
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
                  })}
                </div>
              </div>
            </div>

            <div className="md:col-span-7 lg:col-span-8">
              <div className="border border-slate-200/70 bg-white p-3 shadow-card">
                {selectedProduct ? (
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="font-display text-xl leading-tight tracking-tight text-slate-900">{selectedProduct.name}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        <span className="text-slate-700">{selectedProduct.sku}</span> ·{" "}
                        <span className="text-slate-500">{selectedProduct.category}</span>
                      </div>
                    </div>
                    <div className="border border-slate-200/70 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      Stok: per lokasi
                    </div>
                  </div>
                ) : (
                  <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
                    Pilih produk untuk lihat stok.
                  </div>
                )}

                {selectedProduct ? (
                  <div className="mt-4 grid gap-3">
                    {loadingInventory ? (
                      <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
                        Loading…
                      </div>
                    ) : inventory.length === 0 ? (
                      <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center">
                        <div className="font-display text-xl">Belum ada stok</div>
                        <div className="mt-2 text-sm text-slate-600">Tambahkan lokasi gudang/toko untuk mulai tracking.</div>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {inventory.map((it) => {
                          const available = Math.max(0, it.qty_on_hand - it.qty_reserved);
                          const saving = !!savingByLocation[it.location_code];
                          const deleting = !!deletingByLocation[it.location_code];
                          return (
                            <div
                              key={it.location_code}
                              className="border border-slate-200/70 bg-slate-50 px-3 py-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="font-medium text-slate-900">{it.location_code}</div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    Update: {new Date(it.updated_at).toLocaleString()}
                                  </div>
                                </div>
                                <div className="inline-flex border border-leaf-200 bg-leaf-50 px-3 py-1 text-xs font-medium text-leaf-800">
                                  Available: {available}
                                </div>
                              </div>

                              <div className="mt-3 grid gap-3 md:grid-cols-12 md:items-end">
                                <div className="md:col-span-4">
                                  <div className="text-xs text-slate-600">On hand</div>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={String(it.qty_on_hand)}
                                    onChange={(e) =>
                                      setInventory((prev) =>
                                        prev.map((x) =>
                                          x.location_code === it.location_code
                                            ? { ...x, qty_on_hand: toNonNegativeInt(e.target.value) }
                                            : x,
                                        ),
                                      )
                                    }
                                    className="mt-2 py-2"
                                  />
                                </div>
                                <div className="md:col-span-4">
                                  <div className="text-xs text-slate-600">Reserved</div>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={String(it.qty_reserved)}
                                    onChange={(e) =>
                                      setInventory((prev) =>
                                        prev.map((x) =>
                                          x.location_code === it.location_code
                                            ? { ...x, qty_reserved: toNonNegativeInt(e.target.value) }
                                            : x,
                                        ),
                                      )
                                    }
                                    className="mt-2 py-2"
                                  />
                                </div>
                                <div className="md:col-span-4">
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        selectedProductId
                                          ? saveLocation(selectedProductId, {
                                              location_code: it.location_code,
                                              qty_on_hand: it.qty_on_hand,
                                              qty_reserved: it.qty_reserved,
                                            })
                                          : null
                                      }
                                      disabled={!selectedProductId || saving || deleting}
                                      className="w-full"
                                    >
                                      {saving ? "Saving…" : "Save"}
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => (selectedProductId ? deleteLocation(selectedProductId, it.location_code) : null)}
                                      disabled={!selectedProductId || saving || deleting}
                                      className="w-full"
                                    >
                                      {deleting ? "…" : "Delete"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="border border-slate-200/70 bg-white p-3 shadow-card">
                      <div className="font-display text-lg tracking-tight">Tambah lokasi</div>
                      <div className="mt-1 text-sm text-slate-600">Contoh: TOKO-01, GUDANG-A, SHOPEE-FBM.</div>
                      <div className="mt-4 grid gap-3 md:grid-cols-12 md:items-end">
                        <div className="md:col-span-4">
                          <div className="text-xs text-slate-600">Kode lokasi</div>
                          <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className="mt-2 py-2" />
                        </div>
                        <div className="md:col-span-3">
                          <div className="text-xs text-slate-600">On hand</div>
                          <Input
                            type="number"
                            min={0}
                            value={newOnHand}
                            onChange={(e) => setNewOnHand(e.target.value)}
                            className="mt-2 py-2"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <div className="text-xs text-slate-600">Reserved</div>
                          <Input
                            type="number"
                            min={0}
                            value={newReserved}
                            onChange={(e) => setNewReserved(e.target.value)}
                            className="mt-2 py-2"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Button size="sm" onClick={addLocation} className="w-full">
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
