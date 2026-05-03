import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  useGetRestaurantRedemptions,
  getGetRestaurantRedemptionsQueryKey,
  GetRestaurantRedemptionsMealSlot,
  GetRestaurantRedemptionsStatus,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
} from "lucide-react";

const today = new Date().toISOString().split("T")[0]!;
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0]!;

function statusConfig(status: string) {
  switch (status) {
    case "delivered":
      return { label: "Consumed", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    case "scheduled":
      return { label: "Scheduled", color: "bg-blue-100 text-blue-700 border-blue-200" };
    case "locked":
      return { label: "Locked", color: "bg-violet-100 text-violet-700 border-violet-200" };
    case "cancelled":
      return { label: "Cancelled", color: "bg-gray-100 text-gray-600 border-gray-200" };
    case "no_show":
      return { label: "No-Show", color: "bg-orange-100 text-orange-700 border-orange-200" };
    default:
      return { label: status, color: "bg-gray-100 text-gray-600 border-gray-200" };
  }
}

function slotBadge(slot: string) {
  return slot === "lunch"
    ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-indigo-100 text-indigo-700 border-indigo-200";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatUpdatedAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
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

function exportCsv(items: RedemptionItem[]) {
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
    "Marked By",
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
    r.markedBy ?? "—",
    formatUpdatedAt(r.updatedAt),
  ]);
  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `redemption-ledger-${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Redemptions() {
  const { activeRestaurantId } = useAuth();

  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [mealSlot, setMealSlot] = useState<GetRestaurantRedemptionsMealSlot>("all");
  const [status, setStatus] = useState<GetRestaurantRedemptionsStatus>("all");
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading, isError } = useGetRestaurantRedemptions(
    activeRestaurantId ?? "",
    { dateFrom, dateTo, mealSlot, status, page, limit },
    {
      query: {
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantRedemptionsQueryKey(activeRestaurantId ?? "", {
          dateFrom,
          dateTo,
          mealSlot,
          status,
          page,
          limit,
        }),
      },
    },
  );

  const summary = data?.summary;
  const pagination = data?.pagination;
  const items = data?.items ?? [];

  function handleFilterChange() {
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
          onClick={() => exportCsv(items)}
          disabled={items.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Meals Consumed
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">
              {isLoading ? "—" : (summary?.totalDelivered ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">in selected range</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <IndianRupee className="h-3.5 w-3.5 text-primary" />
              Gross Value
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">
              {isLoading
                ? "—"
                : `₹${(summary?.grossDeliveredValue ?? 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">consumed meals only</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">
              {isLoading ? "—" : (summary?.totalScheduled ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">scheduled + locked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-gray-400" />
              Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">
              {isLoading ? "—" : (summary?.totalCancelled ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">cancelled + no-show</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">From</label>
              <Input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  handleFilterChange();
                }}
                className="w-36 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">To</label>
              <Input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={today}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  handleFilterChange();
                }}
                className="w-36 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Meal Slot</label>
              <Select
                value={mealSlot}
                onValueChange={(v) => {
                  setMealSlot(v as GetRestaurantRedemptionsMealSlot);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="w-32 text-sm">
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
                  handleFilterChange();
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
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold pl-4">Order ID</TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">Student</TableHead>
                  <TableHead className="text-xs font-semibold">Package</TableHead>
                  <TableHead className="text-xs font-semibold">Slot</TableHead>
                  <TableHead className="text-xs font-semibold">
                    <span className="flex items-center gap-1">
                      Meal #
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Meal number / total days in subscription</p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Value</TableHead>
                  <TableHead className="text-xs font-semibold">
                    <span className="flex items-center gap-1">
                      Marked By
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Staff member / scan method — tracking coming soon</p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                  <TableHead className="text-xs font-semibold pr-4">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      Loading ledger…
                    </TableCell>
                  </TableRow>
                )}
                {isError && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-destructive">
                      Failed to load data. Please try again.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !isError && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      No orders found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => {
                  const sc = statusConfig(item.status);
                  const mealPos = item.totalDays
                    ? `${item.mealNumber} / ${item.totalDays}`
                    : String(item.mealNumber);
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                        {shortId(item.id)}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(item.scheduledDate)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{item.studentName}</div>
                        <div className="text-xs text-muted-foreground">{item.studentPhoneMasked}</div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate" title={item.packageName}>
                        {item.packageName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${slotBadge(item.mealSlot)}`}
                        >
                          {item.mealSlot}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {item.mealNumber > 0 ? mealPos : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${sc.color}`}>
                          {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ₹{item.pricePerDay.toFixed(0)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.markedBy ?? "—"}
                      </TableCell>
                      <TableCell className="pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatUpdatedAt(item.updatedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} orders
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Footer note */}
          {!isLoading && pagination && (
            <div className="px-4 py-2 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                {pagination.total} total orders in range •{" "}
                <span className="italic">
                  "Marked By" and scan method tracking will be added in a future update.
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
