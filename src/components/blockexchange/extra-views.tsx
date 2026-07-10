"use client";

/**
 * BlockExchange — extra storefront views.
 *
 * These views extend the storefront navigation beyond the original
 * home/trade/wallet/admin set. Each is functional and wired to real
 * APIs where applicable.
 *
 * Exports:
 *  - MarketsView      : full market browser with search + filters + categories
 *  - WatchlistView    : user's favorited coins (localStorage)
 *  - AssetsView       : holdings breakdown by coin
 *  - DepositView      : dedicated deposit flow
 *  - WithdrawView     : dedicated withdraw flow
 *  - HistoryView      : trading + transaction history
 *  - ProfileView      : user profile editor
 *  - NotificationsView: notification center
 *  - SettingsView     : user settings
 */

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-store";
import { COINS, formatPrice, type Coin } from "@/lib/market-data";
import { getVipLabel, getVipColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Toaster as SonnerToaster, toast } from "sonner";
import {
  Search, Star, TrendingUp, TrendingDown, ArrowDownToLine, ArrowUpFromLine,
  Wallet as WalletIcon, History as HistoryIcon, User as UserIcon, Bell,
  Settings as SettingsIcon, Loader2, Copy, Check, Snowflake, Shield, Mail,
  Phone, Globe, Lock, Eye, EyeOff, Save, LogOut, Filter, Camera,
  KeyRound, AlertCircle, ArrowLeftRight, RotateCcw, MessageCircle,
  Plus, CreditCard, ShieldCheck,
} from "lucide-react";
import { ALL_PAYMENT_METHODS } from "@/lib/fiat-countries";

/* ----------------------------- shared helpers ---------------------------- */

const WATCHLIST_KEY = "blockexchange-watchlist";

