import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { Money } from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import TextArea from "../components/TextArea";
import { useToast } from "../components/Toast";

type ProductListItem = { id: string; sku: string; name: string; category: string };

type PresignItem = { asset_id: string; upload_url: string; storage_path: string };

function money(amount: string): Money {
  const n = Number(amount);
  return { currency: "IDR", amount: Number.isFinite(n) ? n : 0 };
}

export default function NewCampaignPage() {
  const toast = useToast();
  const nav = useNavigate();

  const [useCatalog, setUseCatalog] = useState(false);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productId, setProductId] = useState<string>("");

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [brandTone, setBrandTone] = useState("");
  const [targetLocation, setTargetLocation] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState<"conversion" | "awareness" | "retention">("conversion");

  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [images, setImages] = useState<Array<{ file: File; preview: string; status: "local" | "uploading" | "ready" | "failed"; assetId?: string }>>([]);

  const readyCount = images.filter((i) => i.status === "ready").length;

  const canCreateDraft = useMemo(() => {
    if (useCatalog && !productId) return false;
    if (!name.trim()) return false;
    if (!category.trim()) return false;
    if (!description.trim()) return false;
    if (!price.trim()) return false;
    return true;
  }, [useCatalog, productId, name, category, description, price]);

  const canGenerate = useMemo(() => {
    return !!campaignId && readyCount >= 1;
  }, [campaignId, readyCount]);

  useEffect(() => {
    if (!useCatalog) return;
    (async () => {
      try {
        const res = await apiFetch<{ items: ProductListItem[] }>("/api/v1/products");
        setProducts(res.items);
      } catch (e: any) {
        toast.push({ title: "Gagal load product catalog", detail: e?.message || "Unknown error", tone: "danger" });
        setUseCatalog(false);
      }
    })();
  }, [useCatalog]);

  useEffect(() => {
    if (!useCatalog) return;
    const selected = products.find((p) => p.id === productId);
    if (!selected) return;
    if (!name.trim()) setName(selected.name);
    if (!category.trim()) setCategory(selected.category);
  }, [useCatalog, productId, products]);

  async function createDraft() {
    try {
      const res = await apiFetch<{ id: string; status: string }>("/api/v1/campaigns", {
        method: "POST",
        body: JSON.stringify({
          product_id: useCatalog ? productId : null,
          product_name: name,
          product_description: description,
          price: money(price),
          category,
          brand_tone: brandTone || null,
          target_location: targetLocation || null,
          primary_goal: primaryGoal,
        }),
      });
      setCampaignId(res.id);
      toast.push({ title: "Draft created", detail: "Sekarang upload minimal 1 foto produk.", tone: "success" });
    } catch (e: any) {
      toast.push({ title: "Gagal create draft", detail: e?.message || "Unknown error", tone: "danger" });
    }
  }

  async function uploadSelected(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files).slice(0, 5 - images.length);
    if (selected.length === 0) return;

    const next = selected.map((file) => ({ file, preview: URL.createObjectURL(file), status: "local" as const }));
    setImages((prev) => [...prev, ...next]);
  }

  async function doUpload() {
    if (!campaignId) {
      toast.push({ title: "Buat draft dulu", detail: "Create draft sebelum upload.", tone: "danger" });
      return;
    }
    const pending = images.filter((i) => i.status === "local" || i.status === "failed");
    if (pending.length === 0) return;

    setImages((prev) => prev.map((i) => (pending.includes(i) ? { ...i, status: "uploading" } : i)));

    try {
      const form = new FormData();
      for (const p of pending) {
        form.append("files", p.file, p.file.name);
      }

      const res = await apiFetch<{ items: Array<{ id: string; asset_type: string; public_url?: string | null }> }>(
        '/api/v1/campaigns/' + campaignId + '/assets/product-images/upload',
        {
          method: "POST",
          body: form,
        },
      );

      setImages((prev) => {
        const updated = [...prev];
        let cursor = 0;
        for (let i = 0; i < updated.length; i++) {
          if (updated[i].status === "uploading") {
            updated[i] = { ...updated[i], status: "ready", assetId: res.items[cursor]?.id };
            cursor++;
          }
        }
        return updated;
      });

      toast.push({ title: "Upload selesai", detail: "Foto produk siap dipakai untuk generate.", tone: "success" });
    } catch (e) {
      setImages((prev) => prev.map((i) => (i.status === "uploading" ? { ...i, status: "failed" } : i)));
      const msg = (e && (e.message || e?.message)) ? (e.message || e?.message) : "Unknown error";
      toast.push({ title: "Upload gagal", detail: msg, tone: "danger" });
    }
  }

  async function generate() {
    if (!campaignId) return;
    try {
      await apiFetch(`/api/v1/campaigns/${campaignId}/generate`, { method: "POST" });
      toast.push({ title: "Generation started", detail: "Workflow mulai berjalan.", tone: "success" });
      nav(`/campaigns/${campaignId}`);
    } catch (e: any) {
      toast.push({ title: "Gagal start generate", detail: e?.message || "Unknown error", tone: "danger" });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <Card title="New Campaign" subtitle="Isi info produk, buat draft, upload foto, lalu generate.">
          <div className="grid gap-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white/85">Sumber data produk</div>
                  <div className="mt-1 text-xs text-white/50">Pilih dari catalog (opsional) atau isi manual.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setUseCatalog((v) => !v)}
                  className={[
                    "relative h-10 w-16 rounded-full border border-white/12 bg-white/5 transition",
                    useCatalog ? "shadow-glow" : "",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute top-1 h-8 w-8 rounded-full bg-gradient-to-b from-white/30 to-white/10 transition",
                      useCatalog ? "left-7" : "left-1",
                    ].join(" ")}
                  />
                </button>
              </div>
              {useCatalog ? (
                <div className="mt-4">
                  <div className="mb-2 text-sm text-white/70">Product</div>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-caramel-300/25"
                  >
                    <option value="">Pilih produk…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4">
              <div>
                <div className="mb-2 text-sm text-white/70">Name</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Iced Caramel Latte" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm text-white/70">Category</div>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Coffee" />
                </div>
                <div>
                  <div className="mb-2 text-sm text-white/70">Price (IDR)</div>
                  <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25000" inputMode="numeric" />
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm text-white/70">Description</div>
                <TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Kopi premium dengan sirup caramel dan susu segar." />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-medium text-white/85">Campaign options (optional)</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm text-white/70">Goal</div>
                  <select
                    value={primaryGoal}
                    onChange={(e) => setPrimaryGoal(e.target.value as any)}
                    className="w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-caramel-300/25"
                  >
                    <option value="conversion">conversion</option>
                    <option value="awareness">awareness</option>
                    <option value="retention">retention</option>
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-sm text-white/70">Target location</div>
                  <Input value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} placeholder="Jakarta" />
                </div>
                <div className="md:col-span-2">
                  <div className="mb-2 text-sm text-white/70">Brand tone</div>
                  <Input value={brandTone} onChange={(e) => setBrandTone(e.target.value)} placeholder="hangat, premium, friendly" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={createDraft} disabled={!canCreateDraft || !!campaignId}>
                {campaignId ? "Draft Created" : "Save Draft"}
              </Button>
              <Button variant="ghost" onClick={() => nav("/campaigns")}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card
          title="Product images"
          subtitle="Upload 1–5 foto. Minimal 1 foto required untuk generate."
          right={
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
              Ready: <span className="font-medium text-white">{readyCount}</span>/5
            </div>
          }
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={!campaignId || images.length >= 5}
                onChange={(e) => uploadSelected(e.target.files)}
                className="block w-full text-sm text-white/70 file:mr-4 file:rounded-2xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-white/15"
              />
              <div className="mt-2 text-xs text-white/45">{campaignId ? "Pilih file, lalu klik Upload." : "Buat draft dulu untuk upload."}</div>
            </div>

            {images.length ? (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img) => (
                  <div key={img.preview} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <img src={img.preview} className="h-24 w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-[10px] text-white/80">
                      {img.status === "ready"
                        ? "READY"
                        : img.status === "uploading"
                          ? "UPLOADING…"
                          : img.status === "failed"
                            ? "FAILED"
                            : "LOCAL"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/55">
                Belum ada gambar.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={doUpload} disabled={!campaignId || images.length === 0}>
                Upload
              </Button>
              <Button onClick={generate} disabled={!canGenerate}>
                Generate Campaign
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

