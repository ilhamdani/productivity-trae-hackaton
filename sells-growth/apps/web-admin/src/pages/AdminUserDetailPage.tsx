import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import type {
  AdminUserDetailResponse,
  AdminUserSubscriptionUpdateRequest,
  PricingPlanListResponse,
  PricingPlanBrief,
} from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import { useToast } from "../components/Toast";

export default function AdminUserDetailPage() {
  const toast = useToast();
  const { userId } = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminUserDetailResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<PricingPlanBrief[]>([]);
  const [pricingPlanId, setPricingPlanId] = useState("");
  const [status, setStatus] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  function isoToLocalInputValue(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  async function load() {
    if (!userId) return;
    setLoading(true);
    try {
      const [userRes, planRes] = await Promise.all([
        apiFetch<AdminUserDetailResponse>(`/api/v1/admin/users/${userId}`),
        apiFetch<PricingPlanListResponse>(`/api/v1/admin/pricing-plans`),
      ]);
      setPlans(planRes.items);
      setData(userRes);
      setPricingPlanId(userRes.subscription?.pricing_plan_id || userRes.subscription?.pricing_plan?.id || "");
      setStatus(userRes.subscription?.status || "");
      setPeriodEnd(isoToLocalInputValue(userRes.subscription?.current_period_end));
    } catch (e: any) {
      toast.push({ title: "Gagal load user", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  async function saveSubscription() {
    if (!userId) return;
    if (saving) return;
    setSaving(true);
    try {
      const payload: AdminUserSubscriptionUpdateRequest = {};
      const currentPlanId = data?.subscription?.pricing_plan_id || data?.subscription?.pricing_plan?.id || "";
      if (pricingPlanId && pricingPlanId !== currentPlanId) payload.pricing_plan_id = pricingPlanId;

      const currentStatus = data?.subscription?.status || "";
      if (status.trim() && status.trim() !== currentStatus) payload.status = status.trim();

      const currentPeriodEndLocal = isoToLocalInputValue(data?.subscription?.current_period_end);
      if (periodEnd !== currentPeriodEndLocal) {
        payload.current_period_end = periodEnd ? new Date(periodEnd).toISOString() : null;
      }

      const res = await apiFetch<AdminUserDetailResponse>(`/api/v1/admin/users/${userId}/subscription`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setData(res);
      setPricingPlanId(res.subscription?.pricing_plan_id || res.subscription?.pricing_plan?.id || "");
      setStatus(res.subscription?.status || "");
      setPeriodEnd(isoToLocalInputValue(res.subscription?.current_period_end));
      toast.push({ title: "Subscription tersimpan", tone: "success" });
    } catch (e: any) {
      toast.push({ title: "Gagal simpan subscription", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, [userId]);

  return (
    <div className="grid gap-4">
      <Card
        title="User Detail"
        subtitle={data?.user.username ? `@${data.user.username}` : "Detail user"}
        right={
          <div className="flex gap-2">
            <Link to="/admin/users" className="inline-flex items-center justify-center px-3 py-1.5 text-sm text-slate-700 underline">
              Back
            </Link>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              Refresh
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Loading…</div>
        ) : !data ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">User tidak ditemukan.</div>
        ) : (
          <div className="grid gap-3">
            <div className="border border-slate-200/70 bg-white p-4">
              <div className="text-xs text-slate-500">User</div>
              <div className="mt-2 grid gap-1 text-sm text-slate-800">
                <div>
                  <span className="text-slate-500">ID:</span> {data.user.id}
                </div>
                <div>
                  <span className="text-slate-500">Username:</span> {data.user.username || "-"}
                </div>
                <div>
                  <span className="text-slate-500">Role:</span> {data.user.role}
                </div>
                <div>
                  <span className="text-slate-500">Created:</span> {new Date(data.user.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="border border-slate-200/70 bg-white p-4">
              <div className="text-xs text-slate-500">Subscription</div>
              <div className="mt-2 grid gap-3">
                {!data.subscription ? (
                  <div className="text-sm text-slate-700">Belum ada subscription. Klik Save untuk membuat.</div>
                ) : (
                  <div className="grid gap-1 text-sm text-slate-800">
                    <div>
                      <span className="text-slate-500">Plan:</span>{" "}
                      {data.subscription.pricing_plan?.name || data.subscription.pricing_plan?.key || data.subscription.plan_key}
                    </div>
                    <div>
                      <span className="text-slate-500">Status:</span> {data.subscription.status}
                    </div>
                    <div>
                      <span className="text-slate-500">Started:</span> {new Date(data.subscription.started_at).toLocaleString()}
                    </div>
                    <div>
                      <span className="text-slate-500">Period end:</span>{" "}
                      {data.subscription.current_period_end ? new Date(data.subscription.current_period_end).toLocaleString() : "-"}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-3">
                  <div className="text-xs font-medium text-slate-700">Edit subscription</div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <div>
                      <div className="mb-1 text-xs text-slate-600">Pricing plan</div>
                      <select
                        value={pricingPlanId}
                        onChange={(e) => setPricingPlanId(e.target.value)}
                        className="w-full border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-leaf-300 focus:outline-none focus:ring-2 focus:ring-leaf-200/70"
                      >
                        <option value="">Pilih plan…</option>
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.key} — {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-slate-600">Status</div>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-leaf-300 focus:outline-none focus:ring-2 focus:ring-leaf-200/70"
                      >
                        <option value="">Pilih status…</option>
                        <option value="active">active</option>
                        <option value="paused">paused</option>
                        <option value="canceled">canceled</option>
                      </select>
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-slate-600">Period end</div>
                      <input
                        type="datetime-local"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        className="w-full rounded-none border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-leaf-300 focus:outline-none focus:ring-2 focus:ring-leaf-200/70"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button onClick={saveSubscription} disabled={saving}>
                      {saving ? "Saving…" : "Save Subscription"}
                    </Button>
                    <div className="text-xs text-slate-500">Update akan berlaku segera.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
