import { useAuth } from "@/lib/auth";
import { useGetRestaurantSettlements, getGetRestaurantSettlementsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, IndianRupee, TrendingUp, ReceiptText, Download, ArrowDown, Info, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { format } from "date-fns";
import { inr } from "@/lib/fmt";
import { downloadCsv } from "@/lib/download";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLE: Record<string, { badge: string; label: string; icon: React.ReactNode }> = {
  paid: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Paid",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  processing: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    label: "Processing",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  payable: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Payable",
    icon: <Clock className="w-3 h-3" />,
  },
  pending: {
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    label: "Pending",
    icon: <Clock className="w-3 h-3" />,
  },
  on_hold: {
    badge: "bg-red-50 text-red-700 border-red-200",
    label: "On Hold",
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function HistoryBarChart({ periods }: { periods: Array<{ id: string; periodStart: string; periodEnd: string; netPayable: number; status: string }> }) {
  const visible = periods.slice(0, 6).reverse();
  const max = Math.max(...visible.map((p) => p.netPayable), 1);

  return (
    <div className="flex items-end gap-2 h-20">
      {visible.map((p) => {
        const heightPct = Math.max(6, (p.netPayable / max) * 100);
        const st = STATUS_STYLE[p.status];
        const isPaid = p.status === "paid";
        return (
          <Tooltip key={p.id}>
            <TooltipTrigger asChild>
              <div className="flex-1 flex flex-col items-center gap-1 cursor-default group">
                <div
                  className={`w-full rounded-t-md transition-all group-hover:opacity-80 ${
                    isPaid ? "bg-emerald-500" : "bg-primary/40"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                  {format(new Date(p.periodStart), "d MMM")}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="font-semibold">{inr(p.netPayable)}</div>
              <div className="text-muted-foreground">{st?.label ?? p.status}</div>
              <div className="text-muted-foreground">
                {format(new Date(p.periodStart), "d MMM")} – {format(new Date(p.periodEnd), "d MMM")}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Settlements() {
  const { activeRestaurantId, token } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useGetRestaurantSettlements(
    activeRestaurantId!,
    {},
    {
      query: {
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantSettlementsQueryKey(activeRestaurantId!, {}),
      },
    },
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const params = new URLSearchParams({ reportType: "weekly_settlement" });
      const res = await fetch(
        `${base}/api/restaurant-portal/restaurants/${activeRestaurantId}/reports/export?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      downloadCsv(json.headers, json.rows, `settlements-${new Date().toISOString().split("T")[0]}.csv`);
    } catch {
      toast({ title: "Export failed", description: "Could not download report.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (!activeRestaurantId) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settlements</h1>
          <p className="text-muted-foreground mt-1">Track weekly payouts, platform commission, and account balance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-card">
                <CardContent className="p-5">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded mb-3" />
                  <div className="h-9 w-24 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Failed to load settlements.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary KPI cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-primary text-primary-foreground shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-85 flex items-center gap-2">
                  <IndianRupee className="h-4 w-4" /> Pending Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{inr(data.summary.pendingAmount)}</div>
                <p className="text-xs mt-1 opacity-70">Awaiting next payout cycle</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" /> Total Paid Out
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{inr(data.summary.paidAmount)}</div>
                <p className="text-xs text-muted-foreground mt-1">Lifetime cleared payouts</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ReceiptText className="h-4 w-4" /> Platform Commission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{inr(data.summary.platformCommission)}</div>
                <p className="text-xs text-muted-foreground mt-1">12% of gross value deducted</p>
              </CardContent>
            </Card>
          </div>

          {/* Payout history bar chart */}
          {data.periods.length > 1 && (
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Payout History
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <HistoryBarChart periods={data.periods} />
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500" /> Paid
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-primary/40" /> Pending / Processing
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settlement waterfall */}
          {(() => {
            const pending = data.periods.find(
              (p) => p.status === "payable" || p.status === "pending" || p.status === "processing",
            );
            const ref = pending ?? data.periods[0];
            if (!ref) return null;
            return (
              <Card className="bg-card border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <ArrowDown className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Settlement Breakdown</CardTitle>
                    {pending ? (
                      <Badge variant="outline" className="ml-1 bg-amber-50 text-amber-700 border-amber-200 text-xs">
                        Current period
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-1 bg-slate-50 text-slate-600 border-slate-200 text-xs">
                        Most recent
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {format(new Date(ref.periodStart), "d MMM")} – {format(new Date(ref.periodEnd), "d MMM yyyy")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-border/60">
                      <span className="text-muted-foreground">Gross meal consumption value</span>
                      <span className="font-semibold">{inr(ref.grossValue)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/60">
                      <div className="flex items-center gap-1.5">
                        <span className="text-destructive">Less platform commission (12%)</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="text-xs max-w-xs">
                            Platform commission covers payment processing, customer support, and app infrastructure.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="font-semibold text-destructive">-{inr(ref.commission)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/60">
                      <span className="text-muted-foreground">Refund adjustments</span>
                      <span className="text-muted-foreground">—</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/60">
                      <span className="text-muted-foreground">Dispute holds</span>
                      <span className="text-muted-foreground">—</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 mt-1">
                      <span className="font-bold text-foreground text-base">Net settlement</span>
                      <span className="font-bold text-primary text-xl">{inr(ref.netPayable)}</span>
                    </div>
                    {ref.payoutDate && (
                      <div className="flex justify-between pt-1 text-xs text-muted-foreground">
                        <span>Paid on</span>
                        <span className="font-medium text-emerald-600">{format(new Date(ref.payoutDate), "d MMM yyyy")}</span>
                      </div>
                    )}
                    {ref.status === "paid" && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>UTR / Reference</span>
                        <span className="font-mono text-foreground/50">—</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5 bg-muted/50 rounded-lg p-2.5">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                    Refund and dispute adjustments appear once the settlement period is finalised by the platform.
                  </p>
                </CardContent>
              </Card>
            );
          })()}

          {/* Payout history table */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base">Payout History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-center">Meals Delivered</TableHead>
                    <TableHead className="text-right">Gross Value</TableHead>
                    <TableHead className="text-right">Commission (12%)</TableHead>
                    <TableHead className="text-right">Net Payable</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.periods.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <IndianRupee className="mx-auto h-8 w-8 mb-2 opacity-30" />
                        No settlement periods found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.periods.map((period) => {
                      const st = STATUS_STYLE[period.status];
                      return (
                        <TableRow key={period.id}>
                          <TableCell>
                            <div className="font-medium">
                              {format(new Date(period.periodStart), "d MMM")} –{" "}
                              {format(new Date(period.periodEnd), "d MMM yyyy")}
                            </div>
                            {period.payoutDate ? (
                              <div className="text-xs text-emerald-600 mt-0.5">
                                Paid on {format(new Date(period.payoutDate), "d MMM")}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground mt-0.5">Payout pending</div>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-medium">{period.mealsDelivered}</TableCell>
                          <TableCell className="text-right">{inr(period.grossValue)}</TableCell>
                          <TableCell className="text-right text-destructive">
                            -{inr(period.commission)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground">
                            {inr(period.netPayable)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={`gap-1 text-xs ${st?.badge ?? ""}`}>
                              {st?.icon}
                              {st?.label ?? period.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
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
