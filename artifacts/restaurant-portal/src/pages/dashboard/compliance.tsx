import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetRestaurantCompliance,
  getGetRestaurantComplianceQueryKey,
  useUpdateRestaurantCompliance,
  useUploadRestaurantDocument,
  useDeleteRestaurantDocument,
  UploadDocumentBodyDocumentType,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  ShieldCheck,
  CreditCard,
  FileText,
  Info,
  Loader2,
  Upload,
  Eye,
  Trash2,
  RefreshCw,
  Save,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocStatus = "not_submitted" | "pending_review" | "verified" | "rejected";

type DocMeta = {
  type: string;
  label: string;
  description: string;
  required: boolean;
  accept: string;
};

type ComplianceDoc = {
  id: string;
  restaurantId: string;
  documentType: string;
  fileName: string;
  fileType: string;
  fileSizeBytes?: string | null;
  status: DocStatus;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  notes?: string | null;
  uploadedAt: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_TYPES: DocMeta[] = [
  {
    type: "gstin_certificate",
    label: "GSTIN Certificate",
    description: "GST Registration Certificate from the GST Portal",
    required: true,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    type: "pan_card",
    label: "PAN Card",
    description: "Business PAN card or PAN allotment letter",
    required: true,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    type: "fssai_licence",
    label: "FSSAI Licence",
    description: "Food Business Operator (FBO) Licence from FSSAI",
    required: true,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    type: "trade_licence",
    label: "Trade / Shop Licence",
    description: "Trade Licence or Shop & Establishment certificate",
    required: true,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    type: "cancelled_cheque",
    label: "Cancelled Cheque",
    description: "Cancelled cheque leaf or bank passbook for account verification",
    required: true,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    type: "owner_aadhaar",
    label: "Owner / Director Aadhaar",
    description: "Aadhaar card of the proprietor or director",
    required: false,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    type: "owner_pan",
    label: "Owner / Director PAN",
    description: "Personal PAN card of the proprietor or director",
    required: false,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    type: "incorporation_certificate",
    label: "Incorporation / Partnership Deed",
    description: "Certificate of Incorporation (companies) or Partnership Deed",
    required: false,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    type: "utility_bill",
    label: "Utility Bill",
    description: "Electricity or water bill as address proof (within 3 months)",
    required: false,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    type: "menu_card",
    label: "Menu Card",
    description: "Printed or digital menu card listing all items and prices",
    required: false,
    accept: ".pdf,.jpg,.jpeg,.png,.webp",
  },
];

const BUSINESS_TYPES = [
  "Proprietorship",
  "Partnership",
  "LLP",
  "Private Limited",
  "Public Limited",
  "Others",
];

const ACCOUNT_TYPES = ["Savings", "Current"];

const INDIAN_STATES = [
  "Andaman & Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra & Nagar Haveli",
  "Daman & Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: string | null | undefined) {
  if (!bytes) return "";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix: "data:mime/type;base64,"
      const base64 = result.split(",")[1];
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function openBase64InNewTab(base64: string, mimeType: string, fileName: string) {
  const byteChars = atob(base64);
  const byteNums = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
  const blob = new Blob([byteNums], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DocStatusBadge({ status }: { status: DocStatus }) {
  if (status === "verified")
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
        <CheckCircle2 className="w-3 h-3" /> Verified
      </Badge>
    );
  if (status === "pending_review")
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
        <Clock className="w-3 h-3" /> Under Review
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
        <XCircle className="w-3 h-3" /> Rejected
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 gap-1">
      <FileText className="w-3 h-3" /> Not Uploaded
    </Badge>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

function DocumentCard({
  meta,
  doc,
  restaurantId,
  token,
  onUploaded,
}: {
  meta: DocMeta;
  doc?: ComplianceDoc;
  restaurantId: string;
  token: string;
  onUploaded: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notes, setNotes] = useState("");

  const uploadMutation = useUploadRestaurantDocument();
  const deleteMutation = useDeleteRestaurantDocument();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same file can be re-selected
    e.target.value = "";
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5 MB.", variant: "destructive" });
      return;
    }
    setPendingFile(file);
    setNotes("");
    setShowConfirm(true);
  };

  const handleUploadConfirm = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const fileContent = await readFileAsBase64(pendingFile);
      await uploadMutation.mutateAsync({
        restaurantId,
        data: {
          documentType: meta.type as UploadDocumentBodyDocumentType,
          fileName: pendingFile.name,
          fileType: pendingFile.type || "application/octet-stream",
          fileContent,
          fileSizeBytes: String(pendingFile.size),
          notes: notes || undefined,
        },
      });
      toast({ title: "Document uploaded", description: `${meta.label} submitted for review.` });
      setShowConfirm(false);
      setPendingFile(null);
      onUploaded();
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleView = async () => {
    if (!doc) return;
    setViewing(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(
        `${base}/api/restaurant-portal/restaurants/${restaurantId}/compliance/documents/${doc.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      openBase64InNewTab(data.fileContent, doc.fileType, doc.fileName);
    } catch {
      toast({ title: "Failed to load document", variant: "destructive" });
    } finally {
      setViewing(false);
    }
  };

  const handleDelete = async () => {
    if (!doc) return;
    try {
      await deleteMutation.mutateAsync({ restaurantId, documentId: doc.id });
      toast({ title: "Document removed" });
      onUploaded();
    } catch {
      toast({ title: "Failed to remove document", variant: "destructive" });
    }
  };

  const status: DocStatus = doc?.status ?? "not_submitted";
  const canReplace = doc && status !== "verified";
  const isDeleting = deleteMutation.isPending;

  return (
    <>
      <Card className={`bg-card border ${status === "rejected" ? "border-red-200" : status === "verified" ? "border-green-100" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              status === "verified" ? "bg-green-50" :
              status === "rejected" ? "bg-red-50" :
              status === "pending_review" ? "bg-amber-50" :
              "bg-slate-50"
            }`}>
              <FileText className={`w-5 h-5 ${
                status === "verified" ? "text-green-600" :
                status === "rejected" ? "text-red-600" :
                status === "pending_review" ? "text-amber-600" :
                "text-slate-400"
              }`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                {meta.required ? (
                  <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50 py-0">Required</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200 bg-slate-50 py-0">Optional</Badge>
                )}
                <DocStatusBadge status={status} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>

              {doc && (
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">{doc.fileName}</span>
                  {doc.fileSizeBytes && (
                    <span className="text-xs text-muted-foreground">({formatBytes(doc.fileSizeBytes)})</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    · Uploaded {format(new Date(doc.uploadedAt), "d MMM yyyy")}
                  </span>
                </div>
              )}

              {status === "rejected" && doc?.rejectionReason && (
                <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs font-medium text-red-700">Reason: {doc.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {doc && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={handleView}
                  disabled={viewing}
                >
                  {viewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              )}

              {status === "verified" ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
                  <Lock className="w-3 h-3" /> Locked
                </div>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant={doc ? "outline" : "default"}
                    className="h-8 text-xs gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || isDeleting}
                  >
                    {canReplace ? (
                      <><RefreshCw className="w-3.5 h-3.5" /> Replace</>
                    ) : (
                      <><Upload className="w-3.5 h-3.5" /> Upload</>
                    )}
                  </Button>

                  {doc && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleDelete}
                      disabled={isDeleting || uploading}
                    >
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept={meta.accept}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Confirm upload dialog */}
      <Dialog open={showConfirm} onOpenChange={(o) => { if (!uploading) setShowConfirm(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Upload {meta.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-sm font-medium truncate">{pendingFile?.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(String(pendingFile?.size ?? 0))}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes for reviewer (optional)</label>
              <Textarea
                className="text-sm resize-none"
                rows={2}
                placeholder="e.g. This is the renewed licence valid until March 2026"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={uploading}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUploadConfirm} disabled={uploading} className="gap-1.5">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Submit</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Profile Form ─────────────────────────────────────────────────────────────

type ProfileFields = {
  legalName: string;
  tradeName: string;
  businessType: string;
  gstin: string;
  pan: string;
  fssaiLicenceNo: string;
  fssaiExpiry: string;
  registeredAddress: string;
  city: string;
  state: string;
  pinCode: string;
  bankHolderName: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  ifscCode: string;
  upiId: string;
};

function emptyFields(): ProfileFields {
  return {
    legalName: "", tradeName: "", businessType: "", gstin: "", pan: "",
    fssaiLicenceNo: "", fssaiExpiry: "", registeredAddress: "", city: "",
    state: "", pinCode: "", bankHolderName: "", bankName: "",
    accountNumber: "", accountType: "", ifscCode: "", upiId: "",
  };
}

function profileFromData(p: Record<string, unknown> | null | undefined): ProfileFields {
  if (!p) return emptyFields();
  const s = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "") ?? "";
  return {
    legalName: s("legalName"), tradeName: s("tradeName"), businessType: s("businessType"),
    gstin: s("gstin"), pan: s("pan"), fssaiLicenceNo: s("fssaiLicenceNo"),
    fssaiExpiry: s("fssaiExpiry"), registeredAddress: s("registeredAddress"),
    city: s("city"), state: s("state"), pinCode: s("pinCode"),
    bankHolderName: s("bankHolderName"), bankName: s("bankName"),
    accountNumber: s("accountNumber"), accountType: s("accountType"),
    ifscCode: s("ifscCode"), upiId: s("upiId"),
  };
}

function ProfileForm({
  restaurantId,
  initialData,
  bankVerified,
  payoutsEnabled,
  onSaved,
}: {
  restaurantId: string;
  initialData: Record<string, unknown> | null | undefined;
  bankVerified: boolean;
  payoutsEnabled: boolean;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [fields, setFields] = useState<ProfileFields>(() => profileFromData(initialData));
  const [dirty, setDirty] = useState(false);
  const updateMutation = useUpdateRestaurantCompliance();

  // Sync when remote data arrives
  useEffect(() => {
    setFields(profileFromData(initialData));
    setDirty(false);
  }, [initialData]);

  const set = (k: keyof ProfileFields, v: string) => {
    setFields((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ restaurantId, data: fields });
      toast({ title: "Profile saved", description: "Your compliance details have been updated." });
      setDirty(false);
      onSaved();
    } catch {
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    }
  };

  const isSaving = updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Business Info */}
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4 text-primary" /> Business Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Legal Business Name</label>
              <Input
                value={fields.legalName}
                onChange={(e) => set("legalName", e.target.value)}
                placeholder="As per PAN / registration"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Trade / Brand Name</label>
              <Input
                value={fields.tradeName}
                onChange={(e) => set("tradeName", e.target.value)}
                placeholder="Name displayed to customers"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Business Type</label>
            <Select value={fields.businessType} onValueChange={(v) => set("businessType", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select business type…" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                GSTIN <span className="text-red-500">*</span>
              </label>
              <Input
                value={fields.gstin}
                onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                PAN <span className="text-red-500">*</span>
              </label>
              <Input
                value={fields.pan}
                onChange={(e) => set("pan", e.target.value.toUpperCase())}
                placeholder="AAAAA0000A"
                maxLength={10}
                className="font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                FSSAI Licence No. <span className="text-red-500">*</span>
              </label>
              <Input
                value={fields.fssaiLicenceNo}
                onChange={(e) => set("fssaiLicenceNo", e.target.value)}
                placeholder="14-digit FSSAI number"
                maxLength={14}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">FSSAI Expiry Date</label>
              <Input
                type="date"
                value={fields.fssaiExpiry}
                onChange={(e) => set("fssaiExpiry", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Registered Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Street / Building</label>
            <Textarea
              value={fields.registeredAddress}
              onChange={(e) => set("registeredAddress", e.target.value)}
              placeholder="Building name, street, area…"
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">City</label>
              <Input
                value={fields.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Mumbai"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">State</label>
              <Select value={fields.state} onValueChange={(v) => set("state", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state…" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">PIN Code</label>
              <Input
                value={fields.pinCode}
                onChange={(e) => set("pinCode", e.target.value.replace(/\D/g, ""))}
                placeholder="400001"
                maxLength={6}
                className="font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank */}
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="w-4 h-4 text-primary" /> Bank Account Details
            </CardTitle>
            {bankVerified && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {bankVerified && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
              Bank account is verified. To update bank details, contact your account manager.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Account Holder Name</label>
              <Input
                value={fields.bankHolderName}
                onChange={(e) => set("bankHolderName", e.target.value)}
                placeholder="Exact name as on cheque"
                disabled={bankVerified}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bank Name</label>
              <Input
                value={fields.bankName}
                onChange={(e) => set("bankName", e.target.value)}
                placeholder="e.g. HDFC Bank"
                disabled={bankVerified}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Account Number</label>
              <Input
                value={fields.accountNumber}
                onChange={(e) => set("accountNumber", e.target.value.replace(/\D/g, ""))}
                placeholder="Account number"
                className="font-mono"
                disabled={bankVerified}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Account Type</label>
              <Select
                value={fields.accountType}
                onValueChange={(v) => set("accountType", v)}
                disabled={bankVerified}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">IFSC Code</label>
              <Input
                value={fields.ifscCode}
                onChange={(e) => set("ifscCode", e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                maxLength={11}
                className="font-mono"
                disabled={bankVerified}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">UPI ID (optional)</label>
              <Input
                value={fields.upiId}
                onChange={(e) => set("upiId", e.target.value)}
                placeholder="yourname@upi"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          <span className="text-red-500">*</span> Required for payouts
        </p>
        <Button onClick={handleSave} disabled={isSaving || !dirty} className="gap-1.5 min-w-[120px]">
          {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const { activeRestaurantId, token } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetRestaurantCompliance(
    activeRestaurantId!,
    {
      query: {
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantComplianceQueryKey(activeRestaurantId!),
      },
    },
  );

  if (!activeRestaurantId) return null;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const profile = data?.profile ?? null;
  const documents: ComplianceDoc[] = (data?.documents ?? []) as ComplianceDoc[];
  const bankVerified = profile?.bankVerified ?? false;
  const payoutsEnabled = profile?.payoutsEnabled ?? false;
  const agreementSigned = profile?.agreementSigned ?? false;

  // Derive blockers
  const docByType = Object.fromEntries(documents.map((d) => [d.documentType, d]));
  const requiredTypes = DOC_TYPES.filter((d) => d.required).map((d) => d.type);
  const missingRequiredDocs = requiredTypes.filter(
    (t) => !docByType[t] || docByType[t]!.status === "not_submitted",
  );
  const rejectedDocs = requiredTypes.filter((t) => docByType[t]?.status === "rejected");
  const missingProfileFields = [
    !profile?.gstin && "GSTIN not provided",
    !profile?.pan && "PAN not provided",
    !profile?.fssaiLicenceNo && "FSSAI Licence No. not provided",
    !bankVerified && "Bank account not verified",
  ].filter(Boolean) as string[];

  const hasMissingDocs = missingRequiredDocs.length > 0;
  const hasRejectedDocs = rejectedDocs.length > 0;
  const hasBlockers = missingProfileFields.length > 0 || hasMissingDocs || hasRejectedDocs;

  const docsVerified = requiredTypes.every((t) => docByType[t]?.status === "verified");

  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: getGetRestaurantComplianceQueryKey(activeRestaurantId),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance</h1>
          <p className="text-muted-foreground mt-1">
            KYC profile, business documents, and bank details. Payouts are enabled once all required
            items are verified.
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${
          payoutsEnabled
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          {payoutsEnabled ? (
            <><CheckCircle2 className="w-4 h-4" /> Payouts active</>
          ) : (
            <><Clock className="w-4 h-4" /> Payouts paused</>
          )}
        </div>
      </div>

      {/* Blockers banner */}
      {hasBlockers && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-red-800">Verification incomplete — payouts are paused</p>
            {missingProfileFields.map((b) => (
              <div key={b} className="flex items-center gap-1.5 text-sm text-red-700">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> {b}
              </div>
            ))}
            {missingRequiredDocs.map((t) => {
              const m = DOC_TYPES.find((d) => d.type === t)!;
              return (
                <div key={t} className="flex items-center gap-1.5 text-sm text-red-700">
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> {m.label} not uploaded
                </div>
              );
            })}
            {rejectedDocs.map((t) => {
              const m = DOC_TYPES.find((d) => d.type === t)!;
              return (
                <div key={t} className="flex items-center gap-1.5 text-sm text-red-700">
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> {m.label} was rejected — re-upload required
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status mini-cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: "GSTIN on file", ok: !!profile?.gstin, icon: FileText },
          { label: "FSSAI Licence", ok: !!profile?.fssaiLicenceNo, icon: ShieldCheck },
          { label: "Bank Account", ok: bankVerified, icon: CreditCard },
          { label: "Documents", ok: docsVerified, partial: !hasMissingDocs && !docsVerified, icon: CheckCircle2 },
        ].map(({ label, ok, partial, icon: Icon }) => (
          <Card key={label} className="bg-card">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                ok ? "bg-green-50" : partial ? "bg-amber-50" : "bg-red-50"
              }`}>
                <Icon className={`w-4 h-4 ${ok ? "text-green-600" : partial ? "text-amber-600" : "text-red-500"}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xs font-semibold ${ok ? "text-green-700" : partial ? "text-amber-600" : "text-red-600"}`}>
                  {ok ? "Verified" : partial ? "Under review" : "Incomplete"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Business Profile</TabsTrigger>
          <TabsTrigger value="documents">
            Documents
            {(hasMissingDocs || hasRejectedDocs) && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
                {missingRequiredDocs.length + rejectedDocs.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-0">
          <ProfileForm
            restaurantId={activeRestaurantId}
            initialData={profile as Record<string, unknown> | null}
            bankVerified={bankVerified}
            payoutsEnabled={payoutsEnabled}
            onSaved={refresh}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          {/* Required */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-foreground">Required Documents</h2>
              <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50">
                Mandatory for payouts
              </Badge>
            </div>
            <div className="space-y-3">
              {DOC_TYPES.filter((d) => d.required).map((meta) => (
                <DocumentCard
                  key={meta.type}
                  meta={meta}
                  doc={docByType[meta.type]}
                  restaurantId={activeRestaurantId}
                  token={token!}
                  onUploaded={refresh}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Optional */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-foreground">Additional Documents</h2>
              <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200 bg-slate-50">
                Optional
              </Badge>
            </div>
            <div className="space-y-3">
              {DOC_TYPES.filter((d) => !d.required).map((meta) => (
                <DocumentCard
                  key={meta.type}
                  meta={meta}
                  doc={docByType[meta.type]}
                  restaurantId={activeRestaurantId}
                  token={token!}
                  onUploaded={refresh}
                />
              ))}
            </div>
          </div>

          {/* Regulatory note */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex gap-3">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800 leading-relaxed">
              <span className="font-semibold">Accepted formats:</span> PDF, JPG, PNG. Max file size 5 MB per document.
              All documents are encrypted at rest and accessed only by the compliance team.
              Documents marked <strong>Verified</strong> are locked — contact your account manager to update them.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Tax note */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex gap-3">
        <ShieldCheck className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold">Regulatory note:</span> Meal Pass operates as an e-commerce operator (ECO)
          under Section 9(5) of the CGST Act. GST on restaurant services supplied through the platform is discharged
          by the platform. Restaurants receive net settlements after platform commission. A separate commission invoice
          (18% GST on commission) is issued by the platform. SAC code 996331 applies.
        </p>
      </div>
    </div>
  );
}
