import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { getApiBaseUrl, getApiKey, setApiBaseUrl, setApiKey } from "../api/storage";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import TextArea from "../components/TextArea";
import { useToast } from "../components/Toast";

const AGENTS: Array<{ key: string; label: string; hint: string }> = [
  { key: "product_analyst", label: "Product Analyst", hint: "Preferensi analisa produk, USP, benefit, dan positioning." },
  { key: "marketing_strategist", label: "Marketing Strategist", hint: "Preferensi objective, channel, angle konten, dan plan publishing." },
  { key: "copywriter", label: "Copywriter", hint: "Preferensi gaya bahasa, CTA, struktur caption, dan batasan klaim." },
  { key: "creative_director", label: "Creative Director", hint: "Preferensi konsep kreatif, mood, tone visual, dan storyboard." },
  { key: "video_director", label: "Video Director", hint: "Preferensi shot list, pace, voiceover, dan style video." },
  { key: "pixverse", label: "PixVerse", hint: "Preferensi prompt video PixVerse (style, mood, batasan visual)." },
];

export default function SettingsPage() {
  const nav = useNavigate();
  const toast = useToast();

  const [tab, setTab] = useState<"settings" | "prompts">("settings");
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl());
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const keyPreview = useMemo(() => (apiKey ? `${apiKey.slice(0, 3)}…${apiKey.slice(-2)}` : "—"), [apiKey]);
  const [promptMap, setPromptMap] = useState<Record<string, string>>({});
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [savingPrompts, setSavingPrompts] = useState(false);

  async function testConnection() {
    try {
      await apiFetch<{ status: string }>("/health", { skipAuth: true });
      const me = await apiFetch<{ user_id: string }>("/api/v1/me");
      toast.push({ title: "Koneksi OK", detail: `Auth OK (user_id: ${me.user_id})`, tone: "success" });
    } catch (e: any) {
      toast.push({ title: "Koneksi gagal", detail: e?.message || "Unknown error", tone: "danger" });
    }
  }

  function logout() {
    setApiKey("");
    toast.push({ title: "Logout", tone: "success" });
    nav("/login");
  }

  function save() {
    setApiBaseUrl(apiBaseUrl);
    setApiKey(apiKey);
    toast.push({ title: "Settings tersimpan", detail: `API: ${apiBaseUrl}`, tone: "success" });
    nav("/campaigns");
  }

  const loadPrompts = useCallback(async () => {
    if (!apiKey) return;
    setLoadingPrompts(true);
    try {
      const res = await apiFetch<{ items: Array<{ agent_key: string; prompt: string }> }>("/api/v1/prompts");
      const next: Record<string, string> = {};
      for (const item of res.items || []) {
        next[item.agent_key] = item.prompt || "";
      }
      setPromptMap(next);
    } catch (e: any) {
      toast.push({ title: "Gagal load custom prompt", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoadingPrompts(false);
    }
  }, [apiKey, toast]);

  async function savePrompts() {
    if (!apiKey) {
      toast.push({ title: "Isi API key dulu", tone: "warning" });
      return;
    }
    setSavingPrompts(true);
    try {
      for (const a of AGENTS) {
        const prompt = promptMap[a.key] || "";
        await apiFetch(`/api/v1/prompts/${a.key}`, { method: "PUT", body: JSON.stringify({ prompt }) });
      }
      toast.push({ title: "Custom prompt tersimpan", tone: "success" });
      await loadPrompts();
    } catch (e: any) {
      toast.push({ title: "Gagal simpan custom prompt", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setSavingPrompts(false);
    }
  }

  useEffect(() => {
    if (tab === "prompts") loadPrompts();
  }, [loadPrompts, tab]);

  return (
    <div className="mx-auto max-w-4xl">
      <Card
        title="Settings"
        subtitle="Kelola koneksi API dan preferensi agent untuk user ini."
        right={
          <Button variant="ghost" size="sm" onClick={() => nav("/campaigns")}>
            Back
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
          <div className="rounded-none border border-slate-200/70 bg-white p-2">
            <button
              type="button"
              onClick={() => setTab("settings")}
              className={[
                "flex w-full items-center justify-between rounded-none px-3 py-2 text-left text-sm transition",
                tab === "settings" ? "bg-leaf-50 text-leaf-700" : "text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <span className="font-medium">Settings</span>
              <span className="text-xs text-slate-500">API</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("prompts")}
              className={[
                "mt-1 flex w-full items-center justify-between rounded-none px-3 py-2 text-left text-sm transition",
                tab === "prompts" ? "bg-leaf-50 text-leaf-700" : "text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <span className="font-medium">Custom Prompt</span>
              <span className="text-xs text-slate-500">Agent</span>
            </button>
          </div>

          {tab === "settings" ? (
            <div className="grid gap-4">
              <div>
                <div className="mb-2 text-sm text-slate-700">API Base URL</div>
                <Input value={apiBaseUrl} onChange={(e) => setApiBaseUrlState(e.target.value)} placeholder="http://localhost:8000" />
                <div className="mt-2 text-xs text-slate-500">Endpoint contoh: http://localhost:8000</div>
              </div>
              <div>
                <div className="mb-2 text-sm text-slate-700">X-API-Key</div>
                <Input value={apiKey} onChange={(e) => setApiKeyState(e.target.value)} placeholder="dev" />
                <div className="mt-2 text-xs text-slate-500">Preview: {keyPreview}</div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="ghost" onClick={testConnection}>
                  Test Connection
                </Button>
                {apiKey ? (
                  <Button variant="danger" onClick={logout}>
                    Logout
                  </Button>
                ) : null}
                <Button onClick={save}>Save</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Custom Prompt per Agent</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Instruksi ini dipakai setiap agent workflow untuk user ini.
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={loadPrompts} disabled={!apiKey || loadingPrompts || savingPrompts}>
                  {loadingPrompts ? "Refresh…" : "Refresh"}
                </Button>
              </div>

              {!apiKey ? (
                <div className="text-sm text-slate-600">Isi X-API-Key dulu untuk mengatur custom prompt per user.</div>
              ) : (
                <div className="grid gap-4">
                  {AGENTS.map((a) => (
                    <div key={a.key} className="rounded-none border border-slate-200/70 bg-white p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{a.label}</div>
                          <div className="mt-1 text-xs text-slate-500">{a.hint}</div>
                        </div>
                        <div className="text-xs text-slate-500">{a.key}</div>
                      </div>
                      <div className="mt-2">
                        <TextArea
                          rows={4}
                          value={promptMap[a.key] || ""}
                          onChange={(e) => setPromptMap((prev) => ({ ...prev, [a.key]: e.target.value }))}
                          placeholder="Contoh: Gunakan gaya bahasa profesional, singkat, tanpa klaim berlebihan. Prioritaskan CTA WhatsApp."
                        />
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={savePrompts} disabled={savingPrompts || loadingPrompts}>
                      {savingPrompts ? "Saving…" : "Save Prompts"}
                    </Button>
                    <div className="text-xs text-slate-500">Berlaku untuk step berikutnya pada campaign milik user ini.</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
