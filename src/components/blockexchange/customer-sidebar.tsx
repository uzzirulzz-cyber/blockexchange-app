"use client";

/**
 * BlockExchange — Customer Desktop Sidebar.
 *
 * Shows on lg+ screens only (hidden on mobile where MobileTabBar is used).
 * Provides vertical navigation for all customer views.
 * Dark theme matching the iPhone aesthetic.
 */

import { useAuth, type View } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import {
  Home, BarChart3, CandlestickChart, Wallet as WalletIcon,
  User as UserIcon, Star, ArrowDownToLine, ArrowUpFromLine,
  History, Bell, Settings as SettingsIcon, ShieldCheck,
  MessageCircle,
} from "lucide-react";

const NAV_GROUPS: { label: string; items: { label: string; view: View; icon: any; requiresAuth?: boolean }[] }[] = [
  {
    label: "Main",
    items: [
      { label: "Home", view: "home", icon: Home },
      { label: "Markets", view: "markets", icon: BarChart3 },
      { label: "Trade", view: "trade", icon: CandlestickChart, requiresAuth: true },
      { label: "Wallet", view: "wallet", icon: WalletIcon, requiresAuth: true },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Deposit", view: "deposit", icon: ArrowDownToLine, requiresAuth: true },
      { label: "Withdraw", view: "withdraw", icon: ArrowUpFromLine, requiresAuth: true },
      { label: "Assets", view: "assets", icon: WalletIcon, requiresAuth: true },
      { label: "Watchlist", view: "watchlist", icon: Star, requiresAuth: true },
      { label: "History", view: "history", icon: History, requiresAuth: true },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", view: "profile", icon: UserIcon, requiresAuth: true },
      { label: "Messages", view: "messages", icon: MessageCircle, requiresAuth: true },
      { label: "Notifications", view: "notifications", icon: Bell, requiresAuth: true },
      { label: "KYC Verify", view: "kyc", icon: ShieldCheck, requiresAuth: true },
      { label: "Settings", view: "settings", icon: SettingsIcon, requiresAuth: true },
    ],
  },
];

export function CustomerSidebar() {
  const { view, navigate, user } = useAuth();

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-16 self-start max-h-[calc(100vh-4rem)] overflow-y-auto bx-scroll">
      <div className="rounded-2xl p-4" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8E8E93" }}>
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = view === item.view;
                const blocked = item.requiresAuth && !user;
                const Icon = item.icon;
                return (
                  <button
                    key={item.view}
                    onClick={() => navigate(item.view)}
                    disabled={blocked}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      isActive ? "text-white" : "",
                      blocked ? "opacity-40" : ""
                    )}
                    style={{
                      background: isActive ? "rgba(10,132,255,0.15)" : "transparent",
                      color: isActive ? "#0A84FF" : "#8E8E93",
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? "#0A84FF" : "#8E8E93" }} />
                    <span className="truncate">{item.label}</span>
                    {blocked && <span className="ml-auto text-[10px]">🔒</span>}
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0A84FF]" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
