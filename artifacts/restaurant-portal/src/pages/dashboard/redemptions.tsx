import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import {
  useGetRestaurantRedemptions,
  getGetRestaurantRedemptionsQueryKey,
  getRestaurantRedemptions,
  GetRestaurantRedemptionsMealSlot,
  GetRestaurantRedemptionsStatus,
  GetRestaurantRedemptionsPreset,
  RedemptionItem,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  BookOpen,
  IndianRupee,
  Info,
  Search,
  X,
  TrendingUp,
  Loader2,
} from "lucide-react";

// ─── Date helpers ────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const TODAY = fmtDate(new Date());
const THIRTY_AGO = fmtDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

const PRESETS: { label: string; value: GetRestaurantRedemptionsPreset }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Last 30 Days", value: "last30" },
];

// ─── Display helpers ──────────────────────────────────────────────────────────

function statusConfig(status: string) {
  switch (status) {
    case "delivered":
      return { label: "Consumed", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    case "scheduled":
      return { label: "Scheduled", color: "bg-blue-100 text-blue-700 border-blue-200" };
    case "locked":
      return { label: "Locked", color: "bg-violet-100 text-violet-700 border-violet-200" };
    case "cancelled":
      return { label: "Cancelled", color: "bg-gray-100 text-gray-500 border-gray-200" };
    case "no_show":
      return { label: "No-Show", color: "bg-orange-100 text-orange-700 border-orange-200" };
    default:
      return { label: status, color: "bg-gray-100 text-gray-600 border-gray-200" };
  }
}

function rowTint(status: string): string {
  switch (status) {
    case "delivered":
      return "bg-emerald-50/40 hover:bg-emerald-50/60";
    case "no_show":
      return "bg-orange-50/40 hover:bg-orange-50/60";
    case "cancelled":
      return "opacity-70 hover:opacity-90";
    default:
      return "hover:bg-muted/30";
  }
}

function settlementBadge(s: string | null) {
  if (!s) return null;
  switch (s) {
    case "paid":
      return { label: "Paid ✓", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    case "processing":
      return { label: "Processing", color: "bg-blue-100 text-blue-700 border-blue-200" };
    case "payable":
      return { label: "Payable", color: "bg-teal-100 text-teal-700 border-teal-200" };
    case "pending":
      return { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200" };
    case "on_hold":
      return { label: "On Hold", color: "bg-red-100 text-red-700 border-red-200" };
    default:
      return { label: s, color: "bg-gray-100 text-gray-600 border-gray-200" };
  }
}

function slotColor(slot: string) {
  return slot === "lunch"
    ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-indigo-100 text-indigo-700 border-indigo-200";
}

function displayDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function displayTs(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function buildCsv(items: RedemptionItem[]): string {
  const headers = [
    "Order ID",
    "Date",
    "Student",
    "Phone",
    "Package",
    "Slot",
    "Meal #",
    "Status",
    "Value (₹)",
    "Settlement",
    "Last Updated",
  ];
  const rows = items.map((r) => [
    r.id,
    r.scheduledDate,
    r.studentName,
    r.studentPhoneMasked,
    r.packageName,
    r.mealSlot,
    r.totalDays ? `${r.mealNumber}/${r.totalDays}` : String(r.mealNumber),
    r.status,
    r.pricePerDay.toFixed(2),
    r.settlementStatus ?? "—",
    displayTs(r.updatedAt),
  ]);
  return [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Redemptions() {
  const { activeRestaurantId } = useAuth();

  const [dateFrom, setDateFrom] = useState(THIRTY_AGO);
  const [dateTo, setDateTo] = useState(TODAY);
  const [activePreset, setActivePreset] = useState<GetRestaurantRedemptionsPreset | null>("last30");
  const [mealSlot, setMealSlot] = useState<GetRestaurantRedemptionsMealSlot>("all");
  const [status, setStatus] = useState<GetRestaurantRedemptionsStatus>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limit = 50;

  const params = {
    ...(activePreset ? { preset: activePreset } : { dateFrom, dateTo }),
    mealSlot,
    status,
    search: debouncedSearch || undefined,
    page,
    limit,
  };

  const { data, isLoading, isError } = useGetRestaurantRedemptions(
    activeRestaurantId ?? "",
    params,
    {
      query: {
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantRedemptionsQueryKey(activeRestaurantId ?? "", params),
      },
    },
  );

  const summary = data?.summary;
  const pagination = data?.pagination;
  const items = data?.items ?? [];

  // Delivered items in current page — for totals row
  const pageDeliveredTotal = items
    .filter((i) => i.status === "delivered")
    .reduce((s, i) => s + i.pricePerDay, 0);

  const resetPage = useCallback(() => setPage(1), []);

  function applyPreset(p: GetRestaurantRedemptionsPreset) {
    setActivePreset(p);
    resetPage();
  }

  function handleDateChange(field: "from" | "to", val: string) {
    setActivePreset(null);
    if (field === "from") setDateFrom(val);
    else setDateTo(val);
    resetPage();
  }

  function handleSearchChange(val: string) {
    setSearch(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      resetPage();
    }, 350);
  }

  async function handleExportAll() {
    if (!activeRestaurantId || exporting) return;
    setExporting(true);
    try {
      const exportParams = {
        ...(activePreset ? { preset: activePreset } : { dateFrom, dateTo }),
        mealSlot,
        status,
        search: debouncedSearch || undefined,
        exportAll: true,
      };
      const result = await getRestaurantRedemptions(activeRestaurantId, exportParams);
      downloadCsv(buildCsv(result.items), `redemption-ledger-${TODAY}.csv`);
    } finally {
      setExporting(false);
    }
  }

  const todayPct =
    summary && summary.todayExpected > 0
      ? Math.round((summary.todayDelivered / summary.todayExpected) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Redemption Ledger
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Full audit trail of every meal order — scheduled, consumed, cancelled.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportAll}
          disabled={exporting || !activeRestaurantId}
          className="flex items-center gap-2 shrink-0"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? "Exporting…" : "Export All"}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Today progress */}
        <Card className="lg:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Today's Meals
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-baseline gap-1 mb-1.5">
              <span className="text-2xl font-bold text-primary">
                {isLoading ? "—" : (summary?.todayDelivered ?? 0)}
              </span>
              <span className="text-sm text-muted-foreground">
                / {isLoading ? "—" : (summary?.todayExpected ?? 0)}
              </span>
            </div>
            <Progress value={isLoading ? 0 : todayPct} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? "" : `${todayPct}% consumed`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Consumed
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold">{isLoading ? "—" : (summary?.totalDelivered ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">in selected range</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <IndianRupee className="h-3 w-3 text-primary" />
              Gross Value
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold">
              {isLoading
                ? "—"
                : `₹${(summary?.grossDeliveredValue ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">consumed meals only</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-teal-500" />
              Avg / Meal
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold">
              {isLoading
                ? "—"
                : summary?.avgMealValue
                  ? `₹${summary.avgMealValue.toFixed(0)}`
                  : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">average per delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <XCircle className="h-3 w-3 text-gray-400" />
              Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold">{isLoading ? "—" : (summary?.totalCancelled ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">cancelled + no-show</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3">
            {/* Preset buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium mr-1">Quick:</span>
              {PRESETS.map((p) => (
                <Button
                  key={p.value}
                  variant={activePreset === p.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => applyPreset(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {/* Manual date + slot + status filters */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">From</label>
                <Input
                  type="date"
                  value={activePreset ? "" : dateFrom}
                  max={dateTo}
                  placeholder="—"
                  onChange={(e) => handleDateChange("from", e.target.value)}
                  className="w-36 text-sm"
                  disabled={!!activePreset}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">To</label>
                <Input
                  type="date"
                  value={activePreset ? "" : dateTo}
                  min={dateFrom}
                  max={TODAY}
                  placeholder="—"
                  onChange={(e) => handleDateChange("to", e.target.value)}
                  className="w-36 text-sm"
                  disabled={!!activePreset}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Slot</label>
                <Select
                  value={mealSlot}
                  onValueChange={(v) => {
                    setMealSlot(v as GetRestaurantRedemptionsMealSlot);
                    resetPage();
                  }}
                >
                  <SelectTrigger className="w-28 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Slots</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Status</label>
                <Select
                  value={status}
                  onValueChange={(v) => {
                    setStatus(v as GetRestaurantRedemptionsStatus);
                    resetPage();
                  }}
                >
                  <SelectTrigger className="w-36 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="delivered">Consumed</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No-Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-xs text-muted-foreground font-medium">Search student</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Name or phone…"
                    className="pl-8 pr-8 text-sm"
                  />
                  {search && (
                    <button
                      onClick={() => handleSearchChange("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-semibold pl-4 w-24">Order ID</TableHead>
                  <TableHead className="text-xs font-semibold w-32">Date</TableHead>
                  <TableHead className="text-xs font-semibold">Student</TableHead>
                  <TableHead className="text-xs font-semibold">Package</TableHead>
                  <TableHead className="text-xs font-semibold w-24">Slot</TableHead>
                  <TableHead className="text-xs font-semibold w-20">
                    <span className="flex items-center gap-1">
                      Meal #
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Meal number within the subscription</p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                  <TableHead className="text-xs font-semibold w-28">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right w-24">Value</TableHead>
                  <TableHead className="text-xs font-semibold w-28">
                    <span className="flex items-center gap-1">
                      Settlement
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Which settlement period this meal falls in</p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                  <TableHead className="text-xs font-semibold pr-4 w-36">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading ledger…
                    </TableCell>
                  </TableRow>
                )}
                {isError && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16 text-destructive">
                      Failed to load data. Please try again.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !isError && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16">
                      <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">
                        No orders found for the selected filters.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => {
                  const sc = statusConfig(item.status);
                  const sb = settlementBadge(item.settlementStatus ?? null);
                  const mealPos =
                    item.mealNumber > 0
                      ? item.totalDays
                        ? `${item.mealNumber} / ${item.totalDays}`
                        : String(item.mealNumber)
                      : "—";
                  return (
                    <TableRow
                      key={item.id}
                      className={`transition-colors ${rowTint(item.status)}`}
                    >
                      <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                        {shortId(item.id)}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {displayDate(item.scheduledDate)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium leading-tight">{item.studentName}</div>
                        <div className="text-xs text-muted-foreground">{item.studentPhoneMasked}</div>
                      </TableCell>
                      <TableCell
                        className="text-sm max-w-[150px] truncate"
                        title={item.packageName}
                      >
                        {item.packageName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${slotColor(item.mealSlot)}`}
                        >
                          {item.mealSlot}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono tabular-nums">{mealPos}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${sc.color}`}>
                          {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {item.status === "delivered" ? (
                          <span className="text-emerald-700">₹{item.pricePerDay.toFixed(0)}</span>
                        ) : (
                          <span className="text-muted-foreground">₹{item.pricePerDay.toFixed(0)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sb ? (
                          <Badge variant="outline" className={`text-xs ${sb.color}`}>
                            {sb.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {displayTs(item.updatedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Totals row */}
                {!isLoading && items.length > 0 && (
                  <TableRow className="bg-muted/40 font-semibold border-t-2 border-border">
                    <TableCell colSpan={7} className="pl-4 text-xs text-muted-foreground">
                      Page total (consumed only)
                    </TableCell>
                    <TableCell className="text-right text-sm text-emerald-700 tabular-nums">
                      ₹{pageDeliveredTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{" "}
                of <span className="font-medium">{pagination.total}</span> orders
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {/* Page number pills */}
                {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                  const pg = i + 1;
                  return (
                    <Button
                      key={pg}
                      variant={pg === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pg)}
                      className="h-7 w-7 p-0 text-xs"
                    >
                      {pg}
                    </Button>
                  );
                })}
                {pagination.totalPages > 7 && (
                  <span className="text-xs text-muted-foreground px-1">…{pagination.totalPages}</span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Footer note */}
          {!isLoading && pagination && (
            <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                {pagination.total} total orders in range
              </p>
              <p className="text-xs text-muted-foreground italic">
                Staff check-in tracking (Marked By / Scan Method) coming soon.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
