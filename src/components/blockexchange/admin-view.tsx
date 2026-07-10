"use client";

/**
 * BlockExchange — Admin Panel view.
 *
 * Rendered by parent page.tsx when `view === "admin"`. The parent provides
 * <Navbar /> above and <Footer /> below; this component renders
 * <main className="flex-1 pt-20 pb-10 bx-fade-in">.
 *
 * Layout:
 *  - 403 guard: if !user or user.role !== "admin", show a centered access
 *    denied glass card with a "Back to Home" button.
 *  - Two-column grid: sidebar (260px) + active section.
 *  - Title bar above the active section: section title, "Sync" button,
 *    admin user badge.
 *
 * The 10 sections live under ./admin/*.tsx. Three of them (Dashboard, Users,
 * Trades) fetch real data from /api/admin/{stats,users,trades}; the rest are
 * UI-only with mock data. All admin actions surface a "" toast.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-store";

import { AdminSidebar } from "./admin/sidebar";
import { AdminDashboard } from "./admin/dashboard";
import { AdminUsers } from "./admin/users";
import { AdminWallet } from "./admin/wallet";
import { AdminTrades } from "./admin/trades";
import { AdminMarket } from "./admin/market";
import { AdminPayments } from "./admin/payments";
import { AdminKyc } from "./admin/kyc";
import { AdminMessages } from "./admin/messages";
import { AdminTradeControl } from "./admin/trade-control";
import { AdminMessaging } from "./admin/messaging";
import { AdminReports } from "./admin/reports";
import { AdminSecurity } from "./admin/security";
import { AdminSettings } from "./admin/settings";
import type { AdminSection } from "./admin/shared";

const SECTION_META: Record<AdminSection, { title: string; description: string }> = {
  dashboard: { title: "Dashboard", description: "Platform overview at a glance" },
  users: { title: "User Management", description: "Accounts, KYC, and access" },
  wallet: { title: "Wallet Management", description: "Balances, deposits & withdrawals" },
  trades: { title: "Trade Management", description: "Live trades and trading config" },
  "trade-control": { title: "Trade Control", description: "Control whether trades win or lose" },
  market: { title: "Market Management", description: "Tradable pairs and pricing feed" },
  payments: { title: "Payments", description: "Banks, cards, gateways, and manual ops" },
  kyc: { title: "KYC Verifications", description: "Review identity documents" },
  messages: { title: "Customer Messages", description: "Support chat with customers" },
  messaging: { title: "Broadcast", description: "Broadcast, push, email, and popups" },
  reports: { title: "Reports", description: "Aggregated analytics and exports" },
  security: { title: "Security", description: "2FA, roles, IP whitelist, audit logs" },
  settings: { title: "Settings", description: "General, trading, SEO, SMTP, SMS, API keys" },
};

export function AdminView() {
  const { user, navigate, logout } = useAuth();
  const [section, setSection] = useState<AdminSection>("dashboard");
  // Bump on "Sync" click to trigger refetch in real-data sections.
  const [syncTick, setSyncTick] = useState(0);

  // ---- 403 guard ---- SUPER_ADMIN only
  if (!user || user.role !== "SUPER_ADMIN") {
    return (
      <main className="flex-1 pt-20 pb-10 bx-fade-in min-h-[calc(100vh-5rem)]">
        <SonnerToaster position="top-right" richColors />
        <div className="mx-auto max-w-md px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bx-glass rounded-2xl p-10 flex flex-col items-center text-center bx-glow"
          >
            <div className="relative w-20 h-20 mb-5">
              <div className="absolute inset-0 rounded-full bg-[#ff3b30]/20 blur-xl" />
              <div className="relative w-20 h-20 rounded-full bg-[#ff3b30]/15 ring-1 ring-[#ff3b30]/40 flex items-center justify-center">
                <Lock className="w-9 h-9 text-[#ff3b30]" />
              </div>
            </div>
            <div className="text-[#ff3b30] text-xs font-semibold uppercase tracking-[0.2em] mb-2">
              403 · Access Denied
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Super Admin access required</h1>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              You don&apos;t have permission to view this panel. Sign in with a Super Admin account to manage the BlockExchange platform.
            </p>
            <Button
              className="bg-gradient-to-r from-[#2196F3] to-[#0D47A1] text-white w-full"
              onClick={() => navigate("admin-login")}
            >
              Staff Login
            </Button>
            <div className="mt-4 text-xs text-muted-foreground">
              Contact your system administrator for staff account access.
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  const meta = SECTION_META[section];

  const handleSync = () => {
    setSyncTick((t) => t + 1);
    toast.success("Synced with server", { description: "Dashboard data refreshed" });
  };

  return (
    <main className="flex-1 pt-20 pb-10 bx-fade-in" style={{ background: "#FFFFFF", minHeight: "calc(100vh - 5rem)" }}>
      <SonnerToaster position="top-right" richColors />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar */}
          <AdminSidebar
            active={section}
            onSelect={setSection}
            onBackToSite={() => navigate("home")}
            onLogout={() => {
              logout();
              navigate("home");
            }}
          />

          {/* Right column */}
          <div className="min-w-0">
            {/* Title bar — matching screenshot theme */}
            <div className="rounded-lg p-4 mb-5 flex flex-wrap items-center justify-between gap-3" style={{ background: "#F8F9FA", border: "1px solid #E9ECEF", borderRadius: "8px" }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#4A90E2" }}>
                  <ShieldCheck className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold truncate" style={{ color: "#333333" }}>{meta.title}</h1>
                  <p className="text-xs truncate" style={{ color: "#6C757D" }}>{meta.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  style={{ color: "#6C757D", borderColor: "#E9ECEF", background: "#FFFFFF" }}
                  title="Re-fetch data from server"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sync
                </Button>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#E9ECEF" }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#6F42C1" }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-xs leading-tight">
                    <div className="font-medium" style={{ color: "#333333" }}>{user.name}</div>
                    <div className="uppercase tracking-wider text-[10px]" style={{ color: "#4A90E2" }}>Administrator</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active section */}
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {section === "dashboard" && <AdminDashboard userId={user.id} syncTick={syncTick} />}
              {section === "users" && <AdminUsers userId={user.id} syncTick={syncTick} />}
              {section === "wallet" && <AdminWallet />}
              {section === "trades" && <AdminTrades userId={user.id} syncTick={syncTick} />}
              {section === "trade-control" && <AdminTradeControl userId={user.id} />}
              {section === "market" && <AdminMarket />}
              {section === "payments" && <AdminPayments />}
              {section === "kyc" && <AdminKyc userId={user.id} syncTick={syncTick} />}
              {section === "messages" && <AdminMessages userId={user.id} />}
              {section === "messaging" && <AdminMessaging />}
              {section === "reports" && <AdminReports />}
              {section === "security" && <AdminSecurity />}
              {section === "settings" && <AdminSettings />}
            </motion.div>

            {/* Footer note */}
            <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
              <Badge variant="secondary" className="font-mono">BlockExchange Admin Panel v1.0</Badge>
              <span>All actions are logged to the audit trail.</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
