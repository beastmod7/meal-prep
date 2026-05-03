import { useAuth } from "@/lib/auth";
import {
  useGetRestaurantUpcomingMeals,
  getGetRestaurantUpcomingMealsQueryKey,
  useUpdateMealOrderStatus,
  UpdateOrderStatusBodyStatus,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  UtensilsCrossed,
  Download,
  LayoutList,
  Grid3x3,
  RotateCcw,
  ChefHat,
  UserX,
  Utensils,
  AlertTriangle,
  ShieldCheck,
  ShieldX,
  KeyRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { inr } from "@/lib/fmt";
import { downloadCsv } from "@/lib/download";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "scheduled"
  | "locked"
  | "accepted"
  | "preparing"
  | "ready"
  | "delivered"
  | "no_show"
  | "cancelled";

interface LocalOrder {
  id: string;
  studentName: string;
  studentPhoneMasked: string;
  packageName: string;
  mealSlot: string;
  scheduledDate: string;
  status: OrderStatus;
  isLocked: boolean;
  pricePerDay: number;
  freeCancelUntil: string;
  subscriptionId: string;
}

interface RecentAction {
  orderId: string;
  studentName: string;
  prevStatus: OrderStatus;
  newStatus: OrderStatus;
  time: number;
  verified?: boolean;
}

type ViewMode = "table" | "staff";
type SlotFilter = "all" | "lunch" | "dinner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TERMINAL = new Set(["delivered", "no_show", "cancelled"]);
const isTerminal = (s: string) => TERMINAL.has(s);

/**
 * Derives the same 4-digit verification code as the mobile app.
 * Inputs: subscriptionId (from order) + scheduledDate (YYYY-MM-DD).
 * Code rotates daily — same subscription yields a different code each day.
 */
function deriveVerificationCode(subscriptionId: string, date: string): string {
  const input = subscriptionId.replace(/-/g, "") + date.replace(/-/g, "");
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash & 0x7fffffff;
  }
  return String(hash % 10000).padStart(4, "0");
}

