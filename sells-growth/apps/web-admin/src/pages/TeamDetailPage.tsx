import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { AdminTeamDetailResponse, AdminTeamMemberAddRequest } from "../api/types";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { useToast } from "../components/Toast";

export default function TeamDetailPage() {
  const toast = useToast();
  const { teamId } = useParams<{ teamId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<AdminTeamDetailResponse | null>(null);

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("member");

  async function load() {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await apiFetch<AdminTeamDetailResponse>(`/api/v1/admin/teams/${teamId}`);
      setData(res);
    } catch (e: any) {
      toast.push({ title: "Gagal load team", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  async function addMember() {
    if (!teamId || saving) return;
    const id = userId.trim();
    if (!id) {
      toast.push({ title: "User ID kosong", tone: "danger" });
      return;
    }
    setSaving(true);
    try {
      const payload: AdminTeamMemberAddRequest = { user_id: id, role };
      await apiFetch(`/api/v1/admin/teams/${teamId}/members`, { method: "POST", body: JSON.stringify(payload) });
      toast.push({ title: "Member ditambahkan", tone: "success" });
      setUserId("");
      setRole("member");
      await load();
    } catch (e: any) {
      toast.push({ title: "Gagal add member", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(memberUserId: string) {
    if (!teamId || saving) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/admin/teams/${teamId}/members/${memberUserId}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      toast.push({ title: "Gagal remove member", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, [teamId]);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <Link to="/admin/teams" className="text-sm text-leaf-700 underline underline-offset-4">
          Back to teams
        </Link>
      </div>

      <Card title="Team" subtitle="Detail dan membership." right={<Button variant="ghost" size="sm" onClick={load} disabled={loading || saving}>Refresh</Button>}>
        {loading ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Loading…</div>
        ) : !data ? (
          <div className="border border-slate-200/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Team tidak ditemukan.</div>
        ) : (
          <div className="grid gap-4">
            <div className="border border-slate-200/70 bg-white p-4">
              <div className="text-xs text-slate-500">Name</div>
              <div className="mt-1 text-sm text-slate-900">{data.team.name}</div>
              <div className="mt-3 grid gap-1 text-xs text-slate-600">
                <div>Owner: {data.team.owner_user_id}</div>
                <div>Created: {new Date(data.team.created_at).toLocaleString()}</div>
              </div>
            </div>

            <div className="border border-slate-200/70 bg-white p-4">
              <div className="text-xs font-medium text-slate-700">Add member</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <div className="mb-1 text-xs text-slate-600">User ID</div>
                  <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid" />
                </div>
                <div>
                  <div className="mb-1 text-xs text-slate-600">Role</div>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-leaf-300 focus:outline-none focus:ring-2 focus:ring-leaf-200/70"
                  >
                    <option value="member">member</option>
                    <option value="owner">owner</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <Button onClick={addMember} disabled={saving}>
                  {saving ? "Saving…" : "Add Member"}
                </Button>
              </div>
            </div>

            <div className="border border-slate-200/70 bg-white">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Members</div>
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-xs text-slate-600">
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Username</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">User ID</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Role</th>
                      <th className="border-b border-slate-100 px-3 py-2 font-medium">Created</th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.members.map((m) => (
                      <tr key={m.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-2 align-top text-slate-900">{m.username || "-"}</td>
                        <td className="px-3 py-2 align-top text-slate-700">{m.user_id}</td>
                        <td className="px-3 py-2 align-top text-slate-700">{m.role}</td>
                        <td className="px-3 py-2 align-top text-slate-700">{new Date(m.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2 align-top text-right">
                          {m.user_id === data.team.owner_user_id ? (
                            <span className="text-xs text-slate-500">Owner</span>
                          ) : (
                            <Button variant="danger" size="sm" onClick={() => removeMember(m.user_id)} disabled={saving}>
                              Remove
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

