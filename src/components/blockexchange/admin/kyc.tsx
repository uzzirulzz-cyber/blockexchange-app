"use client";

/**
 * BlockExchange admin — KYC Verifications section.
 *
 * Lists all KYC submissions with status filter.
 * Click to view full document images + approve/reject.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Search, ShieldCheck, Loader2, Check, X, IdCard, FileText, CreditCard,
  Eye, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  SectionHeader, SectionShell, StatusBadge,
} from "./shared";

interface KycDoc {
  id: string;
  docType: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  frontImage: string;
  backImage?: string | null;
  selfieImage?: string | null;
  user: { id: string; uid: string; name: string; email: string };
}

interface KycProps {
  userId: string;
  syncTick: number;
}

export function AdminKyc({ userId, syncTick }: KycProps) {
  const [docs, setDocs] = useState<KycDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [query, setQuery] = useState("");
  const [viewDoc, setViewDoc] = useState<KycDoc | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/kyc?status=${filter === "ALL" ? "" : filter}`, {
      headers: { "x-user-id": userId },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ documents: KycDoc[] }>;
      })
      .then((data) => !cancelled && setDocs(data.documents))
      .catch((err) => toast.error("Failed to load KYC documents", { description: String(err) }))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [userId, syncTick, filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.user.name.toLowerCase().includes(q) ||
        d.user.email.toLowerCase().includes(q) ||
        d.user.uid.toLowerCase().includes(q)
    );
  }, [docs, query]);

  const stats = useMemo(() => ({
    total: docs.length,
    pending: docs.filter((d) => d.status === "PENDING").length,
    approved: docs.filter((d) => d.status === "APPROVED").length,
    rejected: docs.filter((d) => d.status === "REJECTED").length,
  }), [docs]);

  async function handleAction(action: "APPROVE" | "REJECT") {
    if (!viewDoc) return;
    if (action === "REJECT" && !rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({
          id: viewDoc.id,
          action,
          rejectReason: action === "REJECT" ? rejectReason : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success(action === "APPROVE" ? "KYC approved — user notified" : "KYC rejected — user notified");
      setViewDoc(null);
      setRejectMode(false);
      setRejectReason("");
      load();
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  const docIcon = (t: string) =>
    t === "PASSPORT" ? CreditCard : t === "DRIVING_LICENSE" ? IdCard : FileText;

  return (
    <SectionShell>
      <SectionHeader
        title="KYC Verifications"
        description="Review and approve identity document submissions"
        icon={ShieldCheck}
      />

      {/* Stat chips */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "#0ea5ff" },
          { label: "Pending", value: stats.pending, color: "#f5a623" },
          { label: "Approved", value: stats.approved, color: "#00c853" },
          { label: "Rejected", value: stats.rejected, color: "#ff3b30" },
        ].map((s) => (
          <div key={s.label} className="bx-glass-soft rounded-lg px-3 py-2">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-sm font-semibold tabular-nums" style={{ color: s.color }}>
              {s.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs + search */}
      <div className="bx-glass rounded-xl p-4 space-y-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="APPROVED">Approved</TabsTrigger>
            <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
            <TabsTrigger value="ALL">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by user name, email, or UID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-background/40"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bx-glass rounded-xl overflow-hidden">
        <div className="max-h-[520px] overflow-y-auto bx-scroll">
          <Table>
            <TableHeader className="sticky top-0 bg-[#0d162a]/95 backdrop-blur z-10">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wider px-4">User</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Document</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Submitted</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wider text-right px-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading...
                </TableCell></TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                  No KYC submissions found.
                </TableCell></TableRow>
              )}
              {!loading && filtered.map((d) => {
                const Icon = docIcon(d.docType);
                return (
                  <TableRow key={d.id} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell className="px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                          {d.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">{d.user.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{d.user.email}</div>
                          <div className="text-[10px] font-mono text-[#0ea5ff]">{d.user.uid}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-white">{d.docType.replace("_", " ")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        d.status === "APPROVED" ? "bg-[#00c853]/15 text-[#00c853]" :
                        d.status === "PENDING" ? "bg-[#f5a623]/15 text-[#f5a623]" :
                        "bg-[#ff3b30]/15 text-[#ff3b30]"
                      }>
                        {d.status.charAt(0) + d.status.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(d.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => { setViewDoc(d); setRejectMode(false); }}>
                        <Eye className="w-3.5 h-3.5 mr-1.5" /> Review
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Review dialog */}
      <Dialog open={!!viewDoc} onOpenChange={(v) => !v && setViewDoc(null)}>
        <DialogContent className="bg-[#0a1428] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KYC Review</DialogTitle>
            <DialogDescription>
              {viewDoc?.user.name} · {viewDoc?.user.email} · UID {viewDoc?.user.uid}
            </DialogDescription>
          </DialogHeader>
          {viewDoc && (
            <div className="space-y-4">
              {/* Document images */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Front</Label>
                  <img src={viewDoc.frontImage} alt="Front" className="w-full rounded-lg border border-white/10" />
                </div>
                {viewDoc.backImage && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Back</Label>
                    <img src={viewDoc.backImage} alt="Back" className="w-full rounded-lg border border-white/10" />
                  </div>
                )}
              </div>
              {viewDoc.selfieImage && (
                <div>
                  <Label className="text-xs text-muted-foreground">Selfie with Document</Label>
                  <img src={viewDoc.selfieImage} alt="Selfie" className="w-full max-w-xs rounded-lg border border-white/10" />
                </div>
              )}

              {/* Doc details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-white/[0.02]">
                  <div className="text-xs text-muted-foreground">Document Type</div>
                  <div className="text-white">{viewDoc.docType.replace("_", " ")}</div>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02]">
                  <div className="text-xs text-muted-foreground">Submitted</div>
                  <div className="text-white">{new Date(viewDoc.createdAt).toLocaleString()}</div>
                </div>
              </div>

              {/* Reject reason (only in reject mode) */}
              {rejectMode ? (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Rejection Reason *</Label>
                  <Textarea
                    placeholder="e.g. Photo is blurry, please resubmit with a clearer image..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              ) : viewDoc.status === "PENDING" ? (
                <div className="bg-[#f5a623]/10 border border-[#f5a623]/30 rounded-lg p-3 text-xs text-[#f5a623]">
                  Review the document images carefully. Approving will mark the user as verified. Rejecting will notify the user with your reason.
                </div>
              ) : null}

              {/* Actions */}
              {viewDoc.status === "PENDING" && (
                <DialogFooter className="gap-2">
                  {rejectMode ? (
                    <>
                      <Button variant="ghost" onClick={() => { setRejectMode(false); setRejectReason(""); }}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleAction("REJECT")}
                        disabled={actionLoading || !rejectReason.trim()}
                        className="bg-gradient-to-r from-[#ff3b30] to-[#c62828] text-white"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                        Confirm Rejection
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setRejectMode(true)}>
                        <X className="w-4 h-4 mr-2 text-[#ff3b30]" /> Reject
                      </Button>
                      <Button
                        onClick={() => handleAction("APPROVE")}
                        disabled={actionLoading}
                        className="bg-gradient-to-r from-[#00c853] to-[#00a040] text-white"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                        Approve
                      </Button>
                    </>
                  )}
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SectionShell>
  );
}
