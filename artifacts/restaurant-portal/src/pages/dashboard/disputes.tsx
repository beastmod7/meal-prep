import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  FileSearch,
  User,
  Calendar,
  Link2,
  Paperclip,
  IndianRupee,
  Info,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { format, subDays, subHours } from "date-fns";
import { inr } from "@/lib/fmt";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type DisputeStatus = "open" | "under_review" | "resolved" | "rejected";

type Dispute = {
  id: string;
  raisedAt: Date;
  linkedRef: string;
  linkedType: "order" | "cancellation" | "settlement";
  reasonCode: ReasonCode;
  description: string;
  status: DisputeStatus;
  createdBy: string;
  approvedBy: string | null;
  resolvedAt: Date | null;
  adminDecision: string | null;
  adjustmentApplied: number | null;
  settlementImpact: "pending" | "applied" | "none" | null;
  proofAttached: boolean;
};

type ReasonCode =
  | "meal_delivered"
  | "cancelled_after_eating"
  | "wrong_refund_deduction"
  | "wrong_package_count"
  | "duplicate_charge"
  | "other";

// ─── Constants ────────────────────────────────────────────────────────────────

const REASON_CODES: { value: ReasonCode; label: string; description: string }[] = [
  {
    value: "meal_delivered",
    label: "Meal was delivered",
    description: "Customer or system shows cancellation but meal was prepared and delivered.",
  },
  {
    value: "cancelled_after_eating",
    label: "Customer cancelled after eating",
    description: "Customer requested refund after the meal was already consumed.",
  },
  {
    value: "wrong_refund_deduction",
    label: "Refund deduction incorrect",
    description: "Settlement deducted a refund amount that should not have been applied.",
  },
  {
    value: "wrong_package_count",
    label: "Wrong package meal count",
    description: "The number of meals shown in the package does not match what was delivered.",
  },
  {
    value: "duplicate_charge",
    label: "Duplicate commission charge",
    description: "Platform commission has been deducted more than once for the same order.",
  },
  {
    value: "other",
    label: "Other",
    description: "Other issue not listed above. Please describe in detail.",
  },
];

const LINKED_REFS = [
  { value: "ORD-20250-8821", label: "ORD-20250-8821 — Lunch, 12 May 2025", type: "order" as const },
  { value: "ORD-20250-8743", label: "ORD-20250-8743 — Dinner, 10 May 2025", type: "order" as const },
  { value: "CAN-20250-1193", label: "CAN-20250-1193 — Cancellation, 8 May 2025", type: "cancellation" as const },
  { value: "SET-W19-2025", label: "SET-W19-2025 — Week 19 Settlement", type: "settlement" as const },
  { value: "ORD-20250-8612", label: "ORD-20250-8612 — Lunch, 5 May 2025", type: "order" as const },
];

const NOW = new Date();

