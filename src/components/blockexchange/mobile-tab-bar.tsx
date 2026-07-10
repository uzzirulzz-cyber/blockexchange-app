"use client";

/**
 * BlockExchange — Mobile bottom tab bar.
 *
 * Fixed at the bottom of the screen on mobile only (hidden on lg+).
 * Shows 5 primary tabs + a "More" button that opens a sheet with
 * all secondary navigation items.
 *
 * All items are fully clickable with proper touch target sizes (min 44px).
 */

import { useState } from "react";
import { useAuth, type View } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import {
  Home, BarChart3, CandlestickChart, Wallet as WalletIcon,
  User as UserIcon, MoreHorizontal, Star, ArrowDownToLine,
  ArrowUpFromLine, History, Bell, Settings as SettingsIcon,
  LogOut, X, ShieldCheck, MessageCircle,
} from "lucide-react";

const PRIMARY_TABS: { label: string; view: View; icon: any; requiresAuth?: boolean }[] = [
  { label: "Home", view: "home", icon: Home },
  { label: "Markets", view: "markets", icon: BarChart3 },
  { label: "Trade", view: "trade", icon: CandlestickChart, requiresAuth: true },
  { label: "Wallet", view: "wallet", icon: WalletIcon, requiresAuth: true },
  { label: "Profile", view: "profile", icon: UserIcon, requiresAuth: true },
];

const MORE_TABS: { label: string; view: View; icon: any; requiresAuth?: boolean }[] = [
  { label: "Messages", view: "messages", icon: MessageCircle, requiresAuth: true },
  { label: "KYC Verify", view: "kyc", icon: ShieldCheck, requiresAuth: true },
  { label: "Watchlist", view: "watchlist", icon: Star, requiresAuth: true },
  { label: "Assets", view: "assets", icon: WalletIcon, requiresAuth: true },
  { label: "Deposit", view: "deposit", icon: ArrowDownToLine, requiresAuth: true },
  { label: "Withdraw", view: "withdraw", icon: ArrowUpFromLine, requiresAuth: true },
  { label: "History", view: "history", icon: History, requiresAuth: true },
  { label: "Notifications", view: "notifications", icon: Bell, requiresAuth: true },
  { label: "Settings", view: "settings", icon: SettingsIcon, requiresAuth: true },
];

export function MobileTabBar() {
  const { view, navigate, user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const go = (v: View) => {
    navigate(v);
    setMoreOpen(false);
  };

  return (
    <>
      {/* Bottom tab bar — mobile only */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bx-glass border-t border-white/10"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch justify-around h-16">
          {PRIMARY_TABS.map((tab) => {
            const active = view === tab.view;
            const blocked = tab.requiresAuth && !user;
            const Icon = tab.icon;
            return (
              <button
                key={tab.view}
                onClick={() => go(tab.view)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors relative",
                  active ? "text-[#0ea5ff]" : "text-muted-foreground hover:text-white"
                )}
                aria-label={tab.label}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {blocked && (
                  <span className="absolute top-1.5 right-1/4 text-[8px] text-[#0ea5ff]">🔒</span>
                )}
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#0ea5ff]" />
                )}
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors",
              moreOpen ? "text-[#0ea5ff]" : "text-muted-foreground hover:text-white"
            )}
            aria-label="More"
          >
            <MoreHorizontal className="w-5 h-5" strokeWidth={2} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* More sheet — slides up from bottom */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sheet */}
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bx-glass rounded-t-3xl border-t border-white/10 pb-safe"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">More</h2>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-lg hover:bg-white/5"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Grid of items */}
            <div className="grid grid-cols-4 gap-3 p-5">
              {MORE_TABS.map((tab) => {
                const active = view === tab.view;
                const blocked = tab.requiresAuth && !user;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.view}
                    onClick={() => go(tab.view)}
                    disabled={blocked}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl transition-colors min-h-[80px]",
                      active
                        ? "bg-[#0ea5ff]/15 text-[#0ea5ff]"
                        : "bg-white/[0.02] text-muted-foreground hover:bg-white/5 hover:text-white",
                      blocked && "opacity-40"
                    )}
                  >
                    <Icon className="w-6 h-6" strokeWidth={2} />
                    <span className="text-[10px] font-medium text-center leading-tight">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* User section at bottom */}
            {user && (
              <div className="px-5 pb-5 border-t border-white/5 pt-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bx-blue-gradient flex items-center justify-center text-sm font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.role === "CUSTOMER" ? `UID ${user.uid}` : user.role}
                    </div>
                  </div>
                  {user.role === "CUSTOMER" && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Balance</div>
                      <div className="text-sm font-semibold text-[#00c853]">
                        {(Number(user.balance) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMoreOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] hover:bg-[#ff3b30]/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