const statusStyle: Record<string, string> = {
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  no_show: "bg-orange-100 text-orange-700 border-orange-200",
  preparing: "bg-blue-100 text-blue-700 border-blue-200",
  ready: "bg-teal-100 text-teal-700 border-teal-200",
  scheduled: "bg-slate-100 text-slate-600 border-slate-200",
  locked: "bg-violet-100 text-violet-700 border-violet-200",
  accepted: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

const statusLabel: Record<string, string> = {
  delivered: "Delivered",
  cancelled: "Cancelled",
  no_show: "No Show",
  preparing: "Preparing",
  ready: "Ready",
  scheduled: "Scheduled",
  locked: "Locked",
  accepted: "Accepted",
};

// ─── OTP Input ────────────────────────────────────────────────────────────────

function OtpInput({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (digits: string[]) => void;
  error: boolean;
}) {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleChange = (idx: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[idx] = digit;
    onChange(next);
    if (digit && idx < 3) refs[idx + 1]?.current?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      refs[idx - 1]?.current?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) refs[idx - 1]?.current?.focus();
    if (e.key === "ArrowRight" && idx < 3) refs[idx + 1]?.current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4).split("");
    const next = ["", "", "", ""].map((_, i) => digits[i] ?? "");
    onChange(next);
    const lastFilled = Math.min(digits.length, 3);
    refs[lastFilled]?.current?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {[0, 1, 2, 3].map((idx) => (
        <input
          key={idx}
          ref={refs[idx]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] ?? ""}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-colors
            focus:border-primary
            ${error ? "border-destructive bg-destructive/5 text-destructive" : "border-border bg-background"}
            ${value[idx] ? "border-primary/60" : ""}`}
        />
      ))}
    </div>
  );
}

// ─── Staff card ───────────────────────────────────────────────────────────────

function StaffCard({
  order,
  updating,
  recentAction,
  codeError,
  onMark,
  onUndo,
}: {
  order: LocalOrder;
  updating: boolean;
  recentAction?: RecentAction;
  codeError: boolean;
  onMark: (
    id: string,
    status: UpdateOrderStatusBodyStatus,
    prev: OrderStatus,
    code?: string,
  ) => void;
  onUndo: (action: RecentAction) => void;
}) {
  const done = isTerminal(order.status);
  const [verifyMode, setVerifyMode] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const [undoSecsLeft, setUndoSecsLeft] = useState(0);

  // Reset verify mode when order becomes terminal
  useEffect(() => {
    if (done) setVerifyMode(false);
  }, [done]);

  // Reset OTP when codeError clears (new attempt)
  useEffect(() => {
    if (!codeError && verifyMode) {
      // keep digits so user can re-try
    }
  }, [codeError, verifyMode]);

  // Undo countdown
  useEffect(() => {
    if (!recentAction) { setUndoSecsLeft(0); return; }
    const update = () => {
      const left = Math.max(0, 30 - Math.floor((Date.now() - recentAction.time) / 1000));
      setUndoSecsLeft(left);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [recentAction]);

  const otpCode = otpDigits.join("");
  const otpComplete = otpCode.length === 4;

  const handleDeliverTap = () => {
    setVerifyMode(true);
    setOtpDigits(["", "", "", ""]);
  };

  const handleVerifyDeliver = () => {
    if (!otpComplete) return;
    onMark(order.id, "delivered", order.status, otpCode);
  };

  const handleOverrideDeliver = () => {
    setVerifyMode(false);
    onMark(order.id, "delivered", order.status, undefined);
  };

  const handleCancelVerify = () => {
    setVerifyMode(false);
    setOtpDigits(["", "", "", ""]);
  };

  return (
    <div
      className={`rounded-xl border-2 transition-all duration-200 overflow-hidden
        ${done
          ? order.status === "delivered"
            ? "border-emerald-200 bg-emerald-50/60 opacity-80"
            : order.status === "no_show"
              ? "border-orange-200 bg-orange-50/60 opacity-70"
              : "border-gray-200 bg-gray-50/60 opacity-50"
          : verifyMode
            ? "border-primary shadow-md"
            : "border-border bg-card shadow-sm hover:shadow-md"
        }`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {done && order.status === "delivered" && recentAction?.verified && (
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            {done && order.status === "delivered" && !recentAction?.verified && (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            {done && order.status === "no_show" && (
              <UserX className="h-4 w-4 text-orange-600 shrink-0" />
            )}
            <p className="font-semibold text-base truncate">{order.studentName}</p>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{order.studentPhoneMasked}</p>
          <p className="text-sm text-foreground/70 mt-0.5 truncate">{order.packageName}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 ml-3 shrink-0">
          <Badge
            variant="outline"
            className={
              order.mealSlot === "lunch"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
            }
          >
            {order.mealSlot === "lunch" ? "☀️ Lunch" : "🌙 Dinner"}
          </Badge>
          <span className="text-sm font-semibold text-foreground">{inr(order.pricePerDay)}</span>
        </div>
      </div>

      {/* OTP Verify panel */}
      {verifyMode && !done && (
        <div className="mx-4 mb-3 rounded-xl bg-muted/60 border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm font-semibold text-foreground">Enter student's 4-digit code</p>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Ask the student to open their app → My Plans → Show Code
          </p>

          <OtpInput value={otpDigits} onChange={setOtpDigits} error={codeError} />

          {codeError && (
            <div className="flex items-center gap-2 text-destructive text-xs">
              <ShieldX className="h-3.5 w-3.5 shrink-0" />
              <span>Wrong code — ask the student to check their app again.</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              disabled={!otpComplete || updating}
              onClick={handleVerifyDeliver}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Verify & Deliver
            </Button>
            <Button variant="outline" size="sm" className="h-10" onClick={handleCancelVerify}>
              Cancel
            </Button>
          </div>

          <button
            onClick={handleOverrideDeliver}
            className="w-full text-xs text-muted-foreground hover:text-foreground text-center pt-0.5 underline underline-offset-2"
          >
            Deliver without code (manager override)
          </button>
        </div>
      )}

      {/* Status / actions */}
      <div className="px-4 pb-4">
        {done ? (
          <div className="flex items-center justify-between mt-1 gap-2">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={`text-xs ${statusStyle[order.status]}`}>
                {statusLabel[order.status]}
              </Badge>
              {order.status === "delivered" && recentAction?.verified && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>
            {recentAction && undoSecsLeft > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onUndo(recentAction)}
              >
                <RotateCcw className="h-3 w-3" />
                Undo ({undoSecsLeft}s)
              </Button>
            )}
          </div>
        ) : !verifyMode ? (
          <div className="flex gap-2 mt-2">
            {(order.status === "scheduled" ||
              order.status === "locked" ||
              order.status === "accepted") && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-10 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                disabled={updating}
                onClick={() => onMark(order.id, "preparing", order.status)}
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChefHat className="h-4 w-4" />
                )}
                Preparing
              </Button>
            )}

            {/* Delivered — opens OTP verify panel */}
            <Button
              size="sm"
              className="flex-[2] h-10 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              disabled={updating}
              onClick={handleDeliverTap}
            >
              <CheckCircle2 className="h-4 w-4" />
              Delivered
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-10 gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50"
              disabled={updating}
              onClick={() => onMark(order.id, "no_show", order.status)}
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserX className="h-4 w-4" />
              )}
              No Show
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UpcomingMeals() {
  const { activeRestaurantId, token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>("staff");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]!);
  const [slotFilter, setSlotFilter] = useState<SlotFilter>("all");
  const [exporting, setExporting] = useState(false);

  const [localOrders, setLocalOrders] = useState<LocalOrder[]>([]);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [codeErrorIds, setCodeErrorIds] = useState<Set<string>>(new Set());
  const [bulkConfirmSlot, setBulkConfirmSlot] = useState<SlotFilter | null>(null);

  const { data, isLoading } = useGetRestaurantUpcomingMeals(
    activeRestaurantId!,
    { date },
    {
      query: {
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantUpcomingMealsQueryKey(activeRestaurantId!, { date }),
      },
    },
  );

  useEffect(() => {
    if (!data?.orders) return;
    setLocalOrders(
      data.orders.map((o) => ({
        id: o.id,
        studentName: o.studentName,
        studentPhoneMasked: o.studentPhoneMasked,
        packageName: o.packageName,
        mealSlot: o.mealSlot,
        scheduledDate: o.scheduledDate,
        status: o.status as OrderStatus,
        isLocked: o.isLocked,
        pricePerDay: o.pricePerDay,
        freeCancelUntil: o.freeCancelUntil,
        subscriptionId: (o as { subscriptionId?: string }).subscriptionId ?? "",
      })),
    );
  }, [data]);

  // Clean up recent actions older than 30s
  useEffect(() => {
    const iv = setInterval(() => {
      setRecentActions((prev) => prev.filter((a) => Date.now() - a.time < 30_000));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const updateStatus = useUpdateMealOrderStatus();

  const handleMark = (
    orderId: string,
    newStatus: UpdateOrderStatusBodyStatus,
    prevStatus: OrderStatus,
    verificationCode?: string,
  ) => {
    // Clear any previous code error for this order
    setCodeErrorIds((prev) => {
      const s = new Set(prev);
      s.delete(orderId);
      return s;
    });

    // Optimistic update
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as OrderStatus } : o)),
    );
    setUpdatingIds((prev) => new Set(prev).add(orderId));

    updateStatus.mutate(
      { restaurantId: activeRestaurantId!, orderId, data: { status: newStatus, verificationCode } },
      {
        onSuccess: (updated) => {
          setLocalOrders((prev) =>
            prev.map((o) =>
              o.id === orderId ? { ...o, status: updated.status as OrderStatus } : o,
            ),
          );
          const verified = !!(verificationCode && (updated as { verified?: boolean }).verified);
          setRecentActions((prev) => [
            {
              orderId,
              studentName: updated.studentName,
              prevStatus,
              newStatus: updated.status as OrderStatus,
              time: Date.now(),
              verified,
            },
            ...prev.filter((a) => a.orderId !== orderId),
          ]);
          queryClient.invalidateQueries({
            queryKey: getGetRestaurantUpcomingMealsQueryKey(activeRestaurantId!, { date }),
          });
        },
        onError: () => {
          // Revert optimistic update
          setLocalOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: prevStatus } : o)),
          );
          if (verificationCode !== undefined) {
            // Code was provided but rejected — show inline error on card
            setCodeErrorIds((prev) => new Set(prev).add(orderId));
          } else {
            toast({
              title: "Update failed",
              description: "Could not update order. Try again.",
              variant: "destructive",
            });
          }
        },
        onSettled: () => {
          setUpdatingIds((prev) => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
          });
        },
      },
    );
  };

  const handleUndo = (action: RecentAction) => {
    handleMark(action.orderId, action.prevStatus as UpdateOrderStatusBodyStatus, action.newStatus);
    setRecentActions((prev) => prev.filter((a) => a.orderId !== action.orderId));
    toast({
      description: `Reverted ${action.studentName} to ${statusLabel[action.prevStatus] ?? action.prevStatus}`,
    });
  };

  const handleBulkDeliver = (slot: SlotFilter) => {
    const targets = localOrders.filter(
      (o) => !isTerminal(o.status) && (slot === "all" || o.mealSlot === slot),
    );
    setBulkConfirmSlot(null);
    targets.forEach((o) => handleMark(o.id, "delivered", o.status, undefined));
    toast({ description: `Marking ${targets.length} orders as delivered…` });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const params = new URLSearchParams({ reportType: "daily_prep", dateFrom: date, dateTo: date });
      const res = await fetch(
        `${base}/api/restaurant-portal/restaurants/${activeRestaurantId}/reports/export?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      downloadCsv(json.headers, json.rows, `daily-prep-${date}.csv`);
    } catch {
      toast({
        title: "Export failed",
        description: "Could not download report.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (!activeRestaurantId) return null;

  const lunchPending = localOrders.filter(
    (o) => o.mealSlot === "lunch" && !isTerminal(o.status),
  ).length;
  const lunchDelivered = localOrders.filter(
    (o) => o.mealSlot === "lunch" && o.status === "delivered",
  ).length;
  const lunchTotal = localOrders.filter(
    (o) => o.mealSlot === "lunch" && o.status !== "cancelled",
  ).length;
  const dinnerPending = localOrders.filter(
    (o) => o.mealSlot === "dinner" && !isTerminal(o.status),
  ).length;
  const dinnerDelivered = localOrders.filter(
    (o) => o.mealSlot === "dinner" && o.status === "delivered",
  ).length;
  const dinnerTotal = localOrders.filter(
    (o) => o.mealSlot === "dinner" && o.status !== "cancelled",
  ).length;

  const visibleOrders = localOrders
    .filter((o) => slotFilter === "all" || o.mealSlot === slotFilter)
    .sort((a, b) => {
      const aDone = isTerminal(a.status) ? 1 : 0;
      const bDone = isTerminal(b.status) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return a.studentName.localeCompare(b.studentName);
    });

  const pendingCount = visibleOrders.filter((o) => !isTerminal(o.status)).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Prep</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {viewMode === "staff"
              ? "Tap Delivered → enter student's 4-digit code to verify."
              : "Kitchen locks, order count, and meal fulfillment."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-card border rounded-lg px-3 py-1.5 shadow-sm">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 w-[130px] p-0 h-auto text-sm"
            />
          </div>
          <div className="flex rounded-lg border bg-card overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode("staff")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                viewMode === "staff"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Grid3x3 className="h-4 w-4" />
              Staff
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <LayoutList className="h-4 w-4" />
              Table
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-1" />
            )}
            CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <UtensilsCrossed className="mx-auto h-8 w-8 mb-2 opacity-40" />
            No data available for this date.
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-amber-500" /> Lunch Shift
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-4xl font-bold">{lunchPending}</div>
                    <p className="text-sm text-muted-foreground">pending</p>
                  </div>
                  <div className="text-right space-y-1 text-sm text-muted-foreground">
                    <div>
                      Total: <span className="font-semibold text-foreground">{lunchTotal}</span>
                    </div>
                    <div>
                      Cancelled:{" "}
                      <span className="font-semibold text-destructive">{data.lunchCancelled}</span>
                    </div>
                    <div>
                      Delivered:{" "}
                      <span className="font-semibold text-emerald-600">{lunchDelivered}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-indigo-500" /> Dinner Shift
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-4xl font-bold">{dinnerPending}</div>
                    <p className="text-sm text-muted-foreground">pending</p>
                  </div>
                  <div className="text-right space-y-1 text-sm text-muted-foreground">
                    <div>
                      Total: <span className="font-semibold text-foreground">{dinnerTotal}</span>
                    </div>
                    <div>
                      Cancelled:{" "}
                      <span className="font-semibold text-destructive">
                        {data.dinnerCancelled}
                      </span>
                    </div>
                    <div>
                      Delivered:{" "}
                      <span className="font-semibold text-emerald-600">{dinnerDelivered}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Order List</CardTitle>
              {data.isLockPassed && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  <Clock className="w-3 h-3 mr-1" /> Prep window closed
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-10 text-muted-foreground"
                      >
                        <UtensilsCrossed className="mx-auto h-7 w-7 mb-2 opacity-40" />
                        No orders scheduled for this date.
                      </TableCell>
                    </TableRow>
                  ) : (
                    localOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-medium">{order.studentName}</div>
                          <div className="text-xs text-muted-foreground">
                            {order.studentPhoneMasked}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{order.packageName}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              order.mealSlot === "lunch"
                                ? "text-amber-700 border-amber-200 bg-amber-50"
                                : "text-indigo-700 border-indigo-200 bg-indigo-50"
                            }
                          >
                            {order.mealSlot === "lunch" ? "Lunch" : "Dinner"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{inr(order.pricePerDay)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusStyle[order.status] ?? ""}
                          >
                            {statusLabel[order.status] ?? order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {!isTerminal(order.status) ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                disabled={updatingIds.has(order.id)}
                                onClick={() => handleMark(order.id, "preparing", order.status)}
                              >
                                <ChefHat className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                disabled={updatingIds.has(order.id)}
                                onClick={() => handleMark(order.id, "delivered", order.status)}
                              >
                                Delivered
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                disabled={updatingIds.has(order.id)}
                                onClick={() => handleMark(order.id, "no_show", order.status)}
                              >
                                No Show
                              </Button>
                            </div>
                          ) : order.status === "delivered" ? (
                            <span className="text-emerald-600 flex items-center justify-end text-sm font-medium gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Done
                            </span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        // ── STAFF CHECK-IN MODE ──────────────────────────────────────────────
        <div className="space-y-4">
          {/* Progress bars */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Lunch ☀️", delivered: lunchDelivered, total: lunchTotal },
              { label: "Dinner 🌙", delivered: dinnerDelivered, total: dinnerTotal },
            ].map(({ label, delivered, total }) => (
              <Card key={label} className="py-0">
                <CardContent className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-sm font-bold tabular-nums">
                      <span className="text-emerald-600">{delivered}</span>
                      <span className="text-muted-foreground"> / {total}</span>
                    </span>
                  </div>
                  <Progress value={total > 0 ? (delivered / total) * 100 : 0} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {total > 0
                      ? delivered === total
                        ? "✓ All delivered"
                        : `${total - delivered} remaining`
                      : "No orders"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Verification badge */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border rounded-lg px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>
              <strong className="text-foreground">OTP Verification active.</strong> Tap Delivered
              → enter the 4-digit code from the student's app to confirm pickup.
            </span>
          </div>

          {/* Slot tabs + bulk action */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex rounded-lg border bg-card overflow-hidden shadow-sm">
              {(["all", "lunch", "dinner"] as SlotFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSlotFilter(s)}
                  className={`px-4 py-2 text-sm transition-colors capitalize ${
                    slotFilter === s
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s}
                  {s === "all" && pendingCount > 0 && (
                    <span className="ml-1.5 text-xs opacity-70">({pendingCount})</span>
                  )}
                  {s === "lunch" && (
                    <span className="ml-1.5 text-xs opacity-70">({lunchPending})</span>
                  )}
                  {s === "dinner" && (
                    <span className="ml-1.5 text-xs opacity-70">({dinnerPending})</span>
                  )}
                </button>
              ))}
            </div>

            {pendingCount > 0 &&
              (bulkConfirmSlot === slotFilter ? (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-amber-800">
                    Mark all {pendingCount} as delivered (no code)?
                  </span>
                  <Button
                    size="sm"
                    className="h-7 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleBulkDeliver(slotFilter)}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    onClick={() => setBulkConfirmSlot(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => setBulkConfirmSlot(slotFilter)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Bulk mark ({pendingCount}) delivered
                </Button>
              ))}
          </div>

          {/* Cards grid */}
          {visibleOrders.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <UtensilsCrossed className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No orders for this date and slot.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleOrders.map((order) => (
                <StaffCard
                  key={order.id}
                  order={order}
                  updating={updatingIds.has(order.id)}
                  recentAction={recentActions.find((a) => a.orderId === order.id)}
                  codeError={codeErrorIds.has(order.id)}
                  onMark={handleMark}
                  onUndo={handleUndo}
                />
              ))}
            </div>
          )}

          {/* Recent actions log */}
          {recentActions.length > 0 && (
            <Card className="border-dashed">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recent updates — undo within 30s
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-1.5">
                {recentActions.slice(0, 5).map((action) => (
                  <div
                    key={action.orderId}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusStyle[action.newStatus]}`}
                      >
                        {statusLabel[action.newStatus]}
                      </Badge>
                      {action.verified && (
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      )}
                      <span className="text-foreground font-medium">{action.studentName}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => handleUndo(action)}
                    >
                      <RotateCcw className="h-3 w-3" /> Undo
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
