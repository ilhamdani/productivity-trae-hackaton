import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { getApiBaseUrl, getApiKey, setApiKey } from "../api/storage";
import Button from "../components/Button";
import Input from "../components/Input";
import { useToast } from "../components/Toast";

type AuthResponse = { user_id: string; username: string; api_key: string };

export default function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const next = params.get("next") || "/campaigns";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getApiKey()) nav("/campaigns", { replace: true });
  }, [nav]);

  async function submit() {
    if (busy) return;
    const u = username.trim();
    if (!u || !password) {
      toast.push({ title: "Username dan password wajib diisi", tone: "danger" });
      return;
    }
    if (mode === "register" && password !== password2) {
      toast.push({ title: "Konfirmasi password tidak sama", tone: "danger" });
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch<AuthResponse>(`/api/v1/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ username: u, password }),
      });
      setApiKey(res.api_key);
      toast.push({ title: mode === "login" ? "Login berhasil" : "Akun dibuat", detail: `User: ${res.username}`, tone: "success" });
      nav(next, { replace: true });
    } catch (e: any) {
      toast.push({ title: mode === "login" ? "Login gagal" : "Registrasi gagal", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-dvh max-w-6xl grid-cols-12 gap-4 p-4">
      <div className="col-span-12 overflow-hidden border border-slate-200/70 bg-white shadow-card lg:col-span-7">
        <div className="relative h-full p-4">
          <div className="absolute inset-0 opacity-80">
            <div className="absolute left-[-160px] top-[-140px] h-[380px] w-[380px] bg-leaf-200/50 blur-3xl" />
            <div className="absolute bottom-[-200px] right-[-180px] h-[460px] w-[460px] bg-sky-200/40 blur-3xl" />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-2xl tracking-tight text-slate-900">AI Growth Copilot</div>
                <div className="mt-1 text-sm text-slate-600">UMKM Marketing Studio</div>
              </div>
              <div className="h-12 w-12 bg-gradient-to-tr from-leaf-600 via-leaf-500 to-mint-300 shadow-glow" />
            </div>

            <div className="mt-8 max-w-xl">
              <div className="font-display text-4xl leading-[1.05] tracking-tight">
                Masuk untuk mulai menyusun kampanye yang lebih terarah.
              </div>
              <div className="mt-4 text-sm leading-relaxed text-slate-600">
                Setelah masuk, kamu bisa membuat kampanye, menyiapkan aset, dan menjalankan workflow end-to-end.
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="border border-slate-200/70 bg-white/70 p-3 shadow-sm backdrop-blur">
                  <div className="text-xs text-slate-500">Flow</div>
                  <div className="mt-2 font-medium text-slate-900">Campaigns</div>
                  <div className="mt-1 text-xs text-slate-500">End-to-end pipeline</div>
                </div>
                <div className="border border-slate-200/70 bg-white/70 p-3 shadow-sm backdrop-blur">
                  <div className="text-xs text-slate-500">Master</div>
                  <div className="mt-2 font-medium text-slate-900">Products</div>
                  <div className="mt-1 text-xs text-slate-500">Kelola katalog produk</div>
                </div>
                <div className="border border-slate-200/70 bg-white/70 p-3 shadow-sm backdrop-blur">
                  <div className="text-xs text-slate-500">Ops</div>
                  <div className="mt-2 font-medium text-slate-900">Inventory</div>
                  <div className="mt-1 text-xs text-slate-500">Stok per lokasi</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="col-span-12 overflow-hidden border border-slate-200/70 bg-white shadow-card lg:col-span-5">
        <div className="p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-display text-2xl tracking-tight">{mode === "login" ? "Login" : "Buat Akun"}</div>
              <div className="mt-1 text-sm text-slate-600">
                {mode === "login" ? "Masukkan username dan password." : "Username hanya huruf/angka/underscore."}
              </div>
            </div>
            <button
              onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
              className="border border-slate-200/70 bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"
            >
              {mode === "login" ? "Daftar" : "Sudah punya akun"}
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            <div>
              <div className="mb-2 text-sm text-slate-700">Username</div>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="mis. admin_utama" autoComplete="username" />
              <div className="mt-2 text-xs text-slate-500">3–32 karakter, hanya a-z A-Z 0-9 dan _</div>
            </div>
            <div>
              <div className="mb-2 text-sm text-slate-700">Password</div>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="minimal 6 karakter"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
            {mode === "register" ? (
              <div>
                <div className="mb-2 text-sm text-slate-700">Konfirmasi Password</div>
                <Input value={password2} onChange={(e) => setPassword2(e.target.value)} type="password" autoComplete="new-password" />
              </div>
            ) : null}

            <div className="grid gap-3 pt-1">
              <Button onClick={submit} disabled={busy} className="w-full">
                {busy ? "Please wait…" : mode === "login" ? "Login" : "Create Account"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

