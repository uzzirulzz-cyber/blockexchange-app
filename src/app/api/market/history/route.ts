import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { COINS } from "@/lib/market-data";
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") || "BTC";
    const timeframe = searchParams.get("timeframe") || "7D";
    const tfPoints: Record<string, number> = { "7D": 7, "1M": 30, "3M": 90, "6M": 180 };
    const points = tfPoints[timeframe] || 7;
    const db = await getMongoDb();
    const collection = db.collection("price_history");
    const existing = await collection.findOne({ symbol, timeframe });
    if (!existing) {
      const coin = COINS.find((c) => c.symbol === symbol) || COINS[0];
      let price = coin.basePrice * 0.95;
      const data: { price: number; timestamp: Date }[] = [];
      for (let i = 0; i < points; i++) { const drift = (Math.random() - 0.48) * coin.basePrice * 0.04; price = Math.max(price + drift, coin.basePrice * 0.5); data.push({ price, timestamp: new Date(Date.now() - (points - i) * 86400000) }); }
      await collection.insertOne({ symbol, timeframe, data, createdAt: new Date() });
    }
    const doc = await collection.findOne({ symbol, timeframe });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const lastPrice = doc.data[doc.data.length - 1].price;
    const newPrice = lastPrice + (Math.random() - 0.5) * lastPrice * 0.001;
    doc.data[doc.data.length - 1].price = newPrice;
    await collection.updateOne({ symbol, timeframe }, { $set: { data: doc.data } });
    return NextResponse.json({ symbol, timeframe, data: doc.data, current: newPrice, change: ((newPrice - doc.data[0].price) / doc.data[0].price) * 100, high: Math.max(...doc.data.map((d: any) => d.price)), low: Math.min(...doc.data.map((d: any) => d.price)), avg: doc.data.reduce((s: number, d: any) => s + d.price, 0) / doc.data.length });
  } catch (err) { console.error("[market/history]", err); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
