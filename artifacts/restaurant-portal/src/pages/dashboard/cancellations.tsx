import { useAuth } from "@/lib/auth";
import {
  useGetRestaurantCancellations,
  getGetRestaurantCancellationsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingDown, XCircle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format } from "date-fns";
import { inr } from "@/lib/fmt";
import { useToast } from "@/hooks/use-toast";

const typeStyle: Record<string, string> = {
  late_cancellation: "bg-orange-50 text-orange-700 border-orange-200",
  no_show: "bg-red-50 text-red-700 border-red-200",
  free_cancellation: "bg-slate-50 text-slate-600 border-slate-200",
  restaurant_cancelled: "bg-blue-50 text-blue-700 border-blue-200",
};

const typeLabel: Record<string, string> = {
  late_cancellation: "Late Cancel",
  no_show: "No Show",
  free_cancellation: "Free Cancel",
  restaurant_cancelled: "Rest. Cancelled",
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

export default function Cancellations() {
  const { activeRestaurantId, token } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useGetRestaurantCancellations(
    activeRestaurantId!,
    { type: type === "all" ? undefined : (type as any) },
    {
      query: {
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantCancellationsQueryKey(activeRestaurantId!, {
          type: type === "all" ? undefined : (type as any),
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
      const today = new Date().toISOString().split("T")[0];
      downloadCsv(json.headers, json.rows, `cancellations-${today}.csv`);
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
          <h1 className="text-3xl font-bold tracking-tight">Cancellations</h1>
          <p className="text-muted-foreground mt-1">Deductions, no-shows and cancellation log (last 30 days).</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-[210px]">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
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
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Failed to load cancellations.</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Deduction Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  <span className="text-2xl font-bold text-destructive">
                    -{inr(data.summary.totalImpact)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Across all types</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Free Cancellations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{data.summary.freeCancellations}</div>
                <p className="text-xs text-muted-foreground mt-1">No cost to you</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Late Cancellations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{data.summary.lateCancellations}</div>
                <p className="text-xs text-muted-foreground mt-1">50% shared with platform</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">No Shows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{data.summary.noShows}</div>
                <p className="text-xs text-muted-foreground mt-1">Full payout preserved</p>
              </CardContent>
            </Card>
          </div>

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
                    <TableHead className="text-right">Restaurant Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        <XCircle className="mx-auto h-7 w-7 mb-2 opacity-40" />
                        No cancellations match your filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {format(new Date(item.mealDate), "d MMM yyyy")}
                        </TableCell>
                        <TableCell>{item.studentName}</TableCell>
                        <TableCell>
                          <div>{item.packageName}</div>
                          <div className="text-xs text-muted-foreground capitalize mt-0.5">{item.mealSlot}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={typeStyle[item.cancellationType] ?? ""}>
                            {typeLabel[item.cancellationType] ?? item.cancellationType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          {item.deductionAmount > 0 ? `-${inr(item.deductionAmount)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-700">
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
