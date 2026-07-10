"use client";

/**
 * BlockExchange admin — shared types + small reusable UI components.
 *
 * Exported:
 *  - Types: AdminStats, AdminUser, AdminTrade, AdminSection
 *  - Components: StatCard, SectionHeader, PlaceholderCard, StatusBadge,
 *                ResultBadge, DirectionBadge, Skeleton rows.
 */

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ------------------------------ section ids ------------------------------ */

export type AdminSection =
  | "dashboard"
  | "users"
  | "wallet"
  | "trades"
  | "trade-control"
  | "market"
  | "payments"
  | "kyc"
  | "messages"
  | "messaging"
  | "reports"
  | "security"
  | "settings";

/* ------------------------------ API types -------------------------------- */
/* Match the actual responses from /api/admin/{stats,users,trades} exactly.   */

export interface RevenuePoint {
  date: string;
  revenue: number;
}

export interface CoinVolumePoint {
  symbol: string;
  count: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTrades: number;
  activeTrades: number;
  revenue: number;
  totalDeposits: number;
  totalWithdrawals: number;
  todayDeposits: number;
  todayWithdrawals: number;
  revenueSeries: RevenuePoint[];
  coinVolume: CoinVolumePoint[];
}

export interface AdminUser {
  id: string;
  uid?: string;
  email: string;
  name: string;
  role: "user" | "admin" | string;
  balance: number;
  frozenFunds?: number;
  vipLevel: number;
  country?: string;
  phone?: string;
  kycStatus?: string;
  status?: string;
  frozen: boolean;
  walletLocked?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  tradesCount: number;
}

export interface AdminTrade {
  id: string;
  userId: string;
  symbol: string;
  direction: "UP" | "DOWN" | string;
  duration: number;
  amount: number;
  entryPrice: number;
  exitPrice: number | null;
  payoutRate: number;
  result: "PENDING" | "WIN" | "LOSE" | string;
  profit: number;
  status: "ACTIVE" | "SETTLED" | "CANCELLED" | string;
  expiresAt: string;
  createdAt: string;
  settledAt: string | null;
  user: { id: string; name: string; email: string };
}

/* ------------------------------ Stat card -------------------------------- */

export type AccentColor =
  | "blue"
  | "emerald"
  | "red"
  | "amber"
  | "purple"
  | "silver";

const ACCENT_MAP: Record<AccentColor, { bg: string; text: string; ring: string }> = {
  blue: { bg: "bg-[#0ea5ff]/15", text: "text-[#0ea5ff]", ring: "ring-[#0ea5ff]/30" },
  emerald: { bg: "bg-[#00c853]/15", text: "text-[#00c853]", ring: "ring-[#00c853]/30" },
  red: { bg: "bg-[#ff3b30]/15", text: "text-[#ff3b30]", ring: "ring-[#ff3b30]/30" },
  amber: { bg: "bg-[#f5a623]/15", text: "text-[#f5a623]", ring: "ring-[#f5a623]/30" },
  purple: { bg: "bg-[#c084fc]/15", text: "text-[#c084fc]", ring: "ring-[#c084fc]/30" },
  silver: { bg: "bg-slate-300/15", text: "text-slate-200", ring: "ring-slate-300/30" },
};

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  accent?: AccentColor;
  delta?: number; // percent vs yesterday (positive = up)
  sublabel?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  accent = "blue",
  delta,
  sublabel,
}: StatCardProps) {
  const c = ACCENT_MAP[accent];
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="bx-glass rounded-xl p-5 relative overflow-hidden group">
      <div className={cn("absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity", c.bg)} />
      <div className="flex items-start justify-between relative">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center ring-1", c.bg, c.text, c.ring)}>
          <Icon className="w-5 h-5" />
        </div>
        {typeof delta === "number" && (
          <div className={cn("flex items-center gap-0.5 text-xs font-medium", positive ? "text-[#00c853]" : "text-[#ff3b30]")}>
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {positive ? "+" : ""}{delta.toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-3 relative">
        <div className="text-2xl font-bold tracking-tight text-white tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        {sublabel && <div className="text-[10px] text-muted-foreground/70 mt-1">{sublabel}</div>}
      </div>
    </div>
  );
}

/* ------------------------------ Section header --------------------------- */

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}

export function SectionHeader({ title, description, action, icon: Icon }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-[#0ea5ff]/15 text-[#0ea5ff] ring-1 ring-[#0ea5ff]/30 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

/* ------------------------------ Placeholder ------------------------------ */

export function PlaceholderCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="bx-glass rounded-xl p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
      <div className="w-14 h-14 rounded-xl bg-[#0ea5ff]/10 text-[#0ea5ff] ring-1 ring-[#0ea5ff]/30 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
    </div>
  );
}

/* ------------------------------ Badges ----------------------------------- */

export function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  if (s === "ACTIVE" || s === "APPROVED" || s === "OPERATIONAL" || s === "LIVE" || s === "ENABLED") {
    return <Badge className="bg-[#00c853]/15 text-[#00c853] border-[#00c853]/30 hover:bg-[#00c853]/20">{s}</Badge>;
  }
  if (s === "FROZEN" || s === "REJECTED" || s === "SUSPENDED" || s === "DISABLED" || s === "CANCELLED") {
    return <Badge className="bg-[#ff3b30]/15 text-[#ff3b30] border-[#ff3b30]/30 hover:bg-[#ff3b30]/20">{s}</Badge>;
  }
  if (s === "PENDING" || s === "MAINTENANCE") {
    return <Badge className="bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/30 hover:bg-[#f5a623]/20">{s}</Badge>;
  }
  return <Badge variant="secondary">{s}</Badge>;
}

export function ResultBadge({ result }: { result: string }) {
  const r = result.toUpperCase();
  if (r === "WIN") return <Badge className="bg-[#00c853]/15 text-[#00c853] border-[#00c853]/30">WIN</Badge>;
  if (r === "LOSE") return <Badge className="bg-[#ff3b30]/15 text-[#ff3b30] border-[#ff3b30]/30">LOSE</Badge>;
  return <Badge className="bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/30">PENDING</Badge>;
}

export function DirectionBadge({ direction }: { direction: string }) {
  const d = direction.toUpperCase();
  if (d === "UP") return <Badge className="bg-[#00c853]/15 text-[#00c853] border-[#00c853]/30">▲ UP</Badge>;
  return <Badge className="bg-[#ff3b30]/15 text-[#ff3b30] border-[#ff3b30]/30">▼ DOWN</Badge>;
}

/* ------------------------------ Motion wrapper --------------------------- */

export function SectionShell({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-6"
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------ Skeleton --------------------------------- */

export function RowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-3 flex-1 rounded bg-white/5 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bx-glass rounded-xl p-5">
      <div className="h-10 w-10 rounded-lg bg-white/5 animate-pulse mb-3" />
      <div className="h-6 w-24 rounded bg-white/5 animate-pulse mb-2" />
      <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
    </div>
  );
}

/* ------------------------------ Helpers ---------------------------------- */

export function fmtMoney(n: number, digits = 2): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

export function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}
