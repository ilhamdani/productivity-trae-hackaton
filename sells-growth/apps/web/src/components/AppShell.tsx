import { type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import Button from "./Button";
import Input from "./Input";

function Icon({
  children,
}: {
  children: ReactNode;
}) {
  return <span className="grid h-9 w-9 place-items-center rounded-none bg-slate-50 text-slate-700">{children}</span>;
}

export default function AppShell() {
  const location = useLocation();
  const title =
    location.pathname.startsWith("/campaigns/new")
      ? "New Campaign"
      : location.pathname.startsWith("/campaigns/")
        ? "Campaign"
        : location.pathname.startsWith("/calendar")
          ? "Content Calendar"
          : location.pathname.startsWith("/marketplace-import")
            ? "Marketplace Import"
          : location.pathname.startsWith("/inventory")
            ? "Inventory"
            : location.pathname.startsWith("/master-product")
              ? "Master Product"
            : "Campaigns";

  return (
    <div className="min-h-dvh">
      <div className="flex min-h-dvh w-full max-w-none gap-0 p-0">
        <aside className="flex w-[88px] shrink-0 flex-col items-center gap-2 border border-slate-200/70 bg-white p-3 shadow-card">
          <div className="grid h-12 w-12 place-items-center rounded-none bg-gradient-to-br from-leaf-500 to-leaf-700 text-white shadow-glow">
            <span className="font-display text-lg leading-none">AG</span>
          </div>

          <div className="mt-1 text-center">
            <div className="text-[11px] font-semibold tracking-tight text-slate-800">Growth</div>
            <div className="text-[10px] text-slate-500">Copilot</div>
          </div>

          <div className="mt-2 h-px w-full bg-slate-100" />

          <nav className="flex w-full flex-1 flex-col items-center gap-2">
            <NavLink
              to="/campaigns"
              className={({ isActive }) =>
                [
                  "group grid h-11 w-11 place-items-center rounded-none transition",
                  isActive ? "bg-leaf-50 text-leaf-700" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                ].join(" ")
              }
            >
              <Icon>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 11.5 12 4l8 7.5V20a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 20v-8.5Z" />
                  <path d="M9.5 21V14h5v7" />
                </svg>
              </Icon>
            </NavLink>

            <NavLink
              to="/campaigns/new"
              className={({ isActive }) =>
                [
                  "group grid h-11 w-11 place-items-center rounded-none transition",
                  isActive ? "bg-leaf-50 text-leaf-700" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                ].join(" ")
              }
            >
              <Icon>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </Icon>
            </NavLink>

            <NavLink
              to="/master-product"
              className={({ isActive }) =>
                [
                  "group grid h-11 w-11 place-items-center rounded-none transition",
                  isActive ? "bg-leaf-50 text-leaf-700" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                ].join(" ")
              }
            >
              <Icon>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M7 7h10v10H7z" />
                  <path d="M4 10V6a2 2 0 0 1 2-2h4" />
                  <path d="M20 14v4a2 2 0 0 1-2 2h-4" />
                </svg>
              </Icon>
            </NavLink>

            <NavLink
              to="/inventory"
              className={({ isActive }) =>
                [
                  "group grid h-11 w-11 place-items-center rounded-none transition",
                  isActive ? "bg-leaf-50 text-leaf-700" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                ].join(" ")
              }
            >
              <Icon>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M7 20h10" />
                  <path d="M6.5 20v-9.5L12 4l5.5 6.5V20" />
                  <path d="M9 14h6" />
                </svg>
              </Icon>
            </NavLink>

            <NavLink
              to="/calendar"
              className={({ isActive }) =>
                [
                  "group grid h-11 w-11 place-items-center rounded-none transition",
                  isActive ? "bg-leaf-50 text-leaf-700" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                ].join(" ")
              }
            >
              <Icon>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M7 3v3" />
                  <path d="M17 3v3" />
                  <path d="M4 8h16" />
                  <path d="M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
                </svg>
              </Icon>
            </NavLink>

            <NavLink
              to="/marketplace-import"
              className={({ isActive }) =>
                [
                  "group grid h-11 w-11 place-items-center rounded-none transition",
                  isActive ? "bg-leaf-50 text-leaf-700" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                ].join(" ")
              }
            >
              <Icon>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3v10" />
                  <path d="M8 9l4 4 4-4" />
                  <path d="M4 17v3h16v-3" />
                </svg>
              </Icon>
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                [
                  "group grid h-11 w-11 place-items-center rounded-none transition",
                  isActive ? "bg-leaf-50 text-leaf-700" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                ].join(" ")
              }
            >
              <Icon>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
                  <path d="M19.4 15a8.6 8.6 0 0 0 .1-1l2-1.2-2-3.4-2.3.6a7.7 7.7 0 0 0-1.7-1L15 6h-6l-.5 2.4a7.7 7.7 0 0 0-1.7 1l-2.3-.6-2 3.4L4.6 14a8.6 8.6 0 0 0 0 2l-2 1.2 2 3.4 2.3-.6a7.7 7.7 0 0 0 1.7 1L9 22h6l.5-2.4a7.7 7.7 0 0 0 1.7-1l2.3.6 2-3.4L19.4 15Z" />
                </svg>
              </Icon>
            </NavLink>
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200/70 bg-white px-4 py-3 shadow-card">
            <div className="flex min-w-[220px] flex-1 items-center gap-3">
              <div className="text-sm font-semibold text-slate-900">{title}</div>
              <div className="hidden h-5 w-px bg-slate-200 sm:block" />
              <div className="hidden text-xs text-slate-500 sm:block">UMKM Marketing Studio</div>
            </div>
            <div className="flex flex-1 items-center justify-end gap-3">
              <div className="hidden max-w-[360px] flex-1 lg:block">
                <Input placeholder="Search campaigns…" />
              </div>
              <NavLink
                to="/campaigns/new"
                className="inline-flex items-center justify-center gap-2 rounded-none bg-gradient-to-b from-leaf-500 to-leaf-700 px-3 py-1.5 text-sm font-medium text-white shadow-glow transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-leaf-300/45"
              >
                + New Campaign
              </NavLink>
              <div className="hidden items-center gap-2 md:flex">
                <div className="h-9 w-9 rounded-none bg-slate-100" />
                <div className="text-xs leading-tight">
                  <div className="font-medium text-slate-800">Profile</div>
                  <div className="text-slate-500">Admin</div>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

