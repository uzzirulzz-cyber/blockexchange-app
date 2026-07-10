"use client";

/**
 * BlockExchange — KYC Verification view.
 *
 * Lets users upload identity documents (passport / driving license / national ID)
 * for admin verification. Stored as base64 in the DB.
 *
 * Black theme, iPhone-style UI.
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Toaster as SonnerToaster, toast } from "sonner";
import {
  Shield, FileText, CreditCard, IdCard, Camera, Loader2, Check, X,
  Upload, ArrowLeft, AlertCircle, Clock, CheckCircle2, XCircle,
} from "lucide-react";

type DocType = "PASSPORT" | "DRIVING_LICENSE" | "NATIONAL_ID";

interface KycDoc {
  id: string;
  docType: DocType;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  frontImage: string;
  backImage?: string | null;
  selfieImage?: string | null;
}

const DOC_OPTIONS: { value: DocType; label: string; icon: any; desc: string }[] = [
  { value: "PASSPORT", label: "Passport", icon: CreditCard, desc: "Photo page of your passport" },
  { value: "DRIVING_LICENSE", label: "Driving License", icon: IdCard, desc: "Front and back of license" },
  { value: "NATIONAL_ID", label: "National ID", icon: FileText, desc: "Government-issued ID card" },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function KycView() {
  const { user, navigate } = useAuth();
  const [docs, setDocs] = useState<KycDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [docType, setDocType] = useState<DocType>("PASSPORT");
  const [frontImg, setFrontImg] = useState<string>("");
  const [backImg, setBackImg] = useState<string>("");
  const [selfieImg, setSelfieImg] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/kyc", { headers: { "x-user-id": user.id } })
      .then((r) => r.json())
      .then((d) => setDocs(d.documents || []))
      .catch(() => toast.error("Failed to load KYC documents"))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return <main className="flex-1 pt-20 flex items-center justify-center"><Button onClick={() => navigate("login")}>Please login</Button></main>;
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image too large. Max 3MB.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setter(dataUrl);
      toast.success("Image added");
    } catch {
      toast.error("Failed to read image");
    }
  }

  function resetForm() {
    setDocType("PASSPORT");
    setFrontImg("");
    setBackImg("");
    setSelfieImg("");
    setSubmitOpen(false);
  }

  async function handleSubmit() {
    if (!frontImg) {
      toast.error("Front of document is required");
      return;
    }
    if (docType !== "PASSPORT" && !backImg) {
      toast.error("Back of document is required for license/ID");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user!.id },
        body: JSON.stringify({
          docType,
          frontImage: frontImg,
          backImage: backImg || undefined,
          selfieImage: selfieImg || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Submission failed");
        return;
      }
      toast.success("KYC submitted for review");
      setDocs((prev) => [data.document, ...prev]);
      resetForm();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const currentStatus = user.kycStatus || "PENDING";
  const hasPending = docs.some((d) => d.status === "PENDING");
  const hasApproved = docs.some((d) => d.status === "APPROVED");

  return (
    <main className="flex-1 pt-20 pb-10 bx-fade-in bg-black min-h-screen">
      <SonnerToaster richColors position="top-center" />
      <div className="mx-auto max-w-2xl lg:max-w-4xl px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <button
            onClick={() => navigate("profile")}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-[#0ea5ff]" />
            Identity Verification
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Verify your identity to unlock deposits, withdrawals, and trading
          </p>
        </motion.div>

        {/* Status card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`rounded-2xl p-6 mb-6 border ${
            currentStatus === "VERIFIED"
              ? "bg-[#00c853]/10 border-[#00c853]/30"
              : currentStatus === "PENDING_REVIEW"
              ? "bg-[#f5a623]/10 border-[#f5a623]/30"
              : currentStatus === "REJECTED"
              ? "bg-[#ff3b30]/10 border-[#ff3b30]/30"
              : "bg-zinc-900 border-zinc-800"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
              currentStatus === "VERIFIED"
                ? "bg-[#00c853]/20 text-[#00c853]"
                : currentStatus === "PENDING_REVIEW"
                ? "bg-[#f5a623]/20 text-[#f5a623]"
                : currentStatus === "REJECTED"
                ? "bg-[#ff3b30]/20 text-[#ff3b30]"
                : "bg-zinc-800 text-gray-400"
            }`}>
              {currentStatus === "VERIFIED" ? <CheckCircle2 className="w-7 h-7" /> :
               currentStatus === "PENDING_REVIEW" ? <Clock className="w-7 h-7" /> :
               currentStatus === "REJECTED" ? <XCircle className="w-7 h-7" /> :
               <Shield className="w-7 h-7" />}
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-400">Verification Status</div>
              <div className="text-xl font-bold text-white mt-0.5">
                {currentStatus === "VERIFIED" ? "Verified" :
                 currentStatus === "PENDING_REVIEW" ? "Under Review" :
                 currentStatus === "REJECTED" ? "Rejected" :
                 "Not Submitted"}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {currentStatus === "VERIFIED" ? "Your identity is verified ✓" :
                 currentStatus === "PENDING_REVIEW" ? "Admin is reviewing your documents (usually 1-24h)" :
                 currentStatus === "REJECTED" ? "Your last submission was rejected — please resubmit" :
                 "Submit your documents to start verification"}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Submit button (only if not verified and no pending) */}
        {currentStatus !== "VERIFIED" && !hasPending && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6"
          >
            <h2 className="text-lg font-semibold text-white mb-2">Submit Your Documents</h2>
            <p className="text-sm text-gray-400 mb-4">
              Choose a document type to upload. Make sure photos are clear, well-lit, and show all four corners.
            </p>
            <Button
              onClick={() => setSubmitOpen(true)}
              className="w-full h-12 bg-gradient-to-r from-[#2196F3] to-[#0D47A1] hover:opacity-90 text-white"
            >
              <Upload className="w-4 h-4 mr-2" /> Start Verification
            </Button>
          </motion.div>
        )}

        {/* Documents list */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Submission History</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading...
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No KYC submissions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-4 rounded-xl bg-black/40 border border-zinc-800">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-gray-400 shrink-0">
                    {d.docType === "PASSPORT" ? <CreditCard className="w-5 h-5" /> :
                     d.docType === "DRIVING_LICENSE" ? <IdCard className="w-5 h-5" /> :
                     <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">
                      {d.docType.replace("_", " ")}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(d.createdAt).toLocaleString()}
                    </div>
                    {d.status === "REJECTED" && d.rejectReason && (
                      <div className="text-xs text-[#ff3b30] mt-1">
                        Reason: {d.rejectReason}
                      </div>
                    )}
                  </div>
                  <Badge className={
                    d.status === "APPROVED" ? "bg-[#00c853]/15 text-[#00c853]" :
                    d.status === "PENDING" ? "bg-[#f5a623]/15 text-[#f5a623]" :
                    "bg-[#ff3b30]/15 text-[#ff3b30]"
                  }>
                    {d.status === "APPROVED" ? "Approved" :
                     d.status === "PENDING" ? "Pending" : "Rejected"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-[#0ea5ff]/5 border border-[#0ea5ff]/20 rounded-2xl p-5"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#0ea5ff] shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-white mb-1">Photo Tips</div>
              <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                <li>Use good lighting — avoid shadows and glare</li>
                <li>Show all four corners of the document</li>
                <li>Make sure all text is clearly readable</li>
                <li>Use the original document (no photocopies or scans)</li>
                <li>For selfie: hold the document next to your face</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Submit dialog */}
      <Dialog open={submitOpen} onOpenChange={(v) => !v && resetForm()}>
        <DialogContent className="bg-black border-zinc-800 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Submit KYC Document</DialogTitle>
            <DialogDescription className="text-gray-400">
              Upload a clear photo of your identity document
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Document type */}
            <div>
              <Label className="text-xs text-gray-400">Document Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {DOC_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = docType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setDocType(opt.value);
                        setBackImg(""); // reset back when switching (passport doesn't need back)
                      }}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        active
                          ? "bg-[#0ea5ff]/10 border-[#0ea5ff] text-white"
                          : "bg-zinc-900 border-zinc-800 text-gray-400 hover:border-zinc-700"
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1.5" />
                      <div className="text-[10px] font-medium">{opt.label}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                {DOC_OPTIONS.find((o) => o.value === docType)?.desc}
              </p>
            </div>

            {/* Front image */}
            <div>
              <Label className="text-xs text-gray-400">Front of Document *</Label>
              <input
                ref={frontRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFile(e, setFrontImg)}
                className="hidden"
              />
              <button
                onClick={() => frontRef.current?.click()}
                className="w-full mt-2 aspect-[4/3] rounded-xl border-2 border-dashed border-zinc-700 hover:border-[#0ea5ff] bg-zinc-900 flex items-center justify-center overflow-hidden transition-colors"
              >
                {frontImg ? (
                  <img src={frontImg} alt="Front" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Camera className="w-8 h-8 text-gray-500 mx-auto mb-1" />
                    <div className="text-xs text-gray-500">Tap to take photo</div>
                  </div>
                )}
              </button>
              {frontImg && (
                <button
                  onClick={() => setFrontImg("")}
                  className="mt-1 text-xs text-[#ff3b30] hover:underline"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Back image (not for passport) */}
            {docType !== "PASSPORT" && (
              <div>
                <Label className="text-xs text-gray-400">Back of Document *</Label>
                <input
                  ref={backRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFile(e, setBackImg)}
                  className="hidden"
                />
                <button
                  onClick={() => backRef.current?.click()}
                  className="w-full mt-2 aspect-[4/3] rounded-xl border-2 border-dashed border-zinc-700 hover:border-[#0ea5ff] bg-zinc-900 flex items-center justify-center overflow-hidden transition-colors"
                >
                  {backImg ? (
                    <img src={backImg} alt="Back" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-gray-500 mx-auto mb-1" />
                      <div className="text-xs text-gray-500">Tap to take photo</div>
                    </div>
                  )}
                </button>
                {backImg && (
                  <button
                    onClick={() => setBackImg("")}
                    className="mt-1 text-xs text-[#ff3b30] hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}

            {/* Selfie (optional) */}
            <div>
              <Label className="text-xs text-gray-400">Selfie with Document (optional)</Label>
              <input
                ref={selfieRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => handleFile(e, setSelfieImg)}
                className="hidden"
              />
              <button
                onClick={() => selfieRef.current?.click()}
                className="w-full mt-2 aspect-[4/3] rounded-xl border-2 border-dashed border-zinc-700 hover:border-[#0ea5ff] bg-zinc-900 flex items-center justify-center overflow-hidden transition-colors"
              >
                {selfieImg ? (
                  <img src={selfieImg} alt="Selfie" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Camera className="w-8 h-8 text-gray-500 mx-auto mb-1" />
                    <div className="text-xs text-gray-500">Tap to take selfie</div>
                  </div>
                )}
              </button>
              {selfieImg && (
                <button
                  onClick={() => setSelfieImg("")}
                  className="mt-1 text-xs text-[#ff3b30] hover:underline"
                >
                  Remove
                </button>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !frontImg || (docType !== "PASSPORT" && !backImg)}
              className="w-full h-12 bg-gradient-to-r from-[#2196F3] to-[#0D47A1] hover:opacity-90 text-white"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Submit for Verification</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
