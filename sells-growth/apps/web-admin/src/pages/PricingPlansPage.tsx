import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import type {
  PricingPlan,
  PricingPlanCreateRequest,
  PricingPlanCreateResponse,
  PricingPlanListResponse,
  PricingPlanUpdateRequest,
} from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { useToast } from "../components/Toast";

export default function PricingPlansPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<PricingPlan[]>([]);

  const [query, setQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [createKey, setCreateKey] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPrice, setCreatePrice] = useState("99000");
  const [createInterval, setCreateInterval] = useState("monthly");
  const [createActive, setCreateActive] = useState(true);
  const [createCampaignLimit, setCreateCampaignLimit] = useState("");
  const [createSeatsLimit, setCreateSeatsLimit] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(() => items.find((x) => x.id === editingId) || null, [items, editingId]);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editInterval, setEditInterval] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editCampaignLimit, setEditCampaignLimit] = useState("");
  const [editSeatsLimit, setEditSeatsLimit] = useState("");

  const displayedItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (onlyActive && !p.is_active) return false;
      if (!q) return true;
      return p.key.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
    });
  }, [items, query, onlyActive]);

  const total = displayedItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(total, page * pageSize);
  const paged = displayedItems.slice((page - 1) * pageSize, page * pageSize);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<PricingPlanListResponse>("/api/v1/admin/pricing-plans");
      setItems(res.items || []);
    } catch (e: any) {
      toast.push({ title: "Gagal load pricing plans", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  function startEdit(plan: PricingPlan) {
    setEditingId(plan.id);
    setEditName(plan.name);
    setEditPrice(String(plan.price_amount));
    setEditInterval(plan.interval);
    setEditActive(plan.is_active);
    setEditCampaignLimit(plan.campaign_monthly_limit === null || plan.campaign_monthly_limit === undefined ? "" : String(plan.campaign_monthly_limit));
    setEditSeatsLimit(plan.user_seats_limit === null || plan.user_seats_limit === undefined ? "" : String(plan.user_seats_limit));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditPrice("");
    setEditInterval("");
    setEditActive(true);
    setEditCampaignLimit("");
    setEditSeatsLimit("");
  }

  function parseLimit(v: string) {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.floor(n));
  }

  async function createPlan() {
    if (saving) return;
    const key = createKey.trim();
    const name = createName.trim();
    const priceAmount = Number(createPrice);
    if (!key || !name || !Number.isFinite(priceAmount)) {
      toast.push({ title: "Isi key, name, dan price", tone: "danger" });
      return;
    }

    setSaving(true);
    try {
      const payload: PricingPlanCreateRequest = {
        key,
        name,
        price_amount: priceAmount,
        currency: "IDR",
        interval: createInterval,
        is_active: createActive,
        campaign_monthly_limit: parseLimit(createCampaignLimit),
        user_seats_limit: parseLimit(createSeatsLimit),
      };
      const res = await apiFetch<PricingPlanCreateResponse>("/api/v1/admin/pricing-plans", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.push({ title: "Plan dibuat", detail: `id: ${res.id}`, tone: "success" });
      setCreateKey("");
      setCreateName("");
      setCreateCampaignLimit("");
      setCreateSeatsLimit("");
      await load();
    } catch (e: any) {
      toast.push({ title: "Gagal create plan", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing || saving) return;
    const name = editName.trim();
    const priceAmount = Number(editPrice);
    if (!name || !Number.isFinite(priceAmount)) {
      toast.push({ title: "Isi name dan price", tone: "danger" });
      return;
    }

    setSaving(true);
    try {
      const payload: PricingPlanUpdateRequest = {
        name,
        price_amount: priceAmount,
        currency: editing.currency || "IDR",
        interval: editInterval || "monthly",
        is_active: editActive,
        campaign_monthly_limit: parseLimit(editCampaignLimit),
        user_seats_limit: parseLimit(editSeatsLimit),
      };
      await apiFetch(`/api/v1/admin/pricing-plans/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      toast.push({ title: "Plan tersimpan", tone: "success" });
      cancelEdit();
      await load();
    } catch (e: any) {
      toast.push({ title: "Gagal update plan", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(plan: PricingPlan) {
    if (saving) return;
    const ok = window.confirm(`Hapus plan "${plan.key}"?`);
    if (!ok) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/admin/pricing-plans/${plan.id}`, { method: "DELETE" });
      toast.push({ title: "Plan dihapus", tone: "success" });
      if (editingId === plan.id) cancelEdit();
      await load();
    } catch (e: any) {
      toast.push({ title: "Gagal delete plan", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(plan: PricingPlan) {
    if (saving) return;
    setSaving(true);
    try {
      const payload: PricingPlanUpdateRequest = {
        name: plan.name,
        price_amount: plan.price_amount,
        currency: plan.currency,
        interval: plan.interval,
        is_active: !plan.is_active,
        campaign_monthly_limit: plan.campaign_monthly_limit ?? null,
        user_seats_limit: plan.user_seats_limit ?? null,
      };
      await apiFetch(`/api/v1/admin/pricing-plans/${plan.id}`, { method: "PUT", body: JSON.stringify(payload) });
      await load();
    } catch (e: any) {
      toast.push({ title: "Gagal update plan", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, onlyActive]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="grid gap-4">
      <Card title="Pricing Plans" subtitle="Kelola katalog plan yang bisa dipakai untuk subscription." right={<Button variant="ghost" size="sm" onClick={load} disabled={loading || saving}>Refresh</Button>}>
        <div className="grid gap-4">
          <div className="border border-slate-200/70 bg-white p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-slate-600">Search</div>
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari key atau name" />
              </div>
              <div className="flex items-end justify-between gap-3">
                <label className="inline-flex select-none items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
                  Only active
                </label>
                <div className="text-xs text-slate-500">{displayedItems.length} items</div>
              </div>
            </div>
          </div>

          <div className="border border-slate-200/70 bg-white p-4">
            <div className="text-xs font-medium text-slate-700">Create plan</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div>
                <div className="mb-1 text-xs text-slate-600">Key</div>
                <Input value={createKey} onChange={(e) => setCreateKey(e.target.value)} placeholder="pro" />
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-600">Name</div>
                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Pro" />
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-600">Price (IDR)</div>
                <Input value={createPrice} onChange={(e) => setCreatePrice(e.target.value)} placeholder="99000" />
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-600">Interval</div>
                <select
                  value={createInterval}
                  onChange={(e) => setCreateInterval(e.target.value)}
                  className="w-full border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-leaf-300 focus:outline-none focus:ring-2 focus:ring-leaf-200/70"
                >
                  <option value="monthly">monthly</option>
                  <option value="yearly">yearly</option>
                </select>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-600">Campaign / month</div>
                <Input value={createCampaignLimit} onChange={(e) => setCreateCampaignLimit(e.target.value)} placeholder="unlimited" />
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-600">User seats</div>
                <Input value={createSeatsLimit} onChange={(e) => setCreateSeatsLimit(e.target.value)} placeholder="unlimited" />
              </div>
            </div>
            <label className="mt-3 inline-flex select-none items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={createActive} onChange={(e) => setCreateActive(e.target.checked)} />
              Active
            </label>
            <div className="mt-3">
              <Button onClick={createPlan} disabled={saving}>
                {saving ? "Saving…" : "Create"}
              </Button>
            </div>
          </div>

          {editing ? (
            <div className="border border-slate-200/70 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">Editing</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{editing.key}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEdit} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div>
                  <div className="mb-1 text-xs text-slate-600">Name</div>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-slate-600">Price (IDR)</div>
                  <Input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-slate-600">Interval</div>
                  <select
                    value={editInterval}
                    onChange={(e) => setEditInterval(e.target.value)}
                    className="w-full border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-leaf-300 focus:outline-none focus:ring-2 focus:ring-leaf-200/70"
                  >
                    <option value="monthly">monthly</option>
                    <option value="yearly">yearly</option>
                  </select>
                </div>
                <div>
                  <div className="mb-1 text-xs text-slate-600">Campaign / month</div>
                  <Input value={editCampaignLimit} onChange={(e) => setEditCampaignLimit(e.target.value)} placeholder="unlimited" />
                </div>
                <div>
                  <div className="mb-1 text-xs text-slate-600">User seats</div>
                  <Input value={editSeatsLimit} onChange={(e) => setEditSeatsLimit(e.target.value)} placeholder="unlimited" />
                </div>
              </div>
              <label className="mt-3 inline-flex select-none items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                Active
              </label>
            </div>
          ) : null}

          {loading ? (
            <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Loading…</div>
          ) : items.length === 0 ? (
            <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
              Belum ada pricing plan.
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Tidak ada hasil.</div>
          ) : (
            <div className="border border-slate-200/70 bg-white">
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-xs text-slate-600">
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Key</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Name</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Price</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Interval</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Campaign/mo</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Seats</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Active</th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-2 align-top text-slate-900">{p.key}</td>
                        <td className="px-3 py-2 align-top text-slate-700">{p.name}</td>
                        <td className="px-3 py-2 align-top text-slate-700">
                          {p.currency} {Number(p.price_amount).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 align-top text-slate-700">{p.interval}</td>
                        <td className="px-3 py-2 align-top text-slate-700">{p.campaign_monthly_limit ?? "-"}</td>
                        <td className="px-3 py-2 align-top text-slate-700">{p.user_seats_limit ?? "-"}</td>
                        <td className="px-3 py-2 align-top text-slate-700">{p.is_active ? "yes" : "no"}</td>
                        <td className="px-3 py-2 align-top text-right">
                          <div className="inline-flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(p)} disabled={saving}>
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => toggleActive(p)} disabled={saving}>
                              {p.is_active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => deletePlan(p)} disabled={saving}>
                              Delete
                            </Button>
                          </div>
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
        </div>
      </Card>
    </div>
  );
}
