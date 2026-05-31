import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { AdminTeamCreateRequest, AdminTeamCreateResponse, AdminTeamListResponse } from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { useToast } from "../components/Toast";

export default function TeamsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<AdminTeamListResponse | null>(null);

  const [ownerUsername, setOwnerUsername] = useState("");
  const [name, setName] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<AdminTeamListResponse>("/api/v1/admin/teams");
      setData(res);
    } catch (e: any) {
      toast.push({ title: "Gagal load teams", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  async function createTeam() {
    if (saving) return;
    const owner = ownerUsername.trim();
    const teamName = name.trim();
    if (!owner || !teamName) {
      toast.push({ title: "Data belum lengkap", detail: "Isi owner username dan name.", tone: "danger" });
      return;
    }
    setSaving(true);
    try {
      const payload: AdminTeamCreateRequest = { owner_username: owner, name: teamName };
      const res = await apiFetch<AdminTeamCreateResponse>("/api/v1/admin/teams", { method: "POST", body: JSON.stringify(payload) });
      toast.push({ title: "Team dibuat", detail: `id: ${res.id}`, tone: "success" });
      setOwnerUsername("");
      setName("");
      await load();
    } catch (e: any) {
      toast.push({ title: "Gagal create team", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const total = data?.items.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(total, page * pageSize);
  const paged = (data?.items || []).slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="grid gap-4">
      <Card
        title="Teams"
        subtitle="Kelola team dan membership."
        right={
          <Button variant="ghost" size="sm" onClick={load} disabled={loading || saving}>
            Refresh
          </Button>
        }
      >
        <div className="grid gap-4">
          <div className="border border-slate-200/70 bg-white p-4">
            <div className="text-xs font-medium text-slate-700">Create team</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-slate-600">Owner username</div>
                <Input value={ownerUsername} onChange={(e) => setOwnerUsername(e.target.value)} placeholder="username" />
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-600">Name</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team A" />
              </div>
            </div>
            <div className="mt-3">
              <Button onClick={createTeam} disabled={saving}>
                {saving ? "Saving…" : "Create Team"}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Loading…</div>
          ) : !data || data.items.length === 0 ? (
            <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Belum ada team.</div>
          ) : (
            <div className="border border-slate-200/70 bg-white">
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-xs text-slate-600">
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Name</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Owner</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Created</th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((t) => (
                      <tr key={t.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-2 align-top text-slate-900">{t.name}</td>
                        <td className="px-3 py-2 align-top text-slate-700">{t.owner_username || t.owner_user_id}</td>
                        <td className="px-3 py-2 align-top text-slate-700">{new Date(t.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2 align-top text-right">
                          <Link to={`/admin/teams/${t.id}`} className="text-leaf-700 underline underline-offset-4">
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-2">
                <div className="text-xs text-slate-600">
                  Menampilkan {startIndex}–{endIndex} dari {total}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={String(pageSize)}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="border border-slate-200/80 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-leaf-200/70"
                  >
                    <option value="5">5 / page</option>
                    <option value="10">10 / page</option>
                    <option value="20">20 / page</option>
                  </select>

                  <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    Prev
                  </Button>
                  <div className="px-2 text-xs text-slate-600">
                    {page} / {totalPages}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
