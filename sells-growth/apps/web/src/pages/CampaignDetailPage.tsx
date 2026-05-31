import { type ReactNode, useEffect, useMemo, useState } from "react";
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

const STEP_ORDER = [
  "product_analyst",
  "marketing_strategist",
  "copywriter",
  "creative_director",
  "video_director",
  "pixverse",
  "campaign_manager",
];

function StepDot({ status }: { status: string }) {
  const cls =
    status === "success"
      ? "bg-leaf-500"
      : status === "failed"
        ? "bg-red-500"
        : status === "running"
          ? "bg-amber-400 animate-pulse"
          : "bg-slate-300";
  return <div className={["h-2.5 w-2.5", cls].join(" ")} />;
}

function JsonBlock({ data }: { data: unknown }) {
  const text = useMemo(() => JSON.stringify(data, null, 2), [data]);
  return (
    <pre className="max-h-[520px] overflow-auto border border-slate-200/70 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">
      {text}
    </pre>
  );
}

function CopyCard({
  title,
  value,
  onCopy,
  right,
}: {
  title: string;
  value?: string | null;
  onCopy: (v: string) => void;
  right?: ReactNode;
}) {
  return (
    <div className="border border-slate-200/70 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-900">{title}</div>
        <div className="flex items-center gap-2">
          {right ? <div>{right}</div> : null}
          <Button variant="ghost" size="sm" onClick={() => onCopy(value || "")} disabled={!value}>
            Copy
          </Button>
        </div>
      </div>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 selection:bg-leaf-200/60">
        {value || "—"}
      </div>
    </div>
  );
}

