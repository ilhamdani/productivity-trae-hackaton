import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { getApiKey, setApiKey } from "../api/storage";
import Button from "../components/Button";
import Input from "../components/Input";
import { useToast } from "../components/Toast";

type AuthResponse = { user_id: string; username: string; api_key: string };

export default function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const next = params.get("next") || "/admin/users";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getApiKey()) nav("/admin/users", { replace: true });
  }, [nav]);

  async function submit() {
    if (busy) return;
    const u = username.trim();
    if (!u || !password) {
      toast.push({ title: "Username dan password wajib diisi", tone: "danger" });
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch<AuthResponse>("/api/v1/auth/login", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ username: u, password }),
      });
      setApiKey(res.api_key);
      toast.push({ title: "Login berhasil", detail: `User: ${res.username}`, tone: "success" });
      nav(next, { replace: true });
    } catch (e: any) {
      toast.push({ title: "Login gagal", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-dvh max-w-xl grid-cols-1 gap-4 p-4">
      <div className="overflow-hidden border border-slate-200/70 bg-white shadow-card">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-2xl tracking-tight text-slate-900">AI Growth Copilot</div>
              <div className="mt-1 text-sm text-slate-600">Admin Console</div>
            </div>
            <div className="h-12 w-12 bg-gradient-to-tr from-ink-900 via-ink-800 to-leaf-600 shadow-card" />
          </div>

          <div className="mt-8">
            <div className="font-display text-3xl leading-[1.05] tracking-tight">Masuk sebagai super admin.</div>
            <div className="mt-3 text-sm leading-relaxed text-slate-600">
              Gunakan akun yang memiliki role <span className="font-medium">super_admin</span> untuk mengakses menu admin.
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div>
              <div className="mb-2 text-sm text-slate-700">Username</div>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoComplete="username" />
            </div>
            <div>
              <div className="mb-2 text-sm text-slate-700">Password</div>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
                type="password"
                autoComplete="current-password"
              />
            </div>

            <Button onClick={submit} disabled={busy} className="w-full">
              {busy ? "Please wait…" : "Login"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
