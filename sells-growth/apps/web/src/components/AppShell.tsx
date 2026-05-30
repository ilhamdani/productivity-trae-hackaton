import { NavLink, Outlet, useLocation } from "react-router-dom";
import { getApiBaseUrl, getApiKey } from "../api/storage";

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
      <span className="text-white/50">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function AppShell() {
  const location = useLocation();
  const api = getApiBaseUrl();
  const key = getApiKey();
  const shortKey = key ? `${key.slice(0, 3)}…${key.slice(-2)}` : "—";
  const title =
    location.pathname.startsWith("/campaigns/new")
      ? "New Campaign"
      : location.pathname.startsWith("/campaigns/")
        ? "Campaign"
        : "Campaigns";

  return (
    <div className="min-h-dvh">
      <div className="mx-auto grid min-h-dvh max-w-7xl grid-cols-12 gap-6 p-6">
        <aside className="col-span-12 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-white/3 shadow-card md:col-span-4 lg:col-span-3">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-xl tracking-tight text-white">AI Growth Copilot</div>
                <div className="mt-1 text-xs text-white/50">UMKM Marketing Studio</div>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-caramel-500/70 via-caramel-300/40 to-mint-300/30 shadow-glow" />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <NavLink
                to="/campaigns"
                className={({ isActive }) =>
                  [
                    "rounded-2xl px-4 py-3 text-sm transition",
                    isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/7 hover:text-white",
                  ].join(" ")
                }
              >
                Campaigns
              </NavLink>
              <NavLink
                to="/campaigns/new"
                className={({ isActive }) =>
                  [
                    "rounded-2xl px-4 py-3 text-sm transition",
                    isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/7 hover:text-white",
                  ].join(" ")
                }
              >
                New Campaign
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  [
                    "rounded-2xl px-4 py-3 text-sm transition",
                    isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/7 hover:text-white",
                  ].join(" ")
                }
              >
                Settings
              </NavLink>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Chip label="API" value={api.replace(/^https?:\/\//, "")} />
              <Chip label="Key" value={shortKey} />
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="p-5 text-xs leading-relaxed text-white/55">
            <div className="font-medium text-white/75">Tips</div>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Upload foto produk yang terang dan close-up.</li>
              <li>Storyboard akan berhenti dulu untuk approval.</li>
              <li>PixVerse membutuhkan login device flow.</li>
            </ul>
          </div>
        </aside>

        <main className="col-span-12 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/7 to-white/3 shadow-card md:col-span-8 lg:col-span-9">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <div className="font-display text-2xl tracking-tight">{title}</div>
              <div className="mt-1 text-sm text-white/55">Generate paket kampanye end-to-end dalam satu alur.</div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                Polling progres dari backend
              </div>
            </div>
          </div>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