function ChipRow({
  title,
  items,
  onCopyItem,
  onCopyAll,
}: {
  title: string;
  items: string[];
  onCopyItem: (v: string) => void;
  onCopyAll?: () => void;
}) {
  return (
    <div className="border border-slate-200/70 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-900">{title}</div>
        {onCopyAll ? (
          <Button variant="ghost" size="sm" onClick={onCopyAll} disabled={items.length === 0}>
            Copy all
          </Button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length === 0 ? <div className="text-sm text-slate-500">—</div> : null}
        {items.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onCopyItem(t)}
            className="border border-slate-200/70 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
            title="Click to copy"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function Table({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: Array<{ key: string; label: string; className?: string }>;
  rows: Array<Record<string, any>>;
}) {
  return (
    <div className="overflow-hidden border border-slate-200/70 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-3 py-2">
        <div className="text-sm font-medium text-slate-900">{title}</div>
      </div>
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-white/90 backdrop-blur">
            <tr className="text-xs text-slate-600">
              {columns.map((c) => (
                <th key={c.key} className={["border-b border-slate-100 px-3 py-2 font-medium", c.className || ""].join(" ")}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-sm text-slate-500">
                  —
                </td>
              </tr>
            ) : null}
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-b-0">
                {columns.map((c) => (
                  <td key={c.key} className={["px-3 py-2 align-top text-slate-800", c.className || ""].join(" ")}>
                    {r[c.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function sortSteps(steps: ProgressResponse["steps"]): ProgressResponse["steps"] {
  const idx = (k: string) => {
    const i = STEP_ORDER.indexOf(k);
    return i === -1 ? 999 : i;
  };
  return [...steps].sort((a, b) => idx(a.step_key) - idx(b.step_key));
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
  const [showRawJson, setShowRawJson] = useState(false);
  const [copyTab, setCopyTab] = useState<"instagram" | "tiktok" | "facebook" | "whatsapp">("instagram");

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
      setSelectedStep((prev) => {
        if (prev && prev !== "product_analyst") return prev;
        if (res.campaign_status === "complete") return "campaign_manager";
        return res.current_step_key || "product_analyst";
      });
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

  useEffect(() => {
    setShowRawJson(false);
    if (selectedStep !== "copywriter" && selectedStep !== "campaign_manager") {
      setCopyTab("instagram");
    }
  }, [selectedStep]);

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

  const steps = useMemo(() => sortSteps(progress?.steps || []), [progress?.steps]);

  const campaignPackage = useMemo(() => {
    if (!stepOutput) return null;
    const pkg = (stepOutput as any)?.campaign_package;
    return pkg && typeof pkg === "object" ? (pkg as any) : null;
  }, [stepOutput]);

  const effectiveVideoUrl = useMemo(() => {
    const fromPkg = campaignPackage?.video?.video_asset_url;
    if (typeof fromPkg === "string" && fromPkg) return fromPkg;
    return videoUrl;
  }, [campaignPackage?.video?.video_asset_url, videoUrl]);

  const copyLike = useMemo(() => {
    if (selectedStep === "copywriter") return stepOutput as any;
    if (selectedStep === "campaign_manager") return (campaignPackage?.copy as any) || null;
    return null;
  }, [campaignPackage?.copy, selectedStep, stepOutput]);

  const copyTabText = useMemo(() => {
    if (!copyLike) return "";
    if (copyTab === "instagram") return (copyLike as any).instagram_caption || "";
    if (copyTab === "tiktok") return (copyLike as any).tiktok_caption || "";
    if (copyTab === "facebook") return (copyLike as any).facebook_post || "";
    if (copyTab === "whatsapp") return (copyLike as any).whatsapp_broadcast || "";
    return "";
  }, [copyLike, copyTab]);

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.push({ title: "Copied", detail: "Teks sudah disalin.", tone: "success" });
    } catch (e: any) {
      toast.push({ title: "Copy gagal", detail: e?.message || "Unknown error", tone: "danger" });
    }
  }

  const dem = (stepOutput as any)?.target_audience?.demographics || null;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
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
          <div className="grid gap-3">
            <div className="border border-slate-200/70 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Product</div>
              <div className="mt-2 text-sm text-slate-800">{campaign?.product_description}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                <div className="border border-slate-200/70 bg-white px-3 py-1 shadow-sm">
                  {campaign?.category || "—"}
                </div>
                <div className="border border-slate-200/70 bg-white px-3 py-1 shadow-sm">
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
              <div className="border border-red-200 bg-red-50 p-3">
                <div className="text-sm font-medium text-red-800">Step failed</div>
                <div className="mt-1 text-xs text-red-700">
                  {progress.error.step_key}: {progress.error.message}
                </div>
                <div className="mt-3">
                  <Button variant="danger" size="sm" onClick={retry} disabled={!progress.error.retryable}>
                    Retry Step
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="border border-slate-200/70 bg-white p-3 shadow-sm">
              <div className="text-sm font-medium text-slate-900">Workflow</div>
              <div className="mt-4 space-y-2">
                {steps.map((s) => (
                  <button
                    key={s.step_key}
                    type="button"
                    onClick={() => setSelectedStep(s.step_key)}
                    className={[
                      "flex w-full items-center justify-between gap-3 border px-3 py-2 text-left transition",
                      selectedStep === s.step_key
                        ? "border-slate-300 bg-slate-50"
                        : "border-slate-200/70 bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <StepDot status={s.status} />
                      <div>
                        <div className="text-sm text-slate-900">{STEP_LABELS[s.step_key] || s.step_key}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">{s.status}</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500">{s.duration_ms ? `${Math.round(s.duration_ms / 1000)}s` : ""}</div>
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
          subtitle={pendingApproval ? "Menunggu approval storyboard untuk lanjut ke video." : "Output siap dicopy dan dipakai."}
          right={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => loadStep(selectedStep)} disabled={stepLoading}>
                Reload
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowRawJson((v) => !v)} disabled={!stepOutput}>
                {showRawJson ? "Hide JSON" : "Raw JSON"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => nav("/settings")}>
                Settings
              </Button>
            </div>
          }
        >
          {stepLoading ? (
            <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
              Loading output…
            </div>
          ) : stepOutput ? (
            <div className="grid gap-3">
              {selectedStep === "product_analyst" ? (
                <div className="grid gap-4">
                  <CopyCard title="Product Summary" value={(stepOutput as any)?.product_summary || ""} onCopy={copyText} />
                  <ChipRow
                    title="USP"
                    items={Array.isArray((stepOutput as any)?.usp) ? ((stepOutput as any).usp as string[]) : []}
                    onCopyItem={copyText}
                    onCopyAll={() => copyText((((stepOutput as any)?.usp || []) as string[]).join("\n"))}
                  />
                  <ChipRow
                    title="Key Benefits"
                    items={Array.isArray((stepOutput as any)?.key_benefits) ? ((stepOutput as any).key_benefits as string[]) : []}
                    onCopyItem={copyText}
                    onCopyAll={() => copyText((((stepOutput as any)?.key_benefits || []) as string[]).join("\n"))}
                  />
                  <CopyCard title="Positioning Statement" value={(stepOutput as any)?.positioning_statement || ""} onCopy={copyText} />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="border border-slate-200/70 bg-white p-3 shadow-sm">
                      <div className="text-sm font-medium text-slate-900">Target Audience</div>
                      <div className="mt-3 grid gap-3 text-sm text-slate-700">
                        <div className="border border-slate-200/70 bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Age range</div>
                          <div className="mt-1 text-sm text-slate-900">{dem?.age_range || "—"}</div>
                        </div>
                        <div className="border border-slate-200/70 bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Location</div>
                          <div className="mt-1 text-sm text-slate-900">{dem?.location || "—"}</div>
                        </div>
                        <div className="border border-slate-200/70 bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Occupation</div>
                          <div className="mt-1 text-sm text-slate-900">{dem?.occupation || "—"}</div>
                        </div>
                        <div className="border border-slate-200/70 bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Pain points</div>
                          <div className="mt-1 text-sm text-slate-900">
                            {Array.isArray((stepOutput as any)?.target_audience?.pain_points)
                              ? (((stepOutput as any).target_audience.pain_points as string[]) || []).join(", ")
                              : "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border border-slate-200/70 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-slate-900">Objections & Answers</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyText(
                              (((stepOutput as any)?.objections_and_answers || []) as Array<any>)
                                .map((x) => `- ${x?.objection || ""}\n  ${x?.response || ""}`.trim())
                                .join("\n\n")
                            )
                          }
                          disabled={!Array.isArray((stepOutput as any)?.objections_and_answers)}
                        >
                          Copy all
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {Array.isArray((stepOutput as any)?.objections_and_answers)
                          ? (((stepOutput as any).objections_and_answers as Array<any>) || []).map((x, i) => (
                              <div key={i} className="border border-slate-200/70 bg-slate-50 p-3">
                                <div className="text-xs text-slate-500">Objection</div>
                                <div className="mt-1 text-sm text-slate-900">{x?.objection || "—"}</div>
                                <div className="mt-3 text-xs text-slate-500">Answer</div>
                                <div className="mt-1 text-sm text-slate-900">{x?.response || "—"}</div>
                              </div>
                            ))
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedStep === "marketing_strategist" ? (
                <div className="grid gap-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <CopyCard title="Campaign Name" value={(stepOutput as any)?.campaign_name || ""} onCopy={copyText} />
                    <CopyCard title="Objective" value={(stepOutput as any)?.objective || ""} onCopy={copyText} />
                  </div>
                  <CopyCard title="Offer Headline" value={(stepOutput as any)?.offer?.headline || ""} onCopy={copyText} />
                  <CopyCard title="Offer Details" value={(stepOutput as any)?.offer?.details || ""} onCopy={copyText} />
                  <ChipRow
                    title="Channels"
                    items={Array.isArray((stepOutput as any)?.channels) ? ((stepOutput as any).channels as string[]) : []}
                    onCopyItem={copyText}
                    onCopyAll={() => copyText((((stepOutput as any)?.channels || []) as string[]).join("\n"))}
                  />
                  <ChipRow
                    title="Messaging Pillars"
                    items={
                      Array.isArray((stepOutput as any)?.messaging_pillars) ? ((stepOutput as any).messaging_pillars as string[]) : []
                    }
                    onCopyItem={copyText}
                    onCopyAll={() => copyText((((stepOutput as any)?.messaging_pillars || []) as string[]).join("\n"))}
                  />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="border border-slate-200/70 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-slate-900">Content Angles</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyText((((stepOutput as any)?.content_angles || []) as string[]).join("\n"))}
                          disabled={!Array.isArray((stepOutput as any)?.content_angles)}
                        >
                          Copy all
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {Array.isArray((stepOutput as any)?.content_angles)
                          ? ((stepOutput as any).content_angles as string[]).map((x: string) => (
                              <div key={x} className="border border-slate-200/70 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                {x}
                              </div>
                            ))
                          : "—"}
                      </div>
                    </div>
                    <div className="border border-slate-200/70 bg-white p-3 shadow-sm">
                      <div className="text-sm font-medium text-slate-900">Publishing Plan</div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-700">
                        <div className="border border-slate-200/70 bg-slate-50 px-3 py-2">
                          Duration: {(stepOutput as any)?.publishing_plan?.duration_days ?? "—"} days
                        </div>
                        <div className="border border-slate-200/70 bg-slate-50 px-3 py-2">
                          Posts/day: {(stepOutput as any)?.publishing_plan?.posts_per_day ?? "—"}
                        </div>
                        <div className="border border-slate-200/70 bg-slate-50 px-3 py-2">
                          Best time windows:{" "}
                          {Array.isArray((stepOutput as any)?.publishing_plan?.best_time_windows)
                            ? (((stepOutput as any).publishing_plan.best_time_windows as string[]) || []).join(", ")
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedStep === "copywriter" || selectedStep === "campaign_manager" ? (
                <div className="grid gap-4">
                  {selectedStep === "copywriter" ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <CopyCard title="Brand Voice" value={(stepOutput as any)?.brand_voice || ""} onCopy={copyText} />
                      <CopyCard title="Disclaimer" value={(stepOutput as any)?.disclaimer || ""} onCopy={copyText} />
                    </div>
                  ) : null}
                  <div className="border border-slate-200/70 bg-white p-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-900">Captions (Ready to copy)</div>
                      <Button variant="ghost" size="sm" onClick={() => copyText(copyTabText)} disabled={!copyTabText}>
                        Copy current
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(["instagram", "tiktok", "facebook", "whatsapp"] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setCopyTab(k)}
                          className={[
                            "border px-3 py-1 text-xs transition",
                            copyTab === k
                              ? "border-leaf-200 bg-leaf-50 text-leaf-800"
                              : "border-slate-200/70 bg-slate-50 text-slate-700 hover:bg-slate-100",
                          ].join(" ")}
                        >
                          {k === "instagram" ? "Instagram" : k === "tiktok" ? "TikTok" : k === "facebook" ? "Facebook" : "WhatsApp"}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 border border-slate-200/70 bg-slate-50 p-3">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 selection:bg-leaf-200/60">
                        {copyTabText || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ChipRow
                      title="CTA Variants"
                      items={Array.isArray((copyLike as any)?.cta_variants) ? (((copyLike as any).cta_variants as string[]) || []) : []}
                      onCopyItem={copyText}
                      onCopyAll={() => copyText((((copyLike as any)?.cta_variants || []) as string[]).join("\n"))}
                    />
                    <ChipRow
                      title="Hashtags"
                      items={Array.isArray((copyLike as any)?.hashtags) ? (((copyLike as any).hashtags as string[]) || []) : []}
                      onCopyItem={copyText}
                      onCopyAll={() => copyText((((copyLike as any)?.hashtags || []) as string[]).join(" "))}
                    />
                  </div>
                </div>
              ) : null}

              {selectedStep === "pixverse" || selectedStep === "campaign_manager" ? (
                <div className="grid gap-4">
                  {selectedStep === "pixverse" ? (
                    <>
                      <CopyCard title="PixVerse Prompt" value={(stepOutput as any)?.pixverse_prompt || ""} onCopy={copyText} />
                      {(stepOutput as any)?.negative_prompt ? (
                        <CopyCard title="Negative Prompt" value={(stepOutput as any)?.negative_prompt || ""} onCopy={copyText} />
                      ) : null}
                    </>
                  ) : campaignPackage?.video?.pixverse_prompt ? (
                    <CopyCard title="PixVerse Prompt (Final)" value={campaignPackage.video.pixverse_prompt || ""} onCopy={copyText} />
                  ) : null}

                  {effectiveVideoUrl ? (
                    <div className="overflow-hidden border border-slate-200/70 bg-white shadow-sm">
                      <video src={effectiveVideoUrl} controls className="h-[420px] w-full bg-black object-contain" />
                      <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-600">
                        <div>Video Preview</div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => copyText(effectiveVideoUrl)}
                            className="text-leaf-700 underline underline-offset-4"
                          >
                            Copy URL
                          </button>
                          <a href={effectiveVideoUrl} target="_blank" className="text-leaf-700 underline underline-offset-4">
                            Open URL
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-amber-200 bg-amber-50 p-3 text-xs text-slate-700">
                      Video belum tersedia.
                    </div>
                  )}
                </div>
              ) : null}

              {selectedStep === "creative_director" ? (
                <div className="grid gap-4">
                  <CopyCard title="Creative Concept" value={(stepOutput as any)?.creative_concept || ""} onCopy={copyText} />
                  <ChipRow
                    title="Mood Keywords"
                    items={
                      Array.isArray((stepOutput as any)?.visual_style?.mood_keywords)
                        ? ((stepOutput as any).visual_style.mood_keywords as string[])
                        : []
                    }
                    onCopyItem={copyText}
                    onCopyAll={() => copyText((((stepOutput as any)?.visual_style?.mood_keywords || []) as string[]).join(", "))}
                  />
                  <Table
                    title="Storyboard"
                    columns={[
                      { key: "scene_no", label: "#" },
                      { key: "duration_sec", label: "Sec" },
                      { key: "purpose", label: "Purpose" },
                      { key: "on_screen_text", label: "On-screen" },
                      { key: "visual_description", label: "Visual" },
                      { key: "emotion", label: "Emotion" },
                    ]}
                    rows={
                      Array.isArray((stepOutput as any)?.storyboard)
                        ? (((stepOutput as any).storyboard as Array<any>) || []).map((s) => ({
                            scene_no: s?.scene_no,
                            duration_sec: s?.duration_sec,
                            purpose: s?.purpose,
                            on_screen_text: s?.on_screen_text || "",
                            visual_description: s?.visual_description,
                            emotion: s?.emotion,
                          }))
                        : []
                    }
                  />
                </div>
              ) : null}

              {selectedStep === "video_director" ? (
                <div className="grid gap-4">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <CopyCard title="Aspect Ratio" value={(stepOutput as any)?.aspect_ratio || ""} onCopy={copyText} />
                    <CopyCard title="Pace" value={(stepOutput as any)?.pace || ""} onCopy={copyText} />
                    <CopyCard title="Music Mood" value={(stepOutput as any)?.music_mood || ""} onCopy={copyText} />
                  </div>
                  <CopyCard title="Voiceover Script" value={(stepOutput as any)?.voiceover_script || ""} onCopy={copyText} />
                  <Table
                    title="Shot List"
                    columns={[
                      { key: "scene_no", label: "#" },
                      { key: "duration_sec", label: "Sec" },
                      { key: "shot_type", label: "Shot" },
                      { key: "camera_movement", label: "Camera" },
                      { key: "subject_action", label: "Action" },
                      { key: "notes", label: "Notes" },
                    ]}
                    rows={
                      Array.isArray((stepOutput as any)?.shot_list)
                        ? (((stepOutput as any).shot_list as Array<any>) || []).map((s) => ({
                            scene_no: s?.scene_no,
                            duration_sec: s?.duration_sec,
                            shot_type: s?.shot_type,
                            camera_movement: s?.camera_movement,
                            subject_action: s?.subject_action,
                            notes: s?.notes || "",
                          }))
                        : []
                    }
                  />
                </div>
              ) : null}

              {selectedStep === "campaign_manager" && campaignPackage ? (
                <div className="grid gap-4">
                  <CopyCard title="Campaign Package Summary" value={campaignPackage.summary || ""} onCopy={copyText} />
                  <div className="border border-slate-200/70 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-900">Publish Checklist</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyText(((campaignPackage.publish_checklist || []) as string[]).join("\n"))}
                        disabled={!Array.isArray(campaignPackage.publish_checklist)}
                      >
                        Copy all
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {((campaignPackage.publish_checklist || []) as string[]).map((item: string, i: number) => (
                        <div key={`${i}-${item}`} className="border border-slate-200/70 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {showRawJson ? <JsonBlock data={stepOutput} /> : null}
            </div>
          ) : (
            <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
              Belum ada output untuk step ini.
            </div>
          )}
        </Card>
      </div>

      {pendingApproval ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/30 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-xl overflow-hidden border border-slate-200/70 bg-white shadow-card">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="font-display text-xl tracking-tight">Approve storyboard?</div>
              <div className="mt-1 text-sm text-slate-600">Workflow berhenti setelah Creative Director. Approve untuk lanjut generate video.</div>
            </div>
            <div className="p-4">
              <div className="border border-slate-200/70 bg-slate-50 p-3 text-sm text-slate-700">
                Pastikan storyboard sudah sesuai brand dan offer. Jika reject, campaign kembali ke draft.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
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