function useWatchlist() {
  const [list, setList] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(WATCHLIST_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const toggle = useCallback((symbol: string) => {
    setList((prev) => {
      const next = prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  return { list, toggle };
}

function useLivePrices() {
  const [prices, setPrices] = useState(
    COINS.map((c) => ({
      price: c.basePrice,
      change: (Math.random() - 0.45) * 8,
      sparkline: Array.from({ length: 12 }, () => c.basePrice * (0.97 + Math.random() * 0.06)),
    }))
  );
  useEffect(() => {
    const t = setInterval(() => {
      setPrices((prev) =>
        prev.map((p, i) => {
          const delta = (Math.random() - 0.5) * COINS[i].basePrice * 0.003;
          const newPrice = Math.max(p.price + delta, COINS[i].basePrice * 0.5);
          const newSpark = [...p.sparkline.slice(1), newPrice];
          const change = ((newPrice - newSpark[0]) / newSpark[0]) * 100;
          return { price: newPrice, change, sparkline: newSpark };
        })
      );
    }, 2500);
    return () => clearInterval(t);
  }, []);
  return prices;
}

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "featured", label: "Featured" },
  { id: "popular", label: "Popular" },
  { id: "defi", label: "DeFi" },
  { id: "stable", label: "Stablecoins" },
  { id: "layer1", label: "Layer 1" },
];

const COIN_CATEGORY: Record<string, string> = {
  BTC: "featured", ETH: "featured", SOL: "popular", BNB: "popular",
  DOGE: "popular", XRP: "popular", ADA: "layer1", TRX: "layer1",
};

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${30 - ((v - min) / range) * 28 - 1}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" className="w-20 h-6" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={up ? "#00c853" : "#ff3b30"}
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {label && <span className="ml-1.5">{label}</span>}
    </Button>
  );
}

/* =============================== MARKETS ================================== */

export function MarketsView() {
  const { navigate } = useAuth();
  const prices = useLivePrices();
  const { list: watchlist, toggle } = useWatchlist();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"price" | "change" | "name">("price");

  const filtered = useMemo(() => {
    let result = COINS.map((coin, i) => ({ coin, ...prices[i] }));
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (r) => r.coin.name.toLowerCase().includes(q) || r.coin.symbol.toLowerCase().includes(q)
      );
    }
    if (category !== "all") {
      result = result.filter((r) => COIN_CATEGORY[r.coin.symbol] === category);
    }
    result.sort((a, b) => {
      if (sortBy === "name") return a.coin.name.localeCompare(b.coin.name);
      if (sortBy === "change") return b.change - a.change;
      return b.price - a.price;
    });
    return result;
  }, [prices, query, category, sortBy]);

  return (
    <main className="flex-1 pt-14 pb-10 bg-black min-h-screen" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}>
      <SonnerToaster richColors position="top-center" />
      <div className="mx-auto max-w-2xl lg:max-w-4xl px-4">
        {/* iOS large title */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 pt-6">
          <h1 className="text-[34px] font-bold text-white tracking-tight">Markets</h1>
          <p className="text-sm mt-1" style={{ color: "#8E8E93" }}>
            Browse all tradable cryptocurrencies
          </p>
        </motion.div>

        {/* Search + filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bx-glass rounded-2xl p-4 mb-6 space-y-4"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or symbol (e.g. Bitcoin, BTC)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-white/5 border-white/10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  category === cat.id
                    ? "bg-[#0A84FF]/15 text-[#0A84FF] ring-1 ring-[#0ea5ff]/30"
                    : "bg-white/5 text-muted-foreground hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort by</span>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-32 h-8 bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a1428] border-white/10">
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="change">Change %</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Coin grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(({ coin, price, change, sparkline }, idx) => {
            const up = change >= 0;
            const watched = watchlist.includes(coin.symbol);
            return (
              <motion.div
                key={coin.symbol}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bx-glass rounded-2xl p-5 hover:bx-glow transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: coin.color }}
                    >
                      {coin.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{coin.symbol}</div>
                      <div className="text-xs text-muted-foreground">{coin.name}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(coin.symbol)}
                    className="p-1.5 rounded-lg hover:bg-white/5"
                    aria-label="Toggle watchlist"
                  >
                    <Star className={`w-4 h-4 ${watched ? "fill-[#f5a623] text-[#FF9F0A]" : "text-muted-foreground"}`} />
                  </button>
                </div>

                <div className="flex items-end justify-between mb-2">
                  <div>
                    <div className="text-2xl font-bold text-white tabular-nums">
                      ${formatPrice(price, coin.pair)}
                    </div>
                    <div className={`text-xs font-medium flex items-center gap-1 ${up ? "text-[#30D158]" : "text-[#FF453A]"}`}>
                      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {up ? "+" : ""}{change.toFixed(2)}%
                    </div>
                  </div>
                  <Sparkline data={sparkline} up={up} />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#30D158]/30 text-[#30D158] hover:bg-[#30D158]/10"
                    onClick={() => navigate("trade")}
                  >
                    Buy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#FF453A]/30 text-[#FF453A] hover:bg-[#FF453A]/10"
                    onClick={() => navigate("trade")}
                  >
                    Sell
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
            No coins match your search.
          </div>
        )}
      </div>
    </main>
  );
}

/* ============================== WATCHLIST ================================ */

export function WatchlistView() {
  const { navigate } = useAuth();
  const prices = useLivePrices();
  const { list, toggle } = useWatchlist();

  const watched = COINS.map((coin, i) => ({ coin, ...prices[i] })).filter((r) =>
    list.includes(r.coin.symbol)
  );

  return (
    <main className="flex-1 pt-14 pb-10 bg-black min-h-screen" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}>
      <SonnerToaster richColors position="top-center" />
      <div className="mx-auto max-w-2xl lg:max-w-4xl px-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 pt-6">
          <h1 className="text-[34px] font-bold text-white tracking-tight flex items-center gap-2">
            <Star className="w-7 h-7" style={{ color: '#FF9F0A', fill: '#FF9F0A' }} />
            Watchlist
          </h1>
          <p className="text-sm mt-1" style={{ color: "#8E8E93" }}>
            Coins you're tracking
          </p>
        </motion.div>

        {watched.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bx-glass rounded-2xl p-12 text-center"
          >
            <Star className="w-10 h-10 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold text-white mb-2">Your watchlist is empty</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Browse markets and tap the star icon to add coins here.
            </p>
            <Button onClick={() => navigate("markets")}>Browse Markets</Button>
          </motion.div>
        ) : (
          <div className="bx-glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] border-b border-white/5">
                <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="px-5 py-3">Coin</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-right">24h Change</th>
                  <th className="px-5 py-3 text-center">Chart</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {watched.map(({ coin, price, change, sparkline }) => {
                  const up = change >= 0;
                  return (
                    <tr key={coin.symbol} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: coin.color }}>
                            {coin.icon}
                          </div>
                          <div>
                            <div className="font-medium text-white">{coin.symbol}</div>
                            <div className="text-xs text-muted-foreground">{coin.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-white tabular-nums">
                        ${formatPrice(price, coin.pair)}
                      </td>
                      <td className={`px-5 py-4 text-right font-medium ${up ? "text-[#30D158]" : "text-[#FF453A]"}`}>
                        {up ? "+" : ""}{change.toFixed(2)}%
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          <Sparkline data={sparkline} up={up} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" onClick={() => navigate("trade")}>Trade</Button>
                          <Button size="sm" variant="ghost" onClick={() => toggle(coin.symbol)}>
                            <Star className="w-3.5 h-3.5 fill-[#f5a623] text-[#FF9F0A]" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

/* ================================ ASSETS ================================= */

export function AssetsView() {
  const { user, navigate, updateBalance } = useAuth();
  const prices = useLivePrices();

  if (!user) {
    return (
      <main className="flex-1 pt-20 flex items-center justify-center">
        <Button onClick={() => navigate("login")}>Please login</Button>
      </main>
    );
  }

  const balance = Number(user.balance) || 0;
  const frozen = Number(user.frozenFunds) || 0;
  const holdings = COINS.map((coin, i) => {
    const weight = [0.25, 0.18, 0.10, 0.08, 0.05, 0.03, 0.02, 0.02, 0.01, 0.01][i] || 0.01;
    const qty = (balance * 0.6 * weight) / prices[i].price;
    const value = qty * prices[i].price;
    return { coin, qty, value, price: prices[i].price, change: prices[i].change };
  })
    .filter((h) => h.value > 0.01)
    .sort((a, b) => b.value - a.value);

  const totalHoldings = holdings.reduce((s, h) => s + h.value, 0);
  const totalAssets = balance + frozen + totalHoldings;

  return (
    <main className="flex-1 pt-14 pb-10 bg-black min-h-screen" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}>
      <SonnerToaster richColors position="top-center" />
      <div className="mx-auto max-w-2xl lg:max-w-4xl px-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 pt-6">
          <h1 className="text-[34px] font-bold text-white tracking-tight">My Assets</h1>
          <p className="text-sm mt-1" style={{ color: "#8E8E93" }}>
            UID: <span className="font-mono" style={{ color: '#0A84FF' }}>{user.uid}</span>
          </p>
        </motion.div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bx-glass rounded-xl p-4">
            <div className="text-xs text-muted-foreground">Total Assets</div>
            <div className="text-xl font-bold text-white mt-1">${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bx-glass rounded-xl p-4">
            <div className="text-xs text-muted-foreground">Available Balance</div>
            <div className="text-xl font-bold text-[#30D158] mt-1">${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bx-glass rounded-xl p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Snowflake className="w-3 h-3" /> Frozen</div>
            <div className="text-xl font-bold text-[#FF453A] mt-1">${frozen.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bx-glass rounded-xl p-4">
            <div className="text-xs text-muted-foreground">Coin Holdings</div>
            <div className="text-xl font-bold text-white mt-1">${totalHoldings.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </motion.div>
        </div>

        {/* Holdings table */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bx-glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="font-semibold text-white">Coin Holdings</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                <th className="px-5 py-3">Coin</th>
                <th className="px-5 py-3 text-right">Quantity</th>
                <th className="px-5 py-3 text-right">Price</th>
                <th className="px-5 py-3 text-right">Value</th>
                <th className="px-5 py-3 text-right">24h</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(({ coin, qty, value, price, change }) => {
                const up = change >= 0;
                return (
                  <tr key={coin.symbol} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: coin.color }}>
                          {coin.icon}
                        </div>
                        <div>
                          <div className="font-medium text-white">{coin.symbol}</div>
                          <div className="text-xs text-muted-foreground">{coin.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-white tabular-nums">{qty.toFixed(6)}</td>
                    <td className="px-5 py-4 text-right text-white tabular-nums">${formatPrice(price, coin.pair)}</td>
                    <td className="px-5 py-4 text-right text-white font-medium tabular-nums">${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className={`px-5 py-4 text-right ${up ? "text-[#30D158]" : "text-[#FF453A]"}`}>
                      {up ? "+" : ""}{change.toFixed(2)}%
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button size="sm" variant="ghost" onClick={() => navigate("trade")}>Trade</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>

        {/* Reset Balance */}
        <button
          onClick={async () => {
            if (!confirm("Reset your balance to 0? This cannot be undone.")) return;
            try {
              const res = await fetch("/api/wallet/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": user.id },
                body: JSON.stringify({ confirm: true }),
              });
              const data = await res.json();
              if (!res.ok) { toast.error(data.error || "Reset failed"); return; }
              toast.success("Balance reset to 0");
              updateBalance(0);
              window.location.reload();
            } catch { toast.error("Network error"); }
          }}
          disabled={balance === 0 && frozen === 0}
          className="w-full mt-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-30"
          style={{ background: "rgba(255,69,58,0.1)", color: "#FF453A", border: "1px solid rgba(255,69,58,0.2)" }}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Balance to 0
        </button>
      </div>
    </main>
  );
}

/* =============================== DEPOSIT ================================= */

export function DepositView() {
  const { user, navigate, updateBalance } = useAuth();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("USDT_TRC20");
  const [loading, setLoading] = useState(false);

  if (!user) {
    return <main className="flex-1 pt-20 flex items-center justify-center"><Button onClick={() => navigate("login")}>Please login</Button></main>;
  }

  const methods = Object.entries(ALL_PAYMENT_METHODS).slice(0, 10);

  async function handleDeposit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user!.id },
        body: JSON.stringify({ amount: amt, method }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Deposit failed");
        return;
      }
      toast.success(`Deposit of ${amt} USDT submitted — pending approval`);
      updateBalance(Number(data.balance ?? user!.balance));
      setAmount("");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 pt-14 pb-10 bg-black min-h-screen" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}>
      <SonnerToaster richColors position="top-center" />
      <div className="mx-auto max-w-md lg:max-w-2xl px-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 pt-6">
          <h1 className="text-[34px] font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowDownToLine className="w-7 h-7" style={{ color: '#30D158' }} />
            Deposit
          </h1>
          <p className="text-sm mt-1" style={{ color: "#8E8E93" }}>
            Add funds to your account
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bx-glass rounded-2xl p-6 space-y-5">
          <div>
            <Label className="text-xs text-muted-foreground">Current Balance</Label>
            <div className="text-2xl font-bold text-[#30D158] mt-1">
              {(Number(user.balance) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a1428] border-white/10 max-h-60">
                {methods.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Amount (USDT)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 bg-white/5 border-white/10 text-2xl font-bold"
            />
            <div className="flex gap-2 mt-2">
              {[50, 100, 500, 1000].map((q) => (
                <button
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className="px-3 py-1 rounded-lg text-xs bg-white/5 text-muted-foreground hover:bg-[#0A84FF]/15 hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleDeposit}
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-[#00c853] to-[#00a040] hover:opacity-90 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowDownToLine className="w-4 h-4 mr-2" />}
            Submit Deposit Request
          </Button>

          <div className="text-xs text-muted-foreground bg-white/[0.02] rounded-lg p-3">
            <Shield className="w-3.5 h-3.5 inline mr-1.5" />
            Deposits are reviewed by admin before being credited to your balance. This typically takes a few minutes during business hours.
          </div>
        </motion.div>
      </div>
    </main>
  );
}

/* ============================== WITHDRAW ================================= */

export function WithdrawView() {
  const { user, navigate, updateBalance } = useAuth();
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [method, setMethod] = useState("USDT_TRC20");
  const [loading, setLoading] = useState(false);

  if (!user) {
    return <main className="flex-1 pt-20 flex items-center justify-center"><Button onClick={() => navigate("login")}>Please login</Button></main>;
  }

  const balance = Number(user.balance) || 0;

  async function handleWithdraw() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > balance) return toast.error("Insufficient balance");
    if (!address.trim()) return toast.error("Enter your wallet address");
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user!.id },
        body: JSON.stringify({ amount: amt, method, address }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Withdrawal failed");
        return;
      }
      toast.success(`Withdrawal of ${amt} USDT submitted — pending approval`);
      updateBalance(Number(data.balance ?? user!.balance));
      setAmount("");
      setAddress("");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  const methods = Object.entries(ALL_PAYMENT_METHODS).slice(0, 10);

  return (
    <main className="flex-1 pt-14 pb-10 bg-black min-h-screen" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}>
      <SonnerToaster richColors position="top-center" />
      <div className="mx-auto max-w-md lg:max-w-2xl px-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 pt-6">
          <h1 className="text-[34px] font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowUpFromLine className="w-7 h-7" style={{ color: '#FF453A' }} />
            Withdraw
          </h1>
          <p className="text-sm mt-1" style={{ color: "#8E8E93" }}>
            Withdraw funds from your account
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bx-glass rounded-2xl p-6 space-y-5">
          <div>
            <Label className="text-xs text-muted-foreground">Available Balance</Label>
            <div className="text-2xl font-bold text-[#30D158] mt-1">{balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Withdrawal Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a1428] border-white/10 max-h-60">
                {methods.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Wallet Address</Label>
            <Input
              placeholder="Enter your wallet address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 bg-white/5 border-white/10 font-mono text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Amount (USDT)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 bg-white/5 border-white/10 text-2xl font-bold"
            />
            <div className="flex gap-2 mt-2">
              {[50, 100, 500, balance].map((q, i) => (
                <button
                  key={i}
                  onClick={() => setAmount(String(Math.min(q, balance)))}
                  className="px-3 py-1 rounded-lg text-xs bg-white/5 text-muted-foreground hover:bg-[#0A84FF]/15 hover:text-white"
                >
                  {i === 3 ? "MAX" : q}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleWithdraw}
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-[#ff3b30] to-[#c62828] hover:opacity-90 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpFromLine className="w-4 h-4 mr-2" />}
            Submit Withdrawal Request
          </Button>

          <div className="text-xs text-muted-foreground bg-white/[0.02] rounded-lg p-3">
            <Shield className="w-3.5 h-3.5 inline mr-1.5" />
            Withdrawals are reviewed by admin before being sent. Always double-check your wallet address — crypto transactions are irreversible.
          </div>
        </motion.div>
      </div>
    </main>
  );
}

/* =============================== HISTORY ================================= */

export function HistoryView() {
  const { user, navigate } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState<"ALL" | "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "TRADE" | "ADMIN">("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/trade/history", { headers: { "x-user-id": user.id } }).then((r) => r.json()),
      fetch("/api/wallet/transactions", { headers: { "x-user-id": user.id } }).then((r) => r.json()),
    ])
      .then(([t, tx]) => {
        setTrades(t.trades || []);
        // Merge all transaction types into a unified list with consistent shape
        const all: any[] = [
          ...(tx.deposits || []).map((d: any) => ({
            id: d.id, kind: "Deposit", type: "DEPOSIT",
            amount: Number(d.amount), method: d.method || "—",
            status: d.status, reference: d.reference || "",
            createdAt: d.createdAt,
          })),
          ...(tx.withdrawals || []).map((w: any) => ({
            id: w.id, kind: "Withdrawal", type: "WITHDRAWAL",
            amount: -Number(w.amount), method: w.method || "—",
            status: w.status, reference: w.address || w.reference || "",
            createdAt: w.createdAt,
          })),
          ...(tx.transfersOut || []).map((tr: any) => ({
            id: tr.id, kind: "Transfer Out", type: "TRANSFER",
            amount: -Number(tr.amount), method: "Transfer",
            status: tr.status || "COMPLETED", reference: `To: ${tr.recipient?.email || "—"}`,
            createdAt: tr.createdAt,
          })),
          ...(tx.transfersIn || []).map((tr: any) => ({
            id: tr.id, kind: "Transfer In", type: "TRANSFER",
            amount: Number(tr.amount), method: "Transfer",
            status: tr.status || "COMPLETED", reference: `From: ${tr.sender?.email || "—"}`,
            createdAt: tr.createdAt,
          })),
          // Wallet logs = admin actions (CREDIT, DEBIT, FREEZE, UNFREEZE, BONUS, DEPOSIT, etc.)
          ...(tx.walletLogs || []).map((l: any) => ({
            id: l.id, kind: l.type || "Admin", type: "ADMIN",
            amount: Number(l.amount), method: l.type || "Admin",
            status: "COMPLETED", reference: l.reference || "",
            createdAt: l.createdAt,
          })),
        ];
        // Sort newest first
        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTransactions(all);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return <main className="flex-1 pt-20 flex items-center justify-center bg-black"><Button onClick={() => navigate("login")}>Please login</Button></main>;
  }

  // Filter + search
  const filteredTx = transactions.filter((t) => {
    if (txFilter !== "ALL" && t.type !== txFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.kind?.toLowerCase().includes(q) ||
        t.method?.toLowerCase().includes(q) ||
        t.reference?.toLowerCase().includes(q) ||
        t.status?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const txStats = {
    total: transactions.length,
    deposits: transactions.filter((t) => t.type === "DEPOSIT").length,
    withdrawals: transactions.filter((t) => t.type === "WITHDRAWAL").length,
    transfers: transactions.filter((t) => t.type === "TRANSFER").length,
    admin: transactions.filter((t) => t.type === "ADMIN").length,
  };

  return (
    <main className="flex-1 pt-14 pb-10 bg-black min-h-screen" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}>
      <SonnerToaster richColors position="top-center" />
      <div className="mx-auto max-w-2xl lg:max-w-4xl px-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 pt-6">
          <h1 className="text-[34px] font-bold text-white tracking-tight flex items-center gap-2">
            <HistoryIcon className="w-7 h-7" style={{ color: '#0A84FF' }} />
            History
          </h1>
          <p className="text-sm mt-1" style={{ color: "#8E8E93" }}>
            Your trading history and transaction log
          </p>
        </motion.div>

        <Tabs defaultValue="trades">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="trades">Trading History</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          {/* === TRADING HISTORY === */}
          <TabsContent value="trades">
            <div className="rounded-2xl overflow-hidden" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
              {loading ? (
                <div className="p-12 text-center" style={{ color: "#8E8E93" }}><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading...</div>
              ) : trades.length === 0 ? (
                <div className="p-12 text-center" style={{ color: "#8E8E93" }}>
                  No trades yet. <button style={{ color: "#0A84FF" }} onClick={() => navigate("trade")}>Start trading</button>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "#38383A" }}>
                  {trades.map((t) => (
                    <div key={t.id} className="px-4 py-3.5 flex items-center gap-3" style={{ borderBottom: "1px solid #38383A" }}>
                      {/* Coin icon */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: t.direction === "UP" ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)" }}>
                        {t.direction === "UP" ? <TrendingUp className="w-5 h-5" style={{ color: "#30D158" }} /> : <TrendingDown className="w-5 h-5" style={{ color: "#FF453A" }} />}
                      </div>
                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm">{t.symbol}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{
                            background: t.direction === "UP" ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)",
                            color: t.direction === "UP" ? "#30D158" : "#FF453A",
                          }}>
                            {t.direction}
                          </span>
                          <span className="text-xs" style={{ color: "#8E8E93" }}>{t.duration}s</span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#8E8E93" }}>
                          {new Date(t.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {/* Amount + profit */}
                      <div className="text-right shrink-0">
                        <div className="text-sm text-white tabular-nums">{Number(t.amount).toFixed(2)}</div>
                        <div className="text-xs tabular-nums font-medium" style={{
                          color: t.result === "WIN" ? "#30D158" : t.result === "LOSE" ? "#FF453A" : "#8E8E93",
                        }}>
                          {t.result === "WIN" ? "+" : t.result === "LOSE" ? "" : ""}{Number(t.profit).toFixed(2)}
                        </div>
                      </div>
                      {/* Result badge */}
                      <Badge variant="outline" className="shrink-0" style={{
                        borderColor: t.result === "WIN" ? "rgba(48,209,88,0.3)" : t.result === "LOSE" ? "rgba(255,69,58,0.3)" : "rgba(142,142,147,0.3)",
                        color: t.result === "WIN" ? "#30D158" : t.result === "LOSE" ? "#FF453A" : "#8E8E93",
                      }}>
                        {t.result}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* === TRANSACTIONS === */}
          <TabsContent value="transactions">
            {/* Stat chips */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[
                { label: "All", value: txStats.total, filter: "ALL" as const, color: "#0A84FF" },
                { label: "Deposit", value: txStats.deposits, filter: "DEPOSIT" as const, color: "#30D158" },
                { label: "Withdraw", value: txStats.withdrawals, filter: "WITHDRAWAL" as const, color: "#FF453A" },
                { label: "Transfer", value: txStats.transfers, filter: "TRANSFER" as const, color: "#BF5AF2" },
                { label: "Admin", value: txStats.admin, filter: "ADMIN" as const, color: "#FF9F0A" },
              ].map((chip) => (
                <button
                  key={chip.filter}
                  onClick={() => setTxFilter(chip.filter)}
                  className="rounded-xl p-2 text-center transition-all"
                  style={{
                    background: txFilter === chip.filter ? `${chip.color}22` : "#1C1C1E",
                    border: txFilter === chip.filter ? `1px solid ${chip.color}` : "1px solid #38383A",
                  }}
                >
                  <div className="text-lg font-bold" style={{ color: chip.color }}>{chip.value}</div>
                  <div className="text-[10px]" style={{ color: "#8E8E93" }}>{chip.label}</div>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8E8E93" }} />
              <input
                placeholder="Search by type, method, reference, status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: "#1C1C1E", border: "1px solid #38383A" }}
              />
            </div>

            {/* List */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
              {loading ? (
                <div className="p-12 text-center" style={{ color: "#8E8E93" }}><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading...</div>
              ) : filteredTx.length === 0 ? (
                <div className="p-12 text-center" style={{ color: "#8E8E93" }}>
                  {search ? "No transactions match your search." : "No transactions yet."}
                </div>
              ) : (
                <div>
                  {filteredTx.map((t, i, arr) => {
                    const isLast = i === arr.length - 1;
                    const isPositive = Number(t.amount) >= 0;
                    const typeColor =
                      t.type === "DEPOSIT" ? "#30D158" :
                      t.type === "WITHDRAWAL" ? "#FF453A" :
                      t.type === "TRANSFER" ? "#BF5AF2" :
                      "#FF9F0A"; // ADMIN
                    return (
                      <div
                        key={t.id}
                        className="px-4 py-3.5 flex items-center gap-3"
                        style={{ borderBottom: isLast ? "none" : "1px solid #38383A" }}
                      >
                        {/* Type icon */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${typeColor}22` }}>
                          {t.type === "DEPOSIT" ? <ArrowDownToLine className="w-5 h-5" style={{ color: typeColor }} /> :
                           t.type === "WITHDRAWAL" ? <ArrowUpFromLine className="w-5 h-5" style={{ color: typeColor }} /> :
                           t.type === "TRANSFER" ? <ArrowLeftRight className="w-5 h-5" style={{ color: typeColor }} /> :
                           <WalletIcon className="w-5 h-5" style={{ color: typeColor }} />}
                        </div>
                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white font-medium">{t.kind}</div>
                          <div className="text-xs mt-0.5" style={{ color: "#8E8E93" }}>
                            {t.method}{t.reference ? ` · ${t.reference}` : ""}
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: "#48484A" }}>
                            {new Date(t.createdAt).toLocaleString()}
                          </div>
                        </div>
                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold tabular-nums" style={{ color: isPositive ? "#30D158" : "#FF453A" }}>
                            {isPositive ? "+" : ""}{Number(t.amount).toFixed(2)}
                          </div>
                          <div className="text-[10px] mt-0.5" style={{
                            color: t.status === "APPROVED" || t.status === "COMPLETED" ? "#30D158" : t.status === "PENDING" ? "#FF9F0A" : "#FF453A",
                          }}>
                            {t.status}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary */}
            {!loading && filteredTx.length > 0 && (
              <div className="mt-4 px-4 py-3 rounded-2xl text-xs" style={{ background: "#1C1C1E", border: "1px solid #38383A", color: "#8E8E93" }}>
                Showing {filteredTx.length} of {transactions.length} transactions
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

/* =============================== PROFILE ================================= */

export function ProfileView() {
  const { user, navigate, logout, setUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<{ income: number; expense: number }>({ income: 0, expense: 0 });
  const [walletOverview, setWalletOverview] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/wallet/transactions", { headers: { "x-user-id": user.id } }).then((r) => r.json()),
      fetch("/api/wallet", { headers: { "x-user-id": user.id } }).then((r) => r.json()),
    ])
      .then(([tx, w]) => {
        const deposits = (tx.deposits || []).filter((t: any) => t.status === "APPROVED");
        const withdrawals = (tx.withdrawals || []).filter((t: any) => t.status === "APPROVED");
        const income = deposits.reduce((s: number, t: any) => s + Number(t.amount), 0);
        const expense = withdrawals.reduce((s: number, t: any) => s + Number(t.amount), 0);
        setStats({ income, expense });
        if (w.overview) setWalletOverview(w.overview);
      })
      .catch(() => {});
  }, [user]);

  if (!user) {
    return <main className="flex-1 pt-20 flex items-center justify-center bg-black"><Button onClick={() => navigate("login")}>Please login</Button></main>;
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image too large. Max 2MB."); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const photo = reader.result as string;
        try {
          const res = await fetch("/api/auth/photo", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": user!.id },
            body: JSON.stringify({ photo }),
          });
          const data = await res.json();
          if (!res.ok) { toast.error(data.error || "Upload failed"); return; }
          setUser(data.user);
          toast.success("Profile photo updated");
        } catch { toast.error("Network error"); }
        finally { setUploading(false); }
      };
      reader.readAsDataURL(file);
    } catch { toast.error("Failed to read file"); setUploading(false); }
  }

  return (
    <main className="flex-1 pt-14 pb-10 min-h-screen" style={{ background: "#0A192F", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}>
      <SonnerToaster richColors position="top-center" />
      <div className="mx-auto max-w-md lg:max-w-2xl px-4">

        {/* Balance card — teal-to-blue gradient (e-wallet style) */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden p-6 mb-4 mt-6 relative"
          style={{ background: "linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)" }}>
          <div className="text-white/70 text-xs font-medium uppercase tracking-wider">Total Balance</div>
          <div className="text-white text-4xl font-bold mt-1 tabular-nums">
            ${((walletOverview?.totalAssetValue ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-white/60 text-xs mt-1">
            Available: ${((walletOverview?.availableBalance ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            {" · "}Frozen: ${((walletOverview?.frozenFunds ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          {/* Quick actions — white circles */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            {[
              { icon: Plus, label: "Deposit", onClick: () => navigate("deposit") },
              { icon: ArrowUpFromLine, label: "Withdraw", onClick: () => navigate("withdraw") },
              { icon: ArrowLeftRight, label: "Trade", onClick: () => navigate("trade") },
              { icon: WalletIcon, label: "Wallet", onClick: () => navigate("wallet") },
            ].map((btn) => {
              const Icon = btn.icon;
              return (
                <button key={btn.label} onClick={btn.onClick} className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Icon className="w-5 h-5" style={{ color: "#007BFF" }} />
                  </div>
                  <span className="text-[10px] font-medium text-white">{btn.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 pt-6">
          <h1 className="text-[34px] font-bold text-white tracking-tight">Profile</h1>
        </motion.div>

        {/* Profile card — avatar + name + email + verified badge */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl p-6 mb-4 text-center"
          style={{ background: "linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%)", border: "1px solid #38383A" }}>
          {/* Avatar with upload */}
          <div className="relative inline-block group mb-3">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold text-white ring-4 ring-white/5"
              style={{ background: "linear-gradient(135deg, #0A84FF, #0D47A1)" }}>
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-lg font-bold text-white">{user.name}</h2>
            {/* Verified badge */}
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#FF9F0A" }}>
              <ShieldCheck className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="text-sm mt-0.5" style={{ color: "#8E8E93" }}>{user.email}</div>
          <div className="text-xs mt-1 font-mono" style={{ color: "#0A84FF" }}>UID: {user.uid}</div>
        </motion.div>

        {/* Income / Expense cards */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl p-4" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(48,209,88,0.15)" }}>
                <TrendingUp className="w-4 h-4" style={{ color: "#30D158" }} />
              </div>
              <span className="text-xs" style={{ color: "#8E8E93" }}>Income</span>
            </div>
            <div className="text-xl font-bold" style={{ color: "#30D158" }}>
              ${stats.income.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,69,58,0.15)" }}>
                <TrendingDown className="w-4 h-4" style={{ color: "#FF453A" }} />
              </div>
              <span className="text-xs" style={{ color: "#8E8E93" }}>Expense</span>
            </div>
            <div className="text-xl font-bold" style={{ color: "#FF453A" }}>
              ${stats.expense.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        </motion.div>

        {/* Action buttons row */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-4 gap-3 mb-6">
          {[
            { icon: Plus, label: "Top up", onClick: () => navigate("deposit"), color: "#30D158" },
            { icon: ArrowUpFromLine, label: "Withdraw", onClick: () => navigate("withdraw"), color: "#FF453A" },
            { icon: ArrowLeftRight, label: "Send", onClick: () => navigate("messages"), color: "#0A84FF" },
            { icon: CreditCard, label: "Pay", onClick: () => navigate("wallet"), color: "#FF9F0A" },
          ].map((btn) => {
            const Icon = btn.icon;
            return (
              <button key={btn.label} onClick={btn.onClick} className="flex flex-col items-center gap-1.5">
                <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: `${btn.color}22` }}>
                  <Icon className="w-5 h-5" style={{ color: btn.color }} />
                </div>
                <span className="text-[10px] font-medium text-white">{btn.label}</span>
              </button>
            );
          })}
        </motion.div>

        {/* GENERAL settings menu — iOS-style list */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-4">
          <div className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider px-4 mb-2">GENERAL</div>
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
            {[
              { icon: UserIcon, label: "Profile Settings", view: "settings" as const, color: "#0A84FF" },
              { icon: Lock, label: "Change Password", view: "settings" as const, color: "#FF9F0A" },
              { icon: Bell, label: "Notifications", view: "notifications" as const, color: "#FF453A" },
              { icon: HistoryIcon, label: "Transaction History", view: "history" as const, color: "#30D158" },
              { icon: ShieldCheck, label: "KYC Verification", view: "kyc" as const, color: "#BF5AF2" },
              { icon: MessageCircle, label: "Messages", view: "messages" as const, color: "#0A84FF" },
            ].map((item, i, arr) => {
              const Icon = item.icon;
              const isLast = i === arr.length - 1;
              return (
                <button key={item.label} onClick={() => navigate(item.view)}
                  className="w-full flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: isLast ? "none" : "1px solid #38383A" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${item.color}22` }}>
                    <Icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <span className="flex-1 text-left text-white text-base">{item.label}</span>
                  <svg className="w-5 h-5" style={{ color: "#48484A" }} viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Logout — iOS red button */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-2xl overflow-hidden" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
          <button onClick={logout} className="w-full px-4 py-3.5 text-center text-base font-medium" style={{ color: "#FF453A" }}>
            <LogOut className="w-4 h-4 inline mr-2" /> Logout
          </button>
        </motion.div>
      </div>
    </main>
  );
}

/* ============================ NOTIFICATIONS ============================== */

export function NotificationsView() {
  const { user, navigate } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/notifications", { headers: { "x-user-id": user.id } })
      .then((r) => r.json())
      .then((data) => setNotifications(data.notifications || []))
      .catch(() => toast.error("Failed to load notifications"))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return <main className="flex-1 pt-20 flex items-center justify-center"><Button onClick={() => navigate("login")}>Please login</Button></main>;
  }

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({ markAll: true }),
      });
    } catch {}
  };

  return (
    <main className="flex-1 pt-14 pb-10 bg-black min-h-screen" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}>
      <SonnerToaster richColors position="top-center" />
      <div className="mx-auto max-w-md lg:max-w-2xl px-4">
        {/* iOS large title */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6 pt-6">
          <div>
            <h1 className="text-[34px] font-bold text-white tracking-tight">Notifications</h1>
            {notifications.length > 0 && (
              <p className="text-sm mt-1" style={{ color: "#8E8E93" }}>
                {notifications.filter((n) => !n.read).length} unread
              </p>
            )}
          </div>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={markAllRead}
              className="px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ background: "rgba(10,132,255,0.15)", color: "#0A84FF" }}
            >
              <Check className="w-3.5 h-3.5 inline mr-1" /> Mark all read
            </button>
          )}
        </motion.div>

        {loading ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: "#1C1C1E", border: "1px solid #38383A", color: "#8E8E93" }}>
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
            <Bell className="w-10 h-10 mx-auto mb-4" style={{ color: "#48484A" }} />
            <h3 className="text-lg font-semibold text-white mb-2">No notifications</h3>
            <p className="text-sm" style={{ color: "#8E8E93" }}>You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n, idx) => {
              const color =
                n.type === "success" ? "#30D158" :
                n.type === "warning" ? "#FF9F0A" :
                n.type === "error" ? "#FF453A" :
                "#0A84FF";
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-2xl p-4 flex items-start gap-3"
                  style={{
                    background: "#1C1C1E",
                    border: `1px solid ${n.read ? "#38383A" : color}`,
                    borderLeft: !n.read ? `3px solid ${color}` : "1px solid #38383A",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${color}22` }}
                  >
                    <Bell className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-sm">{n.title}</h3>
                      {!n.read && <span className="w-2 h-2 rounded-full" style={{ background: color }} />}
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: "#8E8E93" }}>{n.body}</p>
                    <div className="text-xs mt-1" style={{ color: "#48484A" }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

/* =============================== SETTINGS ================================ */

export function SettingsView() {
  const { user, navigate, logout, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone] = useState(user?.phone || ""); // fixed — not editable
  const [country, setCountry] = useState(user?.country || "");
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  if (!user) {
    return <main className="flex-1 pt-20 flex items-center justify-center"><Button onClick={() => navigate("login")}>Please login</Button></main>;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": user!.id },
        body: JSON.stringify({ name, phone, country }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      setUser(data.user);
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange() {
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error("Fill in all password fields");
      return;
    }
    if (newPwd.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("New passwords don't match");
      return;
    }
    setChangingPwd(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user!.id },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to change password");
        return;
      }
      setUser(data.user);
      toast.success("Password changed successfully");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setShowPwd(false);
    } catch {
      toast.error("Network error");
    } finally {
      setChangingPwd(false);
    }
  }

  async function handle2FAToggle() {
    setTwoFactorLoading(true);
    try {
      if (user?.twoFactorEnabled) {
        // Disable
        const res = await fetch("/api/auth/2fa", {
          method: "DELETE",
          headers: { "x-user-id": user!.id },
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to disable 2FA");
          return;
        }
        setUser(data.user);
        toast.success("2FA disabled");
      } else {
        // Enable
        const res = await fetch("/api/auth/2fa", {
          method: "POST",
          headers: { "x-user-id": user!.id },
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to enable 2FA");
          return;
        }
        setUser(data.user);
        setRecoveryCodes(data.recoveryCodes);
        toast.success("2FA enabled — save your recovery codes");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setTwoFactorLoading(false);
    }
  }

  return (
    <main className="flex-1 pt-14 pb-10 bg-black min-h-screen" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}>
      <SonnerToaster richColors position="top-center" />
      <div className="mx-auto max-w-md lg:max-w-2xl px-4">
        {/* iOS large title */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 pt-6">
          <h1 className="text-[34px] font-bold text-white tracking-tight">Settings</h1>
        </motion.div>

        {/* Profile Information */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
          <div className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider px-4 mb-2">Profile Information</div>
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
            <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #38383A" }}>
              <div className="text-xs text-[#8E8E93] mb-1.5">Full Name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-transparent text-white text-base outline-none"
              />
            </div>
            <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #38383A" }}>
              <div className="text-xs text-[#8E8E93] mb-1.5">Email (fixed — cannot change)</div>
              <div className="text-white text-base opacity-50 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" style={{ color: "#8E8E93" }} />
                {user.email}
              </div>
            </div>
            <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #38383A" }}>
              <div className="text-xs text-[#8E8E93] mb-1.5">Phone (fixed — cannot change)</div>
              <div className="text-white text-base opacity-50 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" style={{ color: "#8E8E93" }} />
                {user.phone || "Not set"}
              </div>
            </div>
            <div className="px-4 py-3.5">
              <div className="text-xs text-[#8E8E93] mb-1.5">Country</div>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Not set"
                className="w-full bg-transparent text-white text-base outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-3 py-3.5 rounded-2xl text-base font-semibold transition-opacity"
            style={{ background: "#0A84FF", color: "#fff" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <Save className="w-4 h-4 inline mr-2" />}
            Save Changes
          </button>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider px-4 mb-2">Security</div>

          {/* Password row */}
          <div className="rounded-2xl overflow-hidden mb-3" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
            <button
              onClick={() => setShowPwd((v) => !v)}
              className="w-full flex items-center gap-3 px-4 py-3.5"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(10,132,255,0.15)" }}>
                <Lock className="w-4 h-4" style={{ color: "#0A84FF" }} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-base text-white">Password</div>
                <div className="text-xs text-[#8E8E93]">Change your password</div>
              </div>
              <span className="text-sm" style={{ color: "#0A84FF" }}>{showPwd ? "Cancel" : "Change"}</span>
            </button>
          </div>

          {/* Password form */}
          {showPwd && (
            <div className="rounded-2xl overflow-hidden mb-3" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid #38383A" }}>
                <div className="text-xs text-[#8E8E93] mb-1">Current Password</div>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-transparent text-white text-base outline-none"
                />
              </div>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid #38383A" }}>
                <div className="text-xs text-[#8E8E93] mb-1">New Password</div>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-transparent text-white text-base outline-none"
                />
              </div>
              <div className="px-4 py-3">
                <div className="text-xs text-[#8E8E93] mb-1">Confirm New Password</div>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-transparent text-white text-base outline-none"
                />
              </div>
              <button
                onClick={handlePasswordChange}
                disabled={changingPwd}
                className="w-full py-3.5 text-base font-semibold transition-opacity"
                style={{ background: "#0A84FF", color: "#fff" }}
              >
                {changingPwd ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <KeyRound className="w-4 h-4 inline mr-2" />}
                Update Password
              </button>
            </div>
          )}

          {/* 2FA row */}
          <div className="rounded-2xl overflow-hidden mb-3" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(48,209,88,0.15)" }}>
                <Shield className="w-4 h-4" style={{ color: "#30D158" }} />
              </div>
              <div className="flex-1">
                <div className="text-base text-white">Two-Factor Authentication</div>
                <div className="text-xs text-[#8E8E93]">
                  {user.twoFactorEnabled ? "Enabled" : "Add an extra layer of security"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {twoFactorLoading && <Loader2 className="w-4 h-4 animate-spin text-[#8E8E93]" />}
                <Switch
                  checked={user.twoFactorEnabled ?? false}
                  onCheckedChange={handle2FAToggle}
                  disabled={twoFactorLoading}
                />
              </div>
            </div>
          </div>

          {/* Recovery codes */}
          {recoveryCodes && recoveryCodes.length > 0 && (
            <div className="rounded-2xl p-4 mb-3" style={{ background: "rgba(255,159,10,0.1)", border: "1px solid rgba(255,159,10,0.3)" }}>
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#FF9F0A" }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#FF9F0A" }}>Save your recovery codes</div>
                  <div className="text-xs text-[#8E8E93] mt-0.5">
                    Store these safely. You'll need them if you lose access to your device.
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                {recoveryCodes.map((code, i) => (
                  <div key={i} className="px-2 py-1.5 rounded text-white" style={{ background: "rgba(0,0,0,0.4)" }}>{code}</div>
                ))}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(recoveryCodes.join("\n"));
                  toast.success("Recovery codes copied to clipboard");
                }}
                className="w-full mt-3 py-2 rounded-xl text-sm font-medium"
                style={{ background: "rgba(255,159,10,0.2)", color: "#FF9F0A" }}
              >
                <Copy className="w-3.5 h-3.5 inline mr-1.5" /> Copy All Codes
              </button>
            </div>
          )}
        </motion.div>

        {/* Session */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
          <div className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider px-4 mb-2">Session</div>
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1C1C1E", border: "1px solid #38383A" }}>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="text-xs text-[#8E8E93]">UID</div>
                <div className="text-base font-mono mt-0.5" style={{ color: "#0A84FF" }}>{user.uid}</div>
              </div>
              <CopyButton text={user.uid} />
            </div>
          </div>
        </motion.div>

        {/* Logout — iOS red button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: "#1C1C1E", border: "1px solid #38383A" }}
        >
          <button
            onClick={logout}
            className="w-full px-4 py-3.5 text-center text-base font-medium"
            style={{ color: "#FF453A" }}
          >
            <LogOut className="w-4 h-4 inline mr-2" />
            Logout
          </button>
        </motion.div>
      </div>
    </main>
  );
}