const MOCK_DISPUTES: Dispute[] = [
  {
    id: "DIS-2025-0011",
    raisedAt: subDays(NOW, 2),
    linkedRef: "CAN-20250-1193",
    linkedType: "cancellation",
    reasonCode: "cancelled_after_eating",
    description:
      "Student scanned QR code at 12:45 PM confirming meal collection, then raised a cancellation request at 1:10 PM. Meal was consumed. Attached QR scan log as proof.",
    status: "under_review",
    createdBy: "Raj Sharma",
    approvedBy: null,
    resolvedAt: null,
    adminDecision: null,
    adjustmentApplied: null,
    settlementImpact: "pending",
    proofAttached: true,
  },
  {
    id: "DIS-2025-0010",
    raisedAt: subDays(NOW, 9),
    linkedRef: "ORD-20250-8743",
    linkedType: "order",
    reasonCode: "meal_delivered",
    description:
      "System shows this dinner order as cancelled (no-show) but kitchen log and delivery record confirm the meal was prepared and handed over at 7:30 PM.",
    status: "resolved",
    createdBy: "Priya Verma",
    approvedBy: "Platform Admin",
    resolvedAt: subDays(NOW, 5),
    adminDecision: "Dispute upheld. QR log confirmed meal delivery. Settlement adjusted in Week 18 payout.",
    adjustmentApplied: 149,
    settlementImpact: "applied",
    proofAttached: true,
  },
  {
    id: "DIS-2025-0009",
    raisedAt: subDays(NOW, 15),
    linkedRef: "SET-W19-2025",
    linkedType: "settlement",
    reasonCode: "duplicate_charge",
    description:
      "Commission of ₹720 appears to have been deducted twice in the Week 19 settlement statement. Both deductions reference the same order batch.",
    status: "rejected",
    createdBy: "Raj Sharma",
    approvedBy: "Platform Admin",
    resolvedAt: subDays(NOW, 11),
    adminDecision:
      "Dispute not upheld. The two deductions correspond to two separate settlement batches (Mon–Thu and Fri–Sun) that were both processed in the same week. No duplicate found.",
    adjustmentApplied: 0,
    settlementImpact: "none",
    proofAttached: false,
  },
  {
    id: "DIS-2025-0008",
    raisedAt: subDays(NOW, 22),
    linkedRef: "ORD-20250-8612",
    linkedType: "order",
    reasonCode: "wrong_refund_deduction",
    description:
      "Refund of ₹1,333 was deducted from our settlement for a subscription that was cancelled within the free window (more than 24 hours before the first meal). No deduction should apply.",
    status: "resolved",
    createdBy: "Raj Sharma",
    approvedBy: "Platform Admin",
    resolvedAt: subDays(NOW, 18),
    adminDecision:
      "Dispute upheld. Subscription cancellation timestamp confirmed within free cancellation window. Full ₹1,333 restored in Week 17 settlement.",
    adjustmentApplied: 1333,
    settlementImpact: "applied",
    proofAttached: false,
  },
];

// ─── Status helpers ───────────────────────────────────────────────────────────

