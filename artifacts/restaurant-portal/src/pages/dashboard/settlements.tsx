import { useAuth } from "@/lib/auth";
import { useGetRestaurantSettlements, getGetRestaurantSettlementsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, IndianRupee, TrendingUp, ReceiptText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format } from "date-fns";
import { inr } from "@/lib/fmt";
import { useToast } from "@/hooks/use-toast";

const statusStyle: Record<string, string> = {
  paid: "bg-green-50 text-green-700 border-green-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  payable: "bg-orange-50 text-orange-700 border-orange-200",
  pending: "bg-slate-50 text-slate-600 border-slate-200",
  on_hold: "bg-red-50 text-red-700 border-red-200",
};

function downloadCsv(headers: string[], rows: string[][], filename: string) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
      const today = new Date().toISOString().split("T")[0];
      downloadCsv(json.headers, json.rows, `settlements-${today}.csv`);
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
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Failed to load settlements.</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-primary text-primary-foreground shadow-md">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium opacity-90">Pending Balance</CardTitle>
                <IndianRupee className="h-4 w-4 opacity-80" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{inr(data.summary.pendingAmount)}</div>
                <p className="text-xs mt-1 opacity-75">Awaiting next payout cycle</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid Out</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{inr(data.summary.paidAmount)}</div>
                <p className="text-xs text-muted-foreground mt-1">Lifetime cleared payouts</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Platform Commission</CardTitle>
                <ReceiptText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{inr(data.summary.platformCommission)}</div>
                <p className="text-xs text-muted-foreground mt-1">12% of gross value</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
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
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        <IndianRupee className="mx-auto h-7 w-7 mb-2 opacity-40" />
                        No settlement periods found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.periods.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell>
                          <div className="font-medium">
                            {format(new Date(period.periodStart), "d MMM")} –{" "}
                            {format(new Date(period.periodEnd), "d MMM yyyy")}
                          </div>
                          {period.payoutDate ? (
                            <div className="text-xs text-green-600 mt-0.5">
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
                          <Badge variant="outline" className={statusStyle[period.status] ?? ""}>
                            {period.status.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
                          </Badge>
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
