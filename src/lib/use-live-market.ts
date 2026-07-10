"use client";
import { useState, useEffect, useCallback } from "react";
export interface LiveCoin { symbol: string; name: string; pair: string; price: number; change24h: number; high24h: number; low24h: number; volume24h: number; sparkline: number[]; updatedAt: string; }
export interface MarketHistory { symbol: string; timeframe: string; data: { price: number; timestamp: string }[]; current: number; change: number; high: number; low: number; avg: number; }
export function useLivePrices() {
  const [prices, setPrices] = useState<LiveCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchPrices = useCallback(async () => { try { const res = await fetch("/api/market/live"); if (!res.ok) throw new Error("Failed"); const data = await res.json(); setPrices(data.prices || []); setError(null); } catch (err) { setError(err instanceof Error ? err.message : "Error"); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchPrices(); const interval = setInterval(fetchPrices, 3000); return () => clearInterval(interval); }, [fetchPrices]);
  return { prices, loading, error, refetch: fetchPrices };
}
export function useMarketHistory(symbol: string, timeframe: string = "7D") {
  const [history, setHistory] = useState<MarketHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchHistory = useCallback(async () => { try { const res = await fetch(`/api/market/history?symbol=${symbol}&timeframe=${timeframe}`); if (!res.ok) throw new Error("Failed"); const data = await res.json(); setHistory(data); setError(null); } catch (err) { setError(err instanceof Error ? err.message : "Error"); } finally { setLoading(false); } }, [symbol, timeframe]);
  useEffect(() => { setLoading(true); fetchHistory(); const interval = setInterval(fetchHistory, 5000); return () => clearInterval(interval); }, [fetchHistory]);
  return { history, loading, error, refetch: fetchHistory };
}
