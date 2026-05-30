import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { CampaignDetail, ProgressResponse } from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import { useToast } from "../components/Toast";

const STEP_LABELS: Record<string, string> = {
  product_analyst: "Product Analyst",
  marketing_strategist: "Marketing Strategist",
  copywriter: "Copywriter",
  creative_director: "Creative Director (Storyboard)",
  video_director: "Video Director",
  pixverse: "PixVerse",
  campaign_manager: "Campaign Manager",
};

function StepDot({ status }: { status: string }) {
  const cls =
    status === "success"
      ? "bg-mint-300"
      : status === "failed"
        ? "bg-red-300"
        : status === "running"
          ? "bg-caramel-300 animate-pulse"
          : "bg-white/30";
  return <div className={["h-2.5 w-2.5 rounded-full", cls].join(" ")} />;
}

function JsonBlock({ data }: { data: unknown }) {
  const text = useMemo(() => JSON.stringify(data, null, 2), [data]);
  return (
    <pre className="max-h-[520px] overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-relaxed text-white/80">
      {text}
    </pre>
  );
}

export default function CampaignDetailPage() {
  const toast = useToast();
  const nav = useNavigate();
  const { campaignId } = useParams();
  const id = campaignId || "";

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [selectedStep, setSelectedStep] = useState<string>("product_analyst");
  const [stepOutput, setStepOutput] = useState<any>(null);
  const [stepLoading, setStepLoading] = useState(false);

  const pendingApproval = progress?.approval_status === "pending_storyboard";

  async function loadCampaign() {
    try {
      const res = await apiFetch<CampaignDetail>(`/api/v1/campaigns/${id}`);
      setCampaign(res);
    } catch (e: any) {
      toast.push({ title: "Gagal load campaign", detail: e?.message || "Unknown error", tone: "danger" });
    }
  }

  async function loadProgress() {
    try {
      const res = await apiFetch<ProgressResponse>(`/api/v1/campaigns/${id}/progress`);
      setProgress(res);
      if (res.current_step_key) setSelectedStep((prev) => (prev ? prev : res.current_step_key || "product_analyst"));
    } catch (e: any) {
      toast.push({ title: "Gagal load progress", detail: e?.message || "Unknown error", tone: "danger" });
    }
  }

  async function loadStep(stepKey: string) {
    setStepLoading(true);
    try {
      const res = await apiFetch<{ output: any; status: string }>(`/api/v1/campaigns/${id}/steps/${stepKey}`);
      setStepOutput(res.output);
    } catch (e: any) {
      setStepOutput(null);
      if (e?.code !== "not_found") {
        toast.push({ title: "Gagal load output step", detail: e?.message || "Unknown error", tone: "danger" });
      }
    } finally {
      setStepLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    loadCampaign();
    loadProgress();
    const t = window.setInterval(loadProgress, 1500);
    return () => window.clearInterval(t);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadStep(selectedStep);
  }, [id, selectedStep]);

  async function generate() {
    try {
      await apiFetch(`/api/v1/campaigns/${id}/generate`, { method: "POST" });
      toast.push({ title: "Generation started", detail: "Workflow mulai berjalan.", tone: "success" });
      await loadProgress();
    } catch (e: any) {
      toast.push({ title: "Gagal start generate", detail: e?.message || "Unknown error", tone: "danger" });
    }
  }

  async function approve() {
    try {
      await apiFetch(`/api/v1/campaigns/${id}/storyboard/approve`, { method: "POST" });
      toast.push({ title: "Storyboard approved", detail: "Workflow lanjut ke video.", tone: "success" });
      await loadProgress();
    } catch (e: any) {
      toast.push({ title: "Approve gagal", detail: e?.message || "Unknown error", tone: "danger" });
    }
  }

  async function reject() {
    try {
      await apiFetch(`/api/v1/campaigns/${id}/storyboard/reject`, { method: "POST" });
      toast.push({ title: "Storyboard rejected", detail: "Campaign kembali ke draft.", tone: "success" });
      await loadCampaign();
      await loadProgress();
    } catch (e: any) {
      toast.push({ title: "Reject gagal", detail: e?.message || "Unknown error", tone: "danger" });
    }
  }

  async function retry() {
    if (!progress?.error?.step_key) return;
    try {
      await apiFetch(`/api/v1/campaigns/${id}/steps/${progress.error.step_key}/retry`, { method: "POST" });
      toast.push({ title: "Retry queued", detail: progress.error.step_key, tone: "success" });
      await loadProgress();
    } catch (e: any) {
      toast.push({ title: "Retry gagal", detail: e?.message || "Unknown error", tone: "danger" });
    }
  }

  const videoUrl = useMemo(() => {
    const asset = campaign?.assets?.find((a) => a.asset_type === "pixverse_video");
    return asset?.public_url || null;
  }, [campaign]);

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <Card
          title={campaign?.product_name || "Campaign"}
          subtitle={campaign ? `Status: ${campaign.status} • Approval: ${campaign.approval_status}` : "Loading…"}
          right={
            <Link to="/campaigns">
              <Button variant="ghost" size="sm">
                Back
              </Button>
            </Link>
          }
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/50">Product</div>
              <div className="mt-2 text-sm text-white/85">{campaign?.product_description}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {campaign?.category || "—"}
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Rp{campaign?.price?.amount?.toLocaleString("id-ID") || "—"}
                </div>
              </div>
            </div>

            {campaign?.status === "draft" ? (
              <Button onClick={generate} disabled={!campaign}>
                Generate Campaign
              </Button>
            ) : null}

            {progress?.error ? (
              <div className="rounded-2xl border border-red-300/25 bg-red-300/10 p-4">
                <div className="text-sm font-medium text-red-100">Step failed</div>
                <div className="mt-1 text-xs text-red-100/80">
                  {progress.error.step_key}: {progress.error.message}
                </div>
                <div className="mt-3">
                  <Button variant="danger" size="sm" onClick={retry} disabled={!progress.error.retryable}>
                    Retry Step
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-medium text-white/85">Workflow</div>
              <div className="mt-4 space-y-2">
                {(progress?.steps || []).map((s) => (
                  <button
                    key={s.step_key}
                    type="button"
                    onClick={() => setSelectedStep(s.step_key)}
                    className={[
                      "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition",
                      selectedStep === s.step_key ? "border-white/18 bg-white/10" : "border-white/10 bg-white/4 hover:bg-white/7",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <StepDot status={s.status} />
                      <div>
                        <div className="text-sm text-white/90">{STEP_LABELS[s.step_key] || s.step_key}</div>
                        <div className="mt-0.5 text-[11px] text-white/50">{s.status}</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-white/45">{s.duration_ms ? `${Math.round(s.duration_ms / 1000)}s` : ""}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-8">
        <Card
          title={STEP_LABELS[selectedStep] || selectedStep}
          subtitle={pendingApproval ? "Menunggu approval storyboard untuk lanjut ke video." : "Output step tersimpan di DB."}
          right={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => loadStep(selectedStep)} disabled={stepLoading}>
                Reload output
              </Button>
              <Button variant="ghost" size="sm" onClick={() => nav("/settings")}>
                Settings
              </Button>
            </div>
          }
        >
          {stepLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/60">
              Loading output…
            </div>
          ) : stepOutput ? (
            <div className="grid gap-5">
              {selectedStep === "pixverse" && videoUrl ? (
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20">
                  <video src={videoUrl} controls className="h-[360px] w-full bg-black object-contain" />
                  <div className="flex items-center justify-between px-4 py-3 text-xs text-white/60">
                    <div>Video</div>
                    <a href={videoUrl} target="_blank" className="text-caramel-200 underline underline-offset-4">
                      Open URL
                    </a>
                  </div>
                </div>
              ) : null}

              <JsonBlock data={stepOutput} />
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/60">
              Belum ada output untuk step ini.
            </div>
          )}
        </Card>
      </div>

      {pendingApproval ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-6 backdrop-blur sm:items-center">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-white/10 to-white/6 shadow-card">
            <div className="border-b border-white/10 px-6 py-5">
              <div className="font-display text-xl tracking-tight">Approve storyboard?</div>
              <div className="mt-1 text-sm text-white/60">
                Workflow berhenti setelah Creative Director. Approve untuk lanjut generate video.
              </div>
            </div>
            <div className="p-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                Pastikan storyboard sudah sesuai brand dan offer. Jika reject, campaign kembali ke draft.
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={approve}>Approve</Button>
                <Button variant="danger" onClick={reject}>
                  Reject
                </Button>
                <Button variant="ghost" onClick={() => setSelectedStep("creative_director")}>
                  View storyboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
