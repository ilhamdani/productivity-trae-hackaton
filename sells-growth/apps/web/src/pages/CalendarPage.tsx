import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import type { CampaignListItem, ContentDraft } from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import TextArea from "../components/TextArea";
import { useToast } from "../components/Toast";

type DraftListResponse = { items: ContentDraft[] };
type CampaignListResponse = { items: CampaignListItem[] };

type CopywriterOutput = {
  instagram_caption?: string;
  tiktok_caption?: string;
  facebook_post?: string;
  whatsapp_broadcast?: string;
  cta_variants?: string[];
  hashtags?: string[];
};

function formatDt(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString();
}

export default function CalendarPage() {
  const toast = useToast();
  const [items, setItems] = useState<ContentDraft[]>([]);
  const [loading, setLoading] = useState(true);

  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [copywriter, setCopywriter] = useState<CopywriterOutput | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  const [channel, setChannel] = useState<ContentDraft["channel"]>("instagram");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [cta, setCta] = useState("");
  const [mediaUrls, setMediaUrls] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);

  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<DraftListResponse>("/api/v1/calendar/drafts");
      setItems(res.items || []);
    } catch (e: any) {
      toast.push({ title: "Gagal load calendar", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  async function loadCampaigns() {
    setLoadingCampaigns(true);
    try {
      const res = await apiFetch<CampaignListResponse>("/api/v1/campaigns");
      const complete = (res.items || []).filter((c) => c.status === "complete");
      setCampaigns(complete);
      if (complete.length && !selectedCampaignId) setSelectedCampaignId(complete[0].id);
    } catch (e: any) {
      toast.push({ title: "Gagal load campaigns", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoadingCampaigns(false);
    }
  }

  useEffect(() => {
    load();
    loadCampaigns();
  }, []);

  const campaignById = useMemo(() => {
    const m = new Map<string, CampaignListItem>();
    for (const c of campaigns) m.set(c.id, c);
    return m;
  }, [campaigns]);

  useEffect(() => {
    async function loadCopy() {
      if (!selectedCampaignId) {
        setCopywriter(null);
        return;
      }
      try {
        const res = await apiFetch<{ output: any; status: string }>(`/api/v1/campaigns/${selectedCampaignId}/steps/copywriter`);
        if (res.status !== "success" || !res.output) {
          setCopywriter(null);
          return;
        }
        setCopywriter(res.output as CopywriterOutput);
      } catch {
        setCopywriter(null);
      }
    }
    loadCopy();
  }, [selectedCampaignId]);

  useEffect(() => {
    if (!copywriter) return;
    const nextCaption =
      channel === "instagram"
        ? copywriter.instagram_caption
        : channel === "tiktok"
          ? copywriter.tiktok_caption
          : channel === "facebook"
            ? copywriter.facebook_post
            : copywriter.whatsapp_broadcast;
    if (typeof nextCaption === "string" && nextCaption.trim()) setCaption(nextCaption.trim());
    if (Array.isArray(copywriter.hashtags) && copywriter.hashtags.length) setHashtags(copywriter.hashtags.join(", "));
    if (Array.isArray(copywriter.cta_variants) && copywriter.cta_variants.length) setCta(String(copywriter.cta_variants[0] || ""));
  }, [copywriter, channel]);

  const parsedHashtags = useMemo(() => {
    return hashtags
      .split(/[\n,]+/g)
      .map((x) => x.trim())
      .filter(Boolean);
  }, [hashtags]);

  const parsedMediaUrls = useMemo(() => {
    return mediaUrls
      .split(/[\n,]+/g)
      .map((x) => x.trim())
      .filter(Boolean);
  }, [mediaUrls]);

  async function createDraft() {
    if (creating) return;
    if (!selectedCampaignId) {
      toast.push({ title: "Pilih campaign sumber dulu", tone: "danger" });
      return;
    }
    if (!caption.trim()) {
      toast.push({ title: "Caption wajib diisi", tone: "danger" });
      return;
    }
    setCreating(true);
    try {
      await apiFetch<{ id: string }>("/api/v1/calendar/drafts", {
        method: "POST",
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          channel,
          content_type: "post",
          caption: caption.trim(),
          hashtags: parsedHashtags,
          cta_text: cta.trim() || null,
          media_urls: parsedMediaUrls,
          notes: notes.trim() || null,
        }),
      });
      setCaption("");
      setHashtags("");
      setCta("");
      setMediaUrls("");
      setNotes("");
      toast.push({ title: "Draft dibuat", tone: "success" });
      await load();
    } catch (e: any) {
      toast.push({ title: "Gagal buat draft", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setCreating(false);
    }
  }

  async function scheduleDraft(draftId: string) {
    if (!scheduleAt) {
      toast.push({ title: "Pilih waktu publish", tone: "danger" });
      return;
    }
    try {
      const iso = new Date(scheduleAt).toISOString();
      await apiFetch<ContentDraft>(`/api/v1/calendar/drafts/${draftId}/schedule`, {
        method: "POST",
        body: JSON.stringify({ scheduled_at: iso, timezone: "Asia/Jakarta" }),
      });
      toast.push({ title: "Draft dijadwalkan", tone: "success" });
      setActiveScheduleId(null);
      setScheduleAt("");
      await load();
    } catch (e: any) {
      toast.push({ title: "Gagal menjadwalkan", detail: e?.message || "Unknown error", tone: "danger" });
    }
  }

  async function markPublished(draftId: string) {
    try {
      await apiFetch<ContentDraft>(`/api/v1/calendar/drafts/${draftId}/mark-published`, {
        method: "POST",
        body: JSON.stringify({ post_url: postUrl.trim() || null }),
      });
      toast.push({ title: "Ditandai published", tone: "success" });
      setPublishingId(null);
      setPostUrl("");
      await load();
    } catch (e: any) {
      toast.push({ title: "Gagal update status", detail: e?.message || "Unknown error", tone: "danger" });
    }
  }

  return (
    <div className="grid gap-4">
      <Card
        title="Content Calendar"
        subtitle="Pilih campaign yang sudah selesai di-generate sebagai sumber, lalu susun jadwal posting."
        right={
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            Refresh
          </Button>
        }
      >
        <div className="grid gap-4">
          <div className="border border-slate-200/70 bg-white p-3 shadow-card">
            <div className="grid gap-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-3">
                <div className="text-xs text-slate-600">Campaign sumber</div>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  disabled={loadingCampaigns || campaigns.length === 0}
                  className="mt-2 w-full border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-leaf-200/70 disabled:bg-slate-50"
                >
                  {campaigns.length === 0 ? <option value="">Belum ada campaign yang complete</option> : null}
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.product_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <div className="text-xs text-slate-600">Channel</div>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as any)}
                  className="mt-2 w-full border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-leaf-200/70"
                >
                  <option value="instagram">instagram</option>
                  <option value="tiktok">tiktok</option>
                  <option value="facebook">facebook</option>
                  <option value="whatsapp">whatsapp</option>
                </select>
              </div>
              <div className="md:col-span-6">
                <div className="text-xs text-slate-600">Caption</div>
                <TextArea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="mt-2 min-h-[90px]"
                  placeholder={selectedCampaignId ? "Sesuaikan caption bila perlu…" : "Pilih campaign dulu…"}
                />
              </div>
              <div className="md:col-span-4">
                <div className="text-xs text-slate-600">Hashtags (pisahkan dengan koma)</div>
                <Input value={hashtags} onChange={(e) => setHashtags(e.target.value)} className="mt-2 py-2" placeholder="#promo,#umkm" />
              </div>
              <div className="md:col-span-4">
                <div className="text-xs text-slate-600">CTA (opsional)</div>
                <Input value={cta} onChange={(e) => setCta(e.target.value)} className="mt-2 py-2" placeholder="Order sekarang via WA" />
              </div>
              <div className="md:col-span-4">
                <div className="text-xs text-slate-600">Media URLs (opsional)</div>
                <Input
                  value={mediaUrls}
                  onChange={(e) => setMediaUrls(e.target.value)}
                  className="mt-2 py-2"
                  placeholder="https://...mp4, https://...jpg"
                />
              </div>
              <div className="md:col-span-10">
                <div className="text-xs text-slate-600">Notes (opsional)</div>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2 py-2" placeholder="Catatan internal…" />
              </div>
              <div className="md:col-span-2">
                <Button size="sm" onClick={createDraft} disabled={creating || !selectedCampaignId} className="w-full">
                  {creating ? "Saving…" : "Create"}
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Loading…</div>
          ) : items.length === 0 ? (
            <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Belum ada draft.</div>
          ) : (
            <div className="border border-slate-200/70 bg-white">
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-xs text-slate-600">
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Campaign</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Channel</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Status</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Schedule</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Caption</th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((d) => (
                      <tr key={d.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-2 align-top text-slate-900">
                          {d.campaign_id ? campaignById.get(d.campaign_id)?.product_name || "—" : "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-slate-900">{d.channel}</td>
                        <td className="px-3 py-2 align-top text-slate-700">{d.status}</td>
                        <td className="px-3 py-2 align-top text-slate-700">{formatDt(d.scheduled_at)}</td>
                        <td className="px-3 py-2 align-top text-slate-700">
                          <div className="max-w-[560px] truncate">{d.caption}</div>
                          {d.post_url ? (
                            <div className="mt-1 text-xs">
                              <a href={d.post_url} target="_blank" className="text-leaf-700 underline underline-offset-4">
                                Post URL
                              </a>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setActiveScheduleId(d.id);
                                setPublishingId(null);
                              }}
                              disabled={d.status === "published"}
                            >
                              Schedule
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPublishingId(d.id);
                                setActiveScheduleId(null);
                              }}
                              disabled={d.status === "published"}
                            >
                              Mark published
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {activeScheduleId ? (
                <div className="border-t border-slate-100 px-3 py-2">
                  <div className="grid gap-2 md:grid-cols-12 md:items-end">
                    <div className="md:col-span-4">
                      <div className="text-xs text-slate-600">Publish time</div>
                      <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="mt-2 py-2" />
                    </div>
                    <div className="md:col-span-8">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setActiveScheduleId(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => scheduleDraft(activeScheduleId)}>
                          Save schedule
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {publishingId ? (
                <div className="border-t border-slate-100 px-3 py-2">
                  <div className="grid gap-2 md:grid-cols-12 md:items-end">
                    <div className="md:col-span-8">
                      <div className="text-xs text-slate-600">Post URL (opsional)</div>
                      <Input value={postUrl} onChange={(e) => setPostUrl(e.target.value)} className="mt-2 py-2" placeholder="https://..." />
                    </div>
                    <div className="md:col-span-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setPublishingId(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => markPublished(publishingId)}>
                          Confirm
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
