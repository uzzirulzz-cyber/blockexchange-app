"use client";

/**
 * BlockExchange admin — sidebar navigation.
 *
 * Shows the logo + "Admin Panel" subtitle, a grouped list of 10 nav items
 * (icon + label) with the active item highlighted, and a footer with
 * "Back to Site" + Logout buttons.
 *
 * On mobile (< lg) the sidebar collapses into a horizontally scrollable pill
 * bar so the panel is still usable on small screens.
 */

import {
  LayoutDashboard,
  Users,
  Wallet,
  CandlestickChart,
  Coins,
  CreditCard,
  Megaphone,
  BarChart3,
  ShieldCheck,
  Settings as SettingsIcon,
  LogOut,
  ArrowLeft,
  IdCard,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/blockexchange/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AdminSection } from "./shared";

interface NavItem {
  id: AdminSection;
  label: string;
  icon: LucideIcon;
  group: "Overview" | "Operations" | "System";
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { id: "users", label: "User Management", icon: Users, group: "Operations" },
  { id: "wallet", label: "Wallet Management", icon: Wallet, group: "Operations" },
  { id: "trades", label: "Trade Management", icon: CandlestickChart, group: "Operations" },
  { id: "trade-control", label: "Trade Control", icon: SettingsIcon, group: "Operations" },
  { id: "market", label: "Market Management", icon: Coins, group: "Operations" },
  { id: "payments", label: "Payments", icon: CreditCard, group: "Operations" },
  { id: "kyc", label: "KYC Verifications", icon: IdCard, group: "Operations" },
  { id: "messages", label: "Customer Messages", icon: MessageCircle, group: "Operations" },
  { id: "messaging", label: "Broadcast", icon: Megaphone, group: "Operations" },
  { id: "reports", label: "Reports", icon: BarChart3, group: "System" },
  { id: "security", label: "Security", icon: ShieldCheck, group: "System" },
  { id: "settings", label: "Settings", icon: SettingsIcon, group: "System" },
];

const GROUPS: NavItem["group"][] = ["Overview", "Operations", "System"];

interface SidebarProps {
  active: AdminSection;
  onSelect: (id: AdminSection) => void;
  onBackToSite: () => void;
  onLogout: () => void;
}

export function AdminSidebar({ active, onSelect, onBackToSite, onLogout }: SidebarProps) {
  return (
    <aside className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)]">
      {/* Desktop sidebar — dark theme matching screenshot (#1E1E2E) */}
      <div className="hidden lg:flex flex-col rounded-lg p-4 h-full" style={{ background: "#1E1E2E", borderRadius: "8px" }}>
        <div className="flex items-center gap-3 px-2 pb-4 mb-2" style={{ borderBottom: "1px solid #2A2A3E" }}>
          <Logo size={32} tagline={false} />
          <div>
            <div className="text-sm font-bold leading-tight text-white">Admin Panel</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "#FFFFFF80" }}>BlockExchange</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto bx-scroll -mr-2 pr-2 space-y-4">
          {GROUPS.map((group) => {
            const items = NAV_ITEMS.filter((i) => i.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF60" }}>
                  {group}
                </div>
                <div className="space-y-1">
                  {items.map((item) => {
                    const isActive = active === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          background: isActive ? "#2A2A3E" : "transparent",
                          color: isActive ? "#FFFFFF" : "#FFFFFF80",
                          borderLeft: isActive ? "2px solid #4A90E2" : "2px solid transparent",
                        }}
                      >
                        <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? "#4A90E2" : "#FFFFFF80" }} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="pt-4 mt-4 space-y-2" style={{ borderTop: "1px solid #2A2A3E" }}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            style={{ color: "#FFFFFF80" }}
            onClick={onBackToSite}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Site
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            style={{ color: "#E74C3C" }}
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile horizontal pill bar */}
      <div className="lg:hidden -mx-4 px-4 mb-4">
        <div className="bx-glass rounded-xl p-2 flex items-center gap-1 overflow-x-auto bx-scroll">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  isActive
                    ? "bg-[#0ea5ff]/15 text-[#0ea5ff] ring-1 ring-[#0ea5ff]/30"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">{item.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
