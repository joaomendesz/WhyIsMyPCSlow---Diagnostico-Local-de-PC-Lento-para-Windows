import {
  Activity,
  Gauge,
  History,
  MonitorCog,
  Settings,
  Stethoscope,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", icon: Gauge },
  { to: "/monitor", label: "Monitor", icon: Activity },
  { to: "/diagnostics", label: "Diagnostico", icon: Stethoscope },
  { to: "/history", label: "Historico", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="border-b border-line bg-ink text-white lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col gap-5 px-4 py-4 lg:px-5 lg:py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-teal">
            <MonitorCog aria-hidden size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-5">WhyIsMyPCSlow</h1>
            <p className="truncate text-xs text-white/65">Descubra o que esta lento.</p>
          </div>
        </div>

        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  [
                    "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                    isActive
                      ? "bg-white text-ink shadow-soft"
                      : "text-white/76 hover:bg-white/10 hover:text-white",
                  ].join(" ")
                }
              >
                <Icon aria-hidden size={18} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto hidden rounded-md border border-white/10 p-3 text-xs leading-5 text-white/65 lg:block">
          Local-first. Sem shell, filesystem ou SQL genericos expostos ao frontend.
        </div>
      </div>
    </aside>
  );
}
