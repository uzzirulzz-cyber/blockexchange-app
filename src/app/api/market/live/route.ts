import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { COINS } from "@/lib/market-data";
export async function GET() {
  try {
    const db = await getMongoDb();
    const collection = db.collection("live_prices");
    const count = await collection.countDocuments();
    if (count === 0) {
      await collection.insertMany(COINS.map((c) => ({ symbol: c.symbol, name: c.name, pair: c.pair, price: c.basePrice, change24h: (Math.random() - 0.45) * 12, high24h: c.basePrice * 1.02, low24h: c.basePrice * 0.98, volume24h: Math.random() * 1000000, sparkline: Array.from({ length: 20 }, () => c.basePrice * (0.97 + Math.random() * 0.06)), updatedAt: new Date() })));
    }
    for (const coin of COINS) {
      const existing = await collection.findOne({ symbol: coin.symbol });
      if (existing) {
        const delta = (Math.random() - 0.5) * coin.basePrice * 0.002;
        const newPrice = Math.max(existing.price + delta, coin.basePrice * 0.5);
        const newSpark = [...(existing.sparkline || []).slice(1), newPrice];
        const change24h = ((newPrice - newSpark[0]) / newSpark[0]) * 100;
        await collection.updateOne({ symbol: coin.symbol }, { $set: { price: newPrice, change24h, high24h: Math.max(existing.high24h, newPrice), low24h: Math.min(existing.low24h, newPrice), sparkline: newSpark, volume24h: existing.volume24h + Math.random() * 1000, updatedAt: new Date() } });
      }
    }
    const prices = await collection.find({}).toArray();
    return NextResponse.json({ prices });
  } catch (err) { console.error("[market/live]", err); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
