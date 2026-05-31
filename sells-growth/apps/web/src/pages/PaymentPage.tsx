import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { MeResponse } from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import { useToast } from "../components/Toast";

type MethodKey = "qris" | "va" | "ewallet" | "card" | "bank_transfer";

const METHODS: Array<{
  key: MethodKey;
  title: string;
  subtitle: string;
  badge: string;
}> = [
  { key: "qris", title: "QRIS", subtitle: "Scan lewat e-wallet / m-banking", badge: "Instan" },
  { key: "va", title: "Virtual Account", subtitle: "BCA / BRI / Mandiri / BNI", badge: "Otomatis" },
  { key: "ewallet", title: "E-Wallet", subtitle: "GoPay / OVO / DANA", badge: "Cepat" },
  { key: "card", title: "Kartu", subtitle: "Debit/Kredit (3DS)", badge: "Global" },
  { key: "bank_transfer", title: "Transfer Bank", subtitle: "Konfirmasi manual", badge: "Manual" },
];

function formatMoney(amount: number, currency: string) {
  if (!Number.isFinite(amount)) return "—";
  return `${currency} ${amount.toLocaleString()}`;
}

export default function PaymentPage() {
  const toast = useToast();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [method, setMethod] = useState<MethodKey>("qris");
  const months = useMemo(() => {
    const raw = Number(params.get("months") || "");
    if (raw === 1 || raw === 3 || raw === 12) return raw;
    return 1;
  }, [params]);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<MeResponse>("/api/v1/me");
      setMe(res);
    } catch (e: any) {
      toast.push({ title: "Gagal load payment", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const plan = me?.subscription?.pricing_plan;
  const planName = plan?.name || (me?.subscription?.plan_key ? `Plan: ${me.subscription.plan_key}` : "—");
  const baseAmount = Number(plan?.price_amount || 0);
  const total = Number.isFinite(baseAmount) ? baseAmount * months : 0;
  const currency = plan?.currency || "IDR";

  return (
    <div className="grid gap-4">
      <Card
        title="Payment"
        subtitle="Pilih metode pembayaran untuk perpanjangan subscription. (UI dulu, belum memproses pembayaran)"
        right={
          <div className="flex gap-2">
            <Link
              to={`/subscription?months=${months}`}
              className="inline-flex items-center justify-center gap-2 rounded-none border border-slate-200/80 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-leaf-300/45"
            >
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
        ) : (
          <div className="grid gap-4 lg:grid-cols-[360px,1fr]">
            <div className="grid gap-3 rounded-none border border-slate-200/70 bg-white p-4">
              <div>
                <div className="text-xs text-slate-500">Ringkasan</div>
                <div className="mt-1 font-display text-xl tracking-tight text-slate-900">{planName}</div>
              </div>
              <div className="grid gap-2 rounded-none border border-slate-200/70 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="text-slate-600">Durasi</div>
                  <div className="font-medium text-slate-900">{months} bulan</div>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="text-slate-600">Harga / bulan</div>
                  <div className="font-medium text-slate-900">{plan ? formatMoney(baseAmount, currency) : "—"}</div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-200/70 pt-2 text-sm">
                  <div className="text-slate-600">Total</div>
                  <div className="font-semibold text-slate-900">{plan ? formatMoney(total, currency) : "—"}</div>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Metode pembayaran yang dipilih hanya untuk tampilan. Integrasi pembayaran akan ditambahkan setelah UI disetujui.
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-none border border-slate-200/70 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Metode pembayaran</div>
                    <div className="mt-1 text-xs text-slate-500">Pilih salah satu metode di bawah.</div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {METHODS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMethod(m.key)}
                      className={[
                        "group rounded-none border px-3 py-3 text-left transition",
                        method === m.key
                          ? "border-leaf-200 bg-leaf-50 text-leaf-800"
                          : "border-slate-200/70 bg-white text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{m.title}</div>
                          <div className="mt-1 text-xs text-slate-500">{m.subtitle}</div>
                        </div>
                        <div
                          className={[
                            "inline-flex border px-2 py-0.5 text-[11px] font-medium",
                            method === m.key ? "border-leaf-200 bg-white text-leaf-800" : "border-slate-200 bg-slate-50 text-slate-600",
                          ].join(" ")}
                        >
                          {m.badge}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-none border border-slate-200/70 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Detail pembayaran</div>
                    <div className="mt-1 text-xs text-slate-500">Instruksi berbeda untuk tiap metode.</div>
                  </div>
                  <div className="text-xs text-slate-500">Selected: {METHODS.find((x) => x.key === method)?.title}</div>
                </div>

                {method === "qris" ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-[220px,1fr]">
                    <div className="grid place-items-center rounded-none border border-slate-200/70 bg-slate-50 p-4">
                      <div className="grid h-[160px] w-[160px] place-items-center bg-white shadow-sm">
                        <div className="grid h-[132px] w-[132px] grid-cols-12 grid-rows-12 gap-[2px] bg-slate-900 p-[6px]">
                          {Array.from({ length: 144 }).map((_, i) => (
                            <div
                              key={i}
                              className={[
                                "h-full w-full",
                                (i * 7 + 11) % 13 === 0 || (i * 5 + 3) % 17 === 0 ? "bg-white" : "bg-slate-900",
                              ].join(" ")}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-slate-500">QR placeholder</div>
                    </div>
                    <div className="grid gap-2">
                      <div className="text-sm font-medium text-slate-900">Cara bayar via QRIS</div>
                      <ol className="list-decimal pl-5 text-sm text-slate-700">
                        <li>Buka aplikasi e-wallet / m-banking</li>
                        <li>Pilih Scan QR</li>
                        <li>Scan QR di samping</li>
                        <li>Konfirmasi nominal dan selesaikan pembayaran</li>
                      </ol>
                      <div className="text-xs text-slate-500">UI only: QR asli akan dibuat dari provider payment.</div>
                    </div>
                  </div>
                ) : method === "va" ? (
                  <div className="mt-4 grid gap-3 rounded-none border border-slate-200/70 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">Virtual Account</div>
                        <div className="mt-1 text-xs text-slate-500">Nomor VA placeholder</div>
                      </div>
                      <div className="font-mono text-sm font-semibold text-slate-900">8808 1234 5678 9012</div>
                    </div>
                    <div className="text-sm text-slate-700">Selesaikan pembayaran melalui ATM / m-banking sesuai bank pilihanmu.</div>
                  </div>
                ) : method === "ewallet" ? (
                  <div className="mt-4 grid gap-3 rounded-none border border-slate-200/70 bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-900">E-Wallet</div>
                    <div className="text-sm text-slate-700">
                      Setelah klik tombol bayar, kamu akan diarahkan ke aplikasi e-wallet untuk konfirmasi.
                    </div>
                    <div className="text-xs text-slate-500">UI only: redirect deep-link akan ditambahkan.</div>
                  </div>
                ) : method === "card" ? (
                  <div className="mt-4 grid gap-3 rounded-none border border-slate-200/70 bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-900">Kartu Debit/Kredit</div>
                    <div className="text-sm text-slate-700">Masukkan detail kartu saat integrasi payment sudah aktif (3DS).</div>
                    <div className="text-xs text-slate-500">UI only: form kartu akan dibuat setelah provider dipilih.</div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 rounded-none border border-slate-200/70 bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-900">Transfer Bank</div>
                    <div className="text-sm text-slate-700">Lakukan transfer, lalu kirim bukti pembayaran.</div>
                    <div className="text-xs text-slate-500">UI only: upload bukti & verifikasi manual akan ditambahkan.</div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="text-xs text-slate-500">
                    Klik tombol di bawah ini hanya menampilkan notifikasi (belum membuat invoice/charge).
                  </div>
                  <Button
                    onClick={() => {
                      toast.push({ title: "UI only", detail: "Payment provider belum diintegrasikan.", tone: "neutral" });
                    }}
                    disabled={!me?.subscription}
                  >
                    Bayar Sekarang
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
