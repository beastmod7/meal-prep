import { useAuth } from "@/lib/auth";
import {
  useGetRestaurantCancellations,
  getGetRestaurantCancellationsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingDown, XCircle, Download, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { format } from "date-fns";
import { inr } from "@/lib/fmt";
import { downloadCsv } from "@/lib/download";
import { useToast } from "@/hooks/use-toast";

const TYPE_STYLE: Record<string, string> = {
  late_cancellation: "bg-amber-50 text-amber-700 border-amber-200",
  no_show: "bg-red-50 text-red-700 border-red-200",
  free_cancellation: "bg-slate-50 text-slate-600 border-slate-200",
  restaurant_cancelled: "bg-blue-50 text-blue-700 border-blue-200",
};

const TYPE_LABEL: Record<string, string> = {
  late_cancellation: "Late Cancel",
  no_show: "No Show",
  free_cancellation: "Free Cancel",
  restaurant_cancelled: "Rest. Cancelled",
};

const TYPE_INFO: Record<string, string> = {
  late_cancellation: "Cancelled after the lock-in window. 50% of the meal value is shared.",
  no_show: "Student didn't show up. You still receive 100% of the meal value.",
  free_cancellation: "Cancelled within the free window (24h+ before). No impact on your payout.",
  restaurant_cancelled: "Cancelled by the restaurant side. Full refund given to student.",
};

export default function Cancellations() {
  const { activeRestaurantId, token } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useGetRestaurantCancellations(
    activeRestaurantId!,
    { type: type === "all" ? undefined : (type as "late_cancellation" | "no_show" | "free_cancellation" | "restaurant_cancelled") },
    {
      query: {
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantCancellationsQueryKey(activeRestaurantId!, {
          type: type === "all" ? undefined : (type as "late_cancellation" | "no_show" | "free_cancellation" | "restaurant_cancelled"),
        }),
      },
    },
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const params = new URLSearchParams({ reportType: "cancellations" });
      const res = await fetch(
        `${base}/api/restaurant-portal/restaurants/${activeRestaurantId}/reports/export?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      downloadCsv(json.headers, json.rows, `cancellations-${new Date().toISOString().split("T")[0]}.csv`);
    } catch {
      toast({ title: "Export failed", description: "Could not download report.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (!activeRestaurantId) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cancellations</h1>
          <p className="text-muted-foreground mt-1">
            Deductions, no-shows, and cancellation impact over the last 30 days.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cancellations</SelectItem>
              <SelectItem value="free_cancellation">Free (Advance)</SelectItem>
              <SelectItem value="late_cancellation">Late (After Lock)</SelectItem>
              <SelectItem value="no_show">No Shows</SelectItem>
              <SelectItem value="restaurant_cancelled">Restaurant Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-card">
                <CardContent className="p-5">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded mb-3" />
                  <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Failed to load cancellations.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-card border-destructive/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-medium text-muted-foreground">Total Deduction</p>
                </div>
                <p className="text-2xl font-bold text-destructive">-{inr(data.summary.totalImpact)}</p>
                <p className="text-xs text-muted-foreground mt-1">Settlement impact this month</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Free Cancels</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-xs">{TYPE_INFO.free_cancellation}</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-foreground">{data.summary.freeCancellations}</p>
                <p className="text-xs text-emerald-600 mt-1 font-medium">No impact on payout</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Late Cancels</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-xs">{TYPE_INFO.late_cancellation}</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-amber-600">{data.summary.lateCancellations}</p>
                <p className="text-xs text-muted-foreground mt-1">50% shared with platform</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">No Shows</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-xs">{TYPE_INFO.no_show}</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-red-600">{data.summary.noShows}</p>
                <p className="text-xs text-emerald-600 mt-1 font-medium">Full payout preserved</p>
              </CardContent>
            </Card>
          </div>

          {/* Impact note */}
          {data.summary.totalImpact > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800">
                <span className="font-semibold">{inr(data.summary.totalImpact)}</span> was deducted from your settlement this period due to late cancellations.
                No-shows and free cancellations have no impact on your net payout.
              </p>
            </div>
          )}

          {/* Table */}
          <Card className="bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Package / Slot</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Deduction</TableHead>
                    <TableHead className="text-right">Your Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <XCircle className="mx-auto h-8 w-8 mb-2 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-sm">No cancellations match your filter.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {format(new Date(item.mealDate), "d MMM yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">{item.studentName}</TableCell>
                        <TableCell>
                          <div className="text-sm">{item.packageName}</div>
                          <div className="text-xs text-muted-foreground capitalize mt-0.5">{item.mealSlot}</div>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Badge variant="outline" className={`cursor-help ${TYPE_STYLE[item.cancellationType] ?? ""}`}>
                                  {TYPE_LABEL[item.cancellationType] ?? item.cancellationType}
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-xs">
                              {TYPE_INFO[item.cancellationType] ?? ""}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          {item.deductionAmount > 0 ? `-${inr(item.deductionAmount)}` : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-700">
                          {inr(item.restaurantPayout)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