const statusStyle: Record<DisputeStatus, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  under_review: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const statusIcon: Record<DisputeStatus, React.ReactNode> = {
  open: <Clock className="w-3 h-3" />,
  under_review: <FileSearch className="w-3 h-3" />,
  resolved: <CheckCircle2 className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

const statusLabel: Record<DisputeStatus, string> = {
  open: "Open",
  under_review: "Under Review",
  resolved: "Resolved",
  rejected: "Rejected",
};

const reasonLabel: Record<ReasonCode, string> = {
  meal_delivered: "Meal delivered",
  cancelled_after_eating: "Cancelled after eating",
  wrong_refund_deduction: "Wrong refund deduction",
  wrong_package_count: "Wrong package count",
  duplicate_charge: "Duplicate charge",
  other: "Other",
};

const linkedTypeStyle: Record<string, string> = {
  order: "bg-blue-50 text-blue-700 border-blue-200",
  cancellation: "bg-orange-50 text-orange-700 border-orange-200",
  settlement: "bg-purple-50 text-purple-700 border-purple-200",
};

// ─── Raise dispute sheet ──────────────────────────────────────────────────────

function RaiseDisputeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    linkedRef: "",
    reasonCode: "" as ReasonCode | "",
    description: "",
    proofNote: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const selectedReason = REASON_CODES.find((r) => r.value === form.reasonCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.linkedRef || !form.reasonCode || !form.description.trim()) {
      toast({
        title: "Incomplete form",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitting(false);
    const refNum = `DIS-2025-${String(Math.floor(1000 + Math.random() * 9000))}`;
    toast({
      title: "Dispute raised successfully",
      description: `Reference: ${refNum}. Our team will review within 2 business days.`,
    });
    setForm({ linkedRef: "", reasonCode: "", description: "", proofNote: "" });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Raise a Dispute</SheetTitle>
          <SheetDescription>
            All disputes must include a reason code and clear description. Attach proof where
            available. Our team reviews and responds within 2 business days.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Linked reference */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Linked Order / Cancellation / Settlement <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.linkedRef}
              onValueChange={(v) => setForm((f) => ({ ...f, linkedRef: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reference…" />
              </SelectTrigger>
              <SelectContent>
                {LINKED_REFS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <span className="font-mono text-xs mr-2">{r.value}</span>
                    <span className="text-muted-foreground text-xs">{r.label.split("—")[1]}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason code */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Reason Code <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.reasonCode}
              onValueChange={(v) => setForm((f) => ({ ...f, reasonCode: v as ReasonCode }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason…" />
              </SelectTrigger>
              <SelectContent>
                {REASON_CODES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedReason && (
              <p className="text-xs text-muted-foreground mt-1">{selectedReason.description}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Describe the issue clearly. Include dates, times, and any relevant context."
              rows={5}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground">{form.description.length} / 600 characters</p>
          </div>

          {/* Proof note */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" /> Proof Reference (optional)
            </Label>
            <Input
              placeholder="e.g. QR scan log, kitchen record, OTP screenshot…"
              value={form.proofNote}
              onChange={(e) => setForm((f) => ({ ...f, proofNote: e.target.value }))}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Describe or name the evidence. Full file upload will be available in a future update.
            </p>
          </div>

          <Separator />

          {/* Audit note */}
          <div className="rounded-lg bg-muted p-3 flex gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every dispute is logged with your name, timestamp, reason code, and linked reference. No
              manual entry without an audit trail. Approved disputes result in a settlement adjustment
              in the next payout cycle.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Dispute"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─── Dispute row (expandable) ────────────────────────────────────────────────

function DisputeRow({ dispute }: { dispute: Dispute }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/40"
        onClick={() => setExpanded((v) => !v)}
      >
        <TableCell>
          <div className="flex items-center gap-1.5">
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className="font-mono text-xs font-medium">{dispute.id}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 pl-5">
            {format(dispute.raisedAt, "d MMM yyyy, h:mm a")}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`text-[10px] ${linkedTypeStyle[dispute.linkedType]}`}>
              {dispute.linkedType}
            </Badge>
          </div>
          <div className="font-mono text-xs mt-0.5 text-muted-foreground">{dispute.linkedRef}</div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">
            {reasonLabel[dispute.reasonCode]}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
          {dispute.description}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={`gap-1 ${statusStyle[dispute.status]}`}>
            {statusIcon[dispute.status]}
            {statusLabel[dispute.status]}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="text-sm flex items-center gap-1">
            <User className="w-3 h-3 text-muted-foreground" />
            {dispute.createdBy}
          </div>
        </TableCell>
        <TableCell className="text-right">
          {dispute.adjustmentApplied !== null && dispute.adjustmentApplied > 0 ? (
            <span className="font-semibold text-green-700">+{inr(dispute.adjustmentApplied)}</span>
          ) : dispute.adjustmentApplied === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="text-muted-foreground text-xs">Pending</span>
          )}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={7} className="py-4 px-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Full description */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Full Description
                </p>
                <p className="text-sm leading-relaxed">{dispute.description}</p>
                {dispute.proofAttached && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-700">
                    <Paperclip className="w-3 h-3" /> Proof attached by restaurant
                  </div>
                )}
              </div>

              {/* Audit trail */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Audit Trail
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="font-medium">Raised</span>
                      <span className="text-muted-foreground ml-1.5">
                        {format(dispute.raisedAt, "d MMM yyyy, h:mm a")} by {dispute.createdBy}
                      </span>
                    </div>
                  </div>

                  {dispute.resolvedAt && dispute.approvedBy && (
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="font-medium">
                          {dispute.status === "resolved" ? "Resolved" : "Rejected"}
                        </span>
                        <span className="text-muted-foreground ml-1.5">
                          {format(dispute.resolvedAt, "d MMM yyyy")} by {dispute.approvedBy}
                        </span>
                      </div>
                    </div>
                  )}

                  {dispute.adminDecision && (
                    <div className="rounded-md border border-border bg-card p-3 mt-1">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Admin Decision
                      </p>
                      <p className="text-sm">{dispute.adminDecision}</p>
                    </div>
                  )}

                  {dispute.adjustmentApplied !== null && (
                    <div className="flex items-center gap-2 text-sm">
                      <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">Settlement adjustment:</span>
                      {dispute.adjustmentApplied > 0 ? (
                        <span className="text-green-700 font-semibold">
                          +{inr(dispute.adjustmentApplied)} applied in next payout
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No adjustment</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link2 className="w-3 h-3" />
                    Linked to{" "}
                    <span className="font-mono">{dispute.linkedRef}</span>
                    {" "}({dispute.linkedType})
                  </div>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Disputes() {
  const { activeRestaurantId } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | DisputeStatus>("all");

  if (!activeRestaurantId) return null;

  const filtered =
    statusFilter === "all"
      ? MOCK_DISPUTES
      : MOCK_DISPUTES.filter((d) => d.status === statusFilter);

  const open = MOCK_DISPUTES.filter((d) => d.status === "open").length;
  const underReview = MOCK_DISPUTES.filter((d) => d.status === "under_review").length;
  const resolved = MOCK_DISPUTES.filter((d) => d.status === "resolved").length;
  const totalAdjusted = MOCK_DISPUTES.filter((d) => d.adjustmentApplied && d.adjustmentApplied > 0).reduce(
    (s, d) => s + (d.adjustmentApplied ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <RaiseDisputeSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Disputes & Adjustments</h1>
          <p className="text-muted-foreground mt-1">
            Raise disputes on meal deliveries, cancellations, and settlement deductions. Every entry
            is fully audited with reason codes, timestamps, and admin decisions.
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" /> Raise Dispute
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className={`bg-card cursor-pointer transition-colors ${statusFilter === "open" ? "ring-2 ring-blue-400" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "open" ? "all" : "open")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open</p>
              <p className="text-2xl font-bold text-foreground">{open}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`bg-card cursor-pointer transition-colors ${statusFilter === "under_review" ? "ring-2 ring-amber-400" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "under_review" ? "all" : "under_review")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <FileSearch className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Under Review</p>
              <p className="text-2xl font-bold text-foreground">{underReview}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`bg-card cursor-pointer transition-colors ${statusFilter === "resolved" ? "ring-2 ring-green-400" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "resolved" ? "all" : "resolved")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Resolved</p>
              <p className="text-2xl font-bold text-foreground">{resolved}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <IndianRupee className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Adjusted</p>
              <p className="text-2xl font-bold text-green-700">{inr(totalAdjusted)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Disputes</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")}>
            Clear filter
          </Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} {filtered.length === 1 ? "dispute" : "disputes"}
        </span>
      </div>

      {/* Disputes table */}
      <Card className="bg-card">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Dispute Log</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click a row to expand the full description, audit trail, and admin decision.
          </p>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dispute ID / Date</TableHead>
                <TableHead>Linked Ref</TableHead>
                <TableHead>Reason Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Adjustment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="mx-auto h-7 w-7 mb-2 opacity-40" />
                    No disputes match this filter.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => <DisputeRow key={d.id} dispute={d} />)
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Policy note */}
      <div className="rounded-lg border border-border bg-muted/40 p-4 flex gap-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold">Dispute policy:</span> Disputes must be raised within{" "}
          <span className="font-medium">7 days</span> of the relevant order or settlement date. Every
          entry is assigned a reason code and is permanently logged with the submitter's name,
          timestamp, and linked reference. No manual "minus ₹X" adjustments — all settlement changes
          require an approved dispute record. Approved adjustments appear in the next payout cycle
          with a reference to this dispute ID.
        </p>
      </div>
    </div>
  );
}
