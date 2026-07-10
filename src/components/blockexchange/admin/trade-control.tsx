"use client";

/**
 * BlockExchange admin — Trade Control section.
 *
 * Lets Super Admin control trade outcomes:
 *   AUTO         = random (natural market simulation)
 *   ALWAYS_WIN   = all trades win
 *   ALWAYS_LOSE  = all trades lose
 *   WIN_RATE     = percentage-based (X% chance of winning)
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Settings as SettingsIcon, Save } from "lucide-react";
import {
  SectionHeader, SectionShell,
} from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface TradeSetting {
  id: string;
  mode: string;
  winRate: number;
  updatedAt: string;
}

export function AdminTradeControl({ userId }: { userId: string }) {
  const [setting, setSetting] = useState<TradeSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("AUTO");
  const [winRate, setWinRate] = useState(50);

  useEffect(() => {
    fetch("/api/admin/trade-settings", { headers: { "x-user-id": userId } })
      .then((r) => r.json())
      .then((d) => {
        if (d.setting) {
          setSetting(d.setting);
          setMode(d.setting.mode);
          setWinRate(d.setting.winRate);
        }
      })
      .catch(() => toast.error("Failed to load trade settings"))
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/trade-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ mode, winRate }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to save"); return; }
      setSetting(data.setting);
      toast.success("Trade control updated");
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  }

  const modes = [
    { value: "AUTO", label: "Auto (Random)", desc: "Natural market simulation — trades win/lose randomly based on price movement", color: "#007BFF", icon: "🎲" },
    { value: "ALWAYS_WIN", label: "Always Win", desc: "All trades will WIN regardless of direction. Customers always profit.", color: "#28A745", icon: "✅" },
    { value: "ALWAYS_LOSE", label: "Always Lose", desc: "All trades will LOSE regardless of direction. House keeps all stakes.", color: "#DC3545", icon: "❌" },
    { value: "WIN_RATE", label: "Win Rate %", desc: "Set a custom win percentage. Trades win X% of the time.", color: "#FF9F0A", icon: "📊" },
  ];

  return (
    <SectionShell>
      <SectionHeader
        title="Trade Control"
        description="Control whether trades win or lose — set the outcome mode"
        icon={SettingsIcon}
      />

      {loading ? (
        <div className="p-12 text-center" style={{ color: "#6C757D" }}>
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading...
        </div>
      ) : (
        <>
          {/* Current status */}
          <div className="rounded-xl p-4 mb-5 flex items-center gap-3" style={{
            background: mode === "ALWAYS_WIN" ? "rgba(40,167,69,0.1)"
              : mode === "ALWAYS_LOSE" ? "rgba(220,53,69,0.1)"
              : mode === "WIN_RATE" ? "rgba(255,159,10,0.1)"
              : "rgba(0,123,255,0.1)",
            border: `1px solid ${
              mode === "ALWAYS_WIN" ? "rgba(40,167,69,0.3)"
              : mode === "ALWAYS_LOSE" ? "rgba(220,53,69,0.3)"
              : mode === "WIN_RATE" ? "rgba(255,159,10,0.3)"
              : "rgba(0,123,255,0.3)"
            }`,
          }}>
            <div className="text-sm" style={{ color: "#6C757D" }}>Current Mode:</div>
            <Badge style={{
              background: mode === "ALWAYS_WIN" ? "#28A745"
                : mode === "ALWAYS_LOSE" ? "#DC3545"
                : mode === "WIN_RATE" ? "#FF9F0A"
                : "#007BFF",
              color: "#fff",
            }}>
              {modes.find((m) => m.value === mode)?.icon} {modes.find((m) => m.value === mode)?.label}
            </Badge>
            {mode === "WIN_RATE" && (
              <span className="text-sm font-bold" style={{ color: "#FF9F0A" }}>{winRate}% win</span>
            )}
            {setting && (
              <span className="text-xs ml-auto" style={{ color: "#9CA3AF" }}>
                Updated: {new Date(setting.updatedAt).toLocaleString()}
              </span>
            )}
          </div>

          {/* Mode selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {modes.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className="rounded-xl p-5 text-left transition-all"
                style={{
                  background: mode === m.value ? `${m.color}15` : "#ffffff",
                  border: mode === m.value ? `2px solid ${m.color}` : "1px solid #e5e7eb",
                  boxShadow: mode === m.value ? `0 0 12px ${m.color}30` : "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{m.icon}</span>
                  <span className="text-base font-bold" style={{ color: mode === m.value ? m.color : "#333333" }}>
                    {m.label}
                  </span>
                  {mode === m.value && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full text-white" style={{ background: m.color }}>
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: "#6C757D" }}>{m.desc}</p>
              </button>
            ))}
          </div>

          {/* Win rate slider (only for WIN_RATE mode) */}
          {mode === "WIN_RATE" && (
            <div className="rounded-xl p-5 mb-5" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
              <Label className="text-sm font-semibold mb-3 block" style={{ color: "#333333" }}>
                Win Rate: {winRate}%
              </Label>
              <input
                type="range"
                min="0"
                max="100"
                value={winRate}
                onChange={(e) => setWinRate(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: "#FF9F0A" }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: "#6C757D" }}>
                <span>0% (always lose)</span>
                <span>50% (fair)</span>
                <span>100% (always win)</span>
              </div>
            </div>
          )}

          {/* Warning */}
          {(mode === "ALWAYS_WIN" || mode === "ALWAYS_LOSE") && (
            <div className="rounded-xl p-4 mb-5" style={{
              background: "rgba(255,159,10,0.1)",
              border: "1px solid rgba(255,159,10,0.3)",
            }}>
              <div className="text-sm" style={{ color: "#FF9F0A" }}>
                ⚠️ <strong>Warning:</strong> {mode === "ALWAYS_WIN"
                  ? "All trades will win. This means every customer profit will be paid from the platform balance. Use with caution."
                  : "All trades will lose. Customers will lose their stake on every trade. This may cause customer dissatisfaction."}
              </div>
            </div>
          )}

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="text-white"
            style={{ background: "#007BFF" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Trade Control Setting
          </Button>
        </>
      )}
    </SectionShell>
  );
}
