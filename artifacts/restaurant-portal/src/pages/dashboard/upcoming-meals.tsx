import { useAuth } from "@/lib/auth";
import {
  useGetRestaurantUpcomingMeals,
  getGetRestaurantUpcomingMealsQueryKey,
  useUpdateMealOrderStatus,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar as CalendarIcon, CheckCircle2, Clock, UtensilsCrossed, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { inr } from "@/lib/fmt";

const statusStyle: Record<string, string> = {
  delivered: "bg-green-600 text-white",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  no_show: "bg-red-100 text-red-700 border-red-200",
  preparing: "bg-blue-100 text-blue-700 border-blue-200",
  scheduled: "bg-slate-100 text-slate-600 border-slate-200",
  locked: "bg-orange-100 text-orange-700 border-orange-200",
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

export default function UpcomingMeals() {
  const { activeRestaurantId, token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

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

  const updateStatus = useUpdateMealOrderStatus();

  const handleStatusUpdate = (
    orderId: string,
    newStatus: "accepted" | "preparing" | "ready" | "delivered" | "no_show",
  ) => {
    updateStatus.mutate(
      { restaurantId: activeRestaurantId!, orderId, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ description: `Order marked as ${newStatus.replace("_", " ")}` });
          queryClient.invalidateQueries({
            queryKey: getGetRestaurantUpcomingMealsQueryKey(activeRestaurantId!, { date }),
          });
        },
      },
    );
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
          <h1 className="text-3xl font-bold tracking-tight">Daily Prep</h1>
          <p className="text-muted-foreground mt-1">Kitchen locks, order count, and meal fulfillment.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-card border rounded-md p-1 shadow-sm">
            <CalendarIcon className="w-4 h-4 ml-2 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 w-[150px]"
            />
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
          <CardContent className="p-8 text-center text-muted-foreground">
            <UtensilsCrossed className="mx-auto h-8 w-8 mb-2 opacity-40" />
            No data available for this date.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                  Lunch Shift
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-4xl font-bold">{data.lunchLocked}</div>
                    <p className="text-sm text-muted-foreground">Locked for prep</p>
                  </div>
                  <div className="text-right space-y-1 text-sm text-muted-foreground">
                    <div>Total scheduled: <span className="font-semibold text-foreground">{data.lunchTotal}</span></div>
                    <div>Cancelled: <span className="font-semibold text-destructive">{data.lunchCancelled}</span></div>
                    <div>Delivered: <span className="font-semibold text-green-600">{data.lunchDelivered}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  Dinner Shift
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-4xl font-bold">{data.dinnerLocked}</div>
                    <p className="text-sm text-muted-foreground">Locked for prep</p>
                  </div>
                  <div className="text-right space-y-1 text-sm text-muted-foreground">
                    <div>Total scheduled: <span className="font-semibold text-foreground">{data.dinnerTotal}</span></div>
                    <div>Cancelled: <span className="font-semibold text-destructive">{data.dinnerCancelled}</span></div>
                    <div>Delivered: <span className="font-semibold text-green-600">{data.dinnerDelivered}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card">
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
                  {data.orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        <UtensilsCrossed className="mx-auto h-7 w-7 mb-2 opacity-40" />
                        No orders scheduled for this date.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-medium">{order.studentName}</div>
                          <div className="text-xs text-muted-foreground">{order.studentPhoneMasked}</div>
                        </TableCell>
                        <TableCell className="text-sm">{order.packageName}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              order.mealSlot === "lunch"
                                ? "text-orange-600 border-orange-200 bg-orange-50"
                                : "text-blue-600 border-blue-200 bg-blue-50"
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
                            {order.status.replace("_", " ")}
                          </Badge>
                          {order.isLocked &&
                            order.status !== "cancelled" &&
                            order.status !== "delivered" &&
                            order.status !== "no_show" && (
                              <div className="text-xs text-primary mt-1 font-medium flex items-center">
                                <Clock className="w-3 h-3 mr-1" /> Locked
                              </div>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.status !== "cancelled" &&
                          order.status !== "delivered" &&
                          order.status !== "no_show" ? (
                            <div className="flex justify-end gap-2">
                              {order.status === "scheduled" && order.isLocked && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusUpdate(order.id, "preparing")}
                                >
                                  Prep
                                </Button>
                              )}
                              {(order.status === "preparing" || order.status === "scheduled") &&
                                order.isLocked && (
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleStatusUpdate(order.id, "delivered")}
                                  >
                                    Delivered
                                  </Button>
                                )}
                              {order.status === "preparing" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleStatusUpdate(order.id, "no_show")}
                                >
                                  No Show
                                </Button>
                              )}
                            </div>
                          ) : order.status === "delivered" ? (
                            <span className="text-green-600 flex items-center justify-end text-sm font-medium">
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Done
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
      )}
    </div>
  );
}
