import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { getApiBaseUrl, getApiKey, setApiBaseUrl, setApiKey } from "../api/storage";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { useToast } from "../components/Toast";

export default function SettingsPage() {
  const nav = useNavigate();
  const toast = useToast();

  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl());
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const keyPreview = useMemo(() => (apiKey ? `${apiKey.slice(0, 3)}…${apiKey.slice(-2)}` : "—"), [apiKey]);

  async function testConnection() {
    try {
      await apiFetch<{ status: string }>("/health", { skipAuth: true });
      const me = await apiFetch<{ user_id: string }>("/api/v1/me");
      toast.push({ title: "Koneksi OK", detail: `Auth OK (user_id: ${me.user_id})`, tone: "success" });
    } catch (e: any) {
      toast.push({ title: "Koneksi gagal", detail: e?.message || "Unknown error", tone: "danger" });
    }
  }

  function save() {
    setApiBaseUrl(apiBaseUrl);
    setApiKey(apiKey);
    toast.push({ title: "Settings tersimpan", detail: `API: ${apiBaseUrl}`, tone: "success" });
    nav("/campaigns");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card
        title="Settings"
        subtitle="Simpan endpoint backend dan API key untuk mengakses /api/v1."
        right={
          <Button variant="ghost" size="sm" onClick={() => nav("/campaigns")}>
            Back
          </Button>
        }
      >
        <div className="grid gap-4">
          <div>
            <div className="mb-2 text-sm text-white/70">API Base URL</div>
            <Input value={apiBaseUrl} onChange={(e) => setApiBaseUrlState(e.target.value)} placeholder="http://localhost:8000" />
            <div className="mt-2 text-xs text-white/45">Endpoint contoh: http://localhost:8000</div>
          </div>
          <div>
            <div className="mb-2 text-sm text-white/70">X-API-Key</div>
            <Input value={apiKey} onChange={(e) => setApiKeyState(e.target.value)} placeholder="dev" />
            <div className="mt-2 text-xs text-white/45">Preview: {keyPreview}</div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="ghost" onClick={testConnection}>
              Test Connection
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
