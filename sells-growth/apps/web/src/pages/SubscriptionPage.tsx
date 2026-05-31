import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { MeResponse } from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import { useToast } from "../components/Toast";

const DURATIONS = [
  { months: 1, label: "1 bulan" },
  { months: 3, label: "3 bulan" },
  { months: 12, label: "12 bulan" },
];

export default function SubscriptionPage() {
  const toast = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [months, setMonths] = useState(() => {
    const raw = Number(params.get("months") || "");
    if (raw === 1 || raw === 3 || raw === 12) return raw;
    return 1;
  });

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<MeResponse>("/api/v1/me");
      setMe(res);
    } catch (e: any) {
      toast.push({ title: "Gagal load subscription", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const planName =
    me?.subscription?.pricing_plan?.name || (me?.subscription?.plan_key ? `Plan: ${me.subscription.plan_key}` : "—");
  const planPrice = useMemo(() => {
    const p = me?.subscription?.pricing_plan;
    if (!p) return null;
    const amount = Number(p.price_amount);
    if (!Number.isFinite(amount)) return null;
    return `${p.currency} ${amount.toLocaleString()} / ${p.interval}`;
  }, [me?.subscription?.pricing_plan]);

  const currentPeriodEnd = useMemo(() => {
    const v = me?.subscription?.current_period_end;
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  }, [me?.subscription?.current_period_end]);

  const limitCampaign = me?.subscription?.pricing_plan?.campaign_monthly_limit ?? null;
  const limitSeats = me?.subscription?.pricing_plan?.user_seats_limit ?? null;

  const estTotal = useMemo(() => {
    const p = me?.subscription?.pricing_plan;
    if (!p) return null;
    const amount = Number(p.price_amount);
    if (!Number.isFinite(amount)) return null;
    return `${p.currency} ${(amount * months).toLocaleString()}`;
  }, [me?.subscription?.pricing_plan, months]);

  return (
    <div className="grid gap-4">
      <Card
        title="Perpanjangan Subscription"
        subtitle="Perpanjang masa aktif subscription untuk melanjutkan akses fitur dan kuota."
        right={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Link
              to="/settings"
              className="inline-flex items-center justify-center gap-2 rounded-none border border-slate-200/80 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-leaf-300/45"
            >
              Settings
            </Link>
          </div>
        }
      >
        {loading ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Loading…</div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-none border border-slate-200/70 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">Plan</div>
                  <div className="mt-1 font-display text-xl tracking-tight text-slate-900">{planName}</div>
                  <div className="mt-1 text-sm text-slate-600">{planPrice || "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Status</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{me?.subscription?.status || "—"}</div>
                  <div className="mt-2 text-xs text-slate-500">Current period end</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{currentPeriodEnd}</div>
                </div>
              </div>
              <div className="grid gap-2 pt-2 sm:grid-cols-3">
                <div className="rounded-none border border-slate-200/70 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Campaign / month</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{limitCampaign === null ? "—" : limitCampaign}</div>
                </div>
                <div className="rounded-none border border-slate-200/70 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">User seats</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{limitSeats === null ? "—" : limitSeats}</div>
                </div>
                <div className="rounded-none border border-slate-200/70 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Billing</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{estTotal || "—"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-none border border-slate-200/70 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Pilih durasi</div>
                  <div className="mt-1 text-xs text-slate-500">UI saja dulu. Payment akan dipilih di langkah berikutnya.</div>
                </div>
                <div className="text-xs text-slate-500">Estimasi total: {estTotal || "—"}</div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {DURATIONS.map((d) => (
                  <button
                    key={d.months}
                    type="button"
                    onClick={() => setMonths(d.months)}
                    className={[
                      "rounded-none border px-3 py-3 text-left transition",
                      months === d.months
                        ? "border-leaf-200 bg-leaf-50 text-leaf-800"
                        : "border-slate-200/70 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="text-sm font-semibold">{d.label}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {planPrice ? `Tagihan mengikuti harga plan (${planPrice})` : "Tagihan dihitung saat payment"}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Dengan melanjutkan, kamu akan diarahkan ke halaman payment untuk memilih metode pembayaran.
                </div>
                <Button
                  onClick={() => {
                    nav(`/payment?months=${months}`);
                  }}
                  disabled={!me?.subscription}
                >
                  Lanjut ke Payment
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

